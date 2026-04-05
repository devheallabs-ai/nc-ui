#!/usr/bin/env node

/**
 * NC UI CLI v1.1.0
 * Command-line interface for building, watching, serving, and inspecting NC UI files.
 *
 * Usage:
 *   nc-ui build <file.ncui>           Compile to HTML
 *   nc-ui release <file.ncui>         Build a production-ready dist bundle
 *   nc-ui new <template> [dest]       Create a new NC UI app from a template
 *   nc-ui packages                    List official NC UI packages
 *   nc-ui package-init <name> [dest]  Create a new NC UI package manifest
 *   nc-ui package-link <dir> [dest]   Link a local NC UI package into a project
 *   nc-ui package-add <pkg> [dest]    Install an official/local NC UI package
 *   nc-ui package-install [dest]      Install packages from ncui-workspace.json
 *   nc-ui watch <file.ncui>           Watch and rebuild on change
 *   nc-ui serve <file.ncui> [port]    Serve with live reload
 *   nc-ui tokens <file.ncui>          Show lexer tokens
 *   nc-ui ast <file.ncui>             Show parsed AST as JSON
 *   nc-ui check <file.ncui>           Validate syntax without generating output
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./compiler');
const project = require('./project');
const security = require('./security');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function usage() {
  console.log(`
  NC UI Compiler CLI v2.0.0

  Usage:
    nc-ui build <file.ncui>           Compile .ncui to .html
    nc-ui release <file.ncui>         Build .ncui to dist/index.html + deploy artifacts
    nc-ui new <template> [dest]       Create a starter app from a template
    nc-ui packages                    List official NC UI packages
    nc-ui package-init <name> [dest]  Create a starter NC UI package manifest
    nc-ui package-link <dir> [dest]   Link a local NC UI package into a project
    nc-ui package-add <pkg> [dest]    Install a package into a project workspace
    nc-ui package-install [dest]      Install all workspace dependencies
    nc-ui watch <file.ncui>           Watch for changes and rebuild
    nc-ui serve <file.ncui> [port]    Serve with live reload (default port: 3000)
    nc-ui tokens <file.ncui>          Show lexer tokens (for debugging)
    nc-ui ast <file.ncui>             Show parsed AST as JSON
    nc-ui check <file.ncui>           Validate syntax without output

  Options:
    --out <path>                      Specify output file path
    --minify                          Minify HTML output
    --no-runtime                      Omit runtime JS (static only)
    --no-security-artifacts           Skip deployment header manifests

  Examples:
    node cli.js new enterprise-admin apps/admin.ncui
    node cli.js packages
    node cli.js package-init ncui-auth packages/ncui-auth
    node cli.js package-link ../shared/ncui-auth apps/portal
    node cli.js package-add auth-kit apps/portal
    node cli.js package-install apps/portal
    node cli.js build portfolio.ncui
    node cli.js build landing.ncui --out dist/index.html
    node cli.js release landing.ncui
    node cli.js watch landing.ncui
    node cli.js serve dashboard.ncui 8080
    node cli.js ast portfolio.ncui
    node cli.js check myfile.ncui
`);
}

function resolveFile(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`  Error: File not found: ${abs}`);
    process.exit(1);
  }
  return abs;
}

function loadTemplateManifest() {
  const manifestPath = path.join(__dirname, 'templates', 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function listTemplates() {
  const manifest = loadTemplateManifest();
  return manifest.templates || [];
}

function listPackages() {
  const manifestPath = path.join(__dirname, 'packages', 'official-registry.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).packages || [];
}

function outPath(inputPath, customOut) {
  if (customOut) return path.resolve(customOut);
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, base + '.html');
}

function createBuildProfile(opts) {
  const options = opts || {};
  const isDev = !!options.dev;
  const isRelease = options.release !== undefined ? !!options.release : !isDev;
  return {
    dev: isDev,
    release: isRelease,
    externalizeScripts: isRelease && !options.noRuntime,
    externalizeStyles: isRelease,
    includeExternalFonts: !isRelease,
    noRuntime: !!options.noRuntime,
  };
}

function createSecurityHeaderSet(opts) {
  if (opts && opts.securityHeaders) return opts.securityHeaders;
  const profile = createBuildProfile(opts);
  const isDev = profile.dev;
  const csp = security.csp.generate({
    defaultSrc: ["'self'"],
    scriptSrc: profile.externalizeScripts ? ["'self'"] : ["'self'", "'unsafe-inline'"],
    styleSrc: profile.includeExternalFonts ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] : ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: profile.includeExternalFonts ? ["'self'", 'https://fonts.gstatic.com', 'data:'] : ["'self'", 'data:'],
    connectSrc: isDev ? ["'self'", 'https:', 'http://localhost:*', 'http://127.0.0.1:*'] : ["'self'", 'https:'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  });
  const headers = security.headers.generate({
    csp,
    hstsMaxAge: isDev ? 0 : 31536000,
  });
  if (isDev) {
    delete headers['Strict-Transport-Security'];
  }
  return headers;
}

function createStaticHeadersManifest(headers, mountPath) {
  const route = mountPath || '/*';
  const lines = [route];
  for (const [name, value] of Object.entries(headers)) {
    lines.push(`  ${name}: ${value}`);
  }
  lines.push('');
  return lines.join('\n');
}

function writeSecurityArtifacts(outputHtmlPath, opts) {
  opts = opts || {};
  if (opts.noSecurityArtifacts) return null;

  const outDir = path.dirname(outputHtmlPath);
  const base = path.basename(outputHtmlPath, path.extname(outputHtmlPath));
  const headers = createSecurityHeaderSet(opts);
  const manifest = createStaticHeadersManifest(headers, '/*');

  const jsonPath = path.join(outDir, base + '.security-headers.json');
  const netlifyPath = path.join(outDir, '_headers');
  const staticWebAppPath = path.join(outDir, 'staticwebapp.config.json');
  const vercelPath = path.join(outDir, 'vercel.json');

  fs.writeFileSync(jsonPath, JSON.stringify(headers, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(netlifyPath, manifest, 'utf-8');
  fs.writeFileSync(staticWebAppPath, JSON.stringify({
    globalHeaders: headers,
    navigationFallback: {
      rewrite: '/' + path.basename(outputHtmlPath),
      exclude: ['/assets/*', '/*.css', '/*.js', '/*.png', '/*.jpg', '/*.svg', '/*.woff', '/*.woff2']
    }
  }, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(vercelPath, JSON.stringify({
    cleanUrls: true,
    headers: [{
      source: '/(.*)',
      headers: Object.entries(headers).map(([key, value]) => ({ key, value }))
    }]
  }, null, 2) + '\n', 'utf-8');

  return { headers, jsonPath, netlifyPath, staticWebAppPath, vercelPath };
}

function writeRoutingArtifacts(outputHtmlPath, ast, opts) {
  opts = opts || {};
  if (opts.noSecurityArtifacts || !ast || !Array.isArray(ast.routes) || ast.routes.length === 0) {
    return null;
  }

  const outDir = path.dirname(outputHtmlPath);
  const htmlName = '/' + path.basename(outputHtmlPath);
  const routes = ast.routes.map(route => ({
    path: route.path,
    component: route.component,
    public: !!route.public,
    requireAuth: !!route.requireAuth,
    requireRole: route.requireRole || null,
    guard: route.guard || null,
    redirect: route.redirect || null
  }));

  const manifestPath = path.join(outDir, 'routes-manifest.json');
  const redirectsPath = path.join(outDir, '_redirects');
  const vercelPath = path.join(outDir, 'vercel.json');

  fs.writeFileSync(manifestPath, JSON.stringify({ routes }, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(redirectsPath, `/* ${htmlName} 200\n`, 'utf-8');
  fs.writeFileSync(vercelPath, JSON.stringify({
    cleanUrls: true,
    rewrites: [{ source: '/(.*)', destination: htmlName }],
    headers: [{
      source: '/(.*)',
      headers: Object.entries(createSecurityHeaderSet(opts)).map(([key, value]) => ({
        key,
        value
      }))
    }]
  }, null, 2) + '\n', 'utf-8');

  return { manifestPath, redirectsPath, vercelPath };
}

function writeSSRArtifacts(outputHtmlPath, buildResult, opts) {
  opts = opts || {};
  if (opts.noSecurityArtifacts || !buildResult || !buildResult.ssrManifest) {
    return null;
  }

  const outDir = path.dirname(outputHtmlPath);
  const manifestPath = path.join(outDir, 'ssr-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(buildResult.ssrManifest, null, 2) + '\n', 'utf8');

  for (const route of buildResult.prerenderedRoutes || []) {
    const filePath = path.join(outDir, route.outputPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, route.html, 'utf8');
  }

  return {
    manifestPath,
    count: (buildResult.prerenderedRoutes || []).length
  };
}

function buildFile(inputPath, opts) {
  opts = opts || {};
  const startTime = Date.now();
  const output = outPath(inputPath, opts.out);
  const base = path.basename(output, path.extname(output));
  const securityHeaders = createSecurityHeaderSet(opts);
  const compileOpts = Object.assign({}, opts, createBuildProfile(opts), {
    securityHeaders,
    assetBaseName: base
  });
  let buildResult;
  try {
    buildResult = project.compileFile(inputPath, compileOpts);
  } catch (e) {
    console.error(`  Compile Error: ${e.message}`);
    if (e.stack && opts.verbose) console.error(e.stack);
    return null;
  }
  const elapsed = Date.now() - startTime;
  const ast = buildResult.ast;
  const html = buildResult.html;

  // Ensure output directory exists
  const outDir = path.dirname(output);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(output, html, 'utf-8');
  if (buildResult.assets && typeof buildResult.assets.css === 'string' && buildResult.assets.css) {
    fs.writeFileSync(path.join(outDir, base + '.css'), buildResult.assets.css, 'utf-8');
  }
  if (buildResult.assets && typeof buildResult.assets.js === 'string' && buildResult.assets.js) {
    fs.writeFileSync(path.join(outDir, base + '.js'), buildResult.assets.js, 'utf-8');
  }
  const securityArtifacts = writeSecurityArtifacts(output, Object.assign({}, opts, { securityHeaders }));
  const routingArtifacts = writeRoutingArtifacts(output, ast, Object.assign({}, opts, { securityHeaders }));
  const ssrArtifacts = writeSSRArtifacts(output, buildResult, opts);
  const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`  Built: ${path.basename(output)} (${sizeKB} KB, ${elapsed}ms)`);
  if (securityArtifacts) {
    console.log(`  Security: ${path.basename(securityArtifacts.jsonPath)}, ${path.basename(securityArtifacts.netlifyPath)}, ${path.basename(securityArtifacts.staticWebAppPath)}, ${path.basename(securityArtifacts.vercelPath)}`);
  }
  if (routingArtifacts) {
    console.log(`  Routing: ${path.basename(routingArtifacts.manifestPath)}, ${path.basename(routingArtifacts.redirectsPath)}, ${path.basename(routingArtifacts.vercelPath)}`);
  }
  if (ssrArtifacts && ssrArtifacts.count) {
    console.log(`  SSR: ${path.basename(ssrArtifacts.manifestPath)} + ${ssrArtifacts.count} prerendered route file(s)`);
  }
  return { output, html, securityArtifacts, routingArtifacts, ssrArtifacts, buildResult };
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ─── Commands ────────────────────────────────────────────────────────────────

function cmdBuild(file, opts) {
  const inputPath = resolveFile(file);
  console.log(`\n  NC UI Build`);
  console.log(`  Input:  ${path.basename(inputPath)}`);
  const result = buildFile(inputPath, opts);
  if (result) {
    console.log(`  Output: ${result.output}`);
    console.log(`  Done.\n`);
  } else {
    process.exit(1);
  }
}

function cmdRelease(file, opts) {
  const inputPath = resolveFile(file);
  const releaseOpts = Object.assign({}, opts, {
    release: true,
    dev: false,
    out: opts && opts.out ? opts.out : path.join(path.dirname(inputPath), 'dist', 'index.html')
  });
  console.log(`\n  NC UI Release`);
  console.log(`  Input:  ${path.basename(inputPath)}`);
  const result = buildFile(inputPath, releaseOpts);
  if (result) {
    console.log(`  Output: ${result.output}`);
    console.log(`  Done.\n`);
  } else {
    process.exit(1);
  }
}

function cmdNew(templateId, destination) {
  const templates = listTemplates();
  const template = templates.find(entry => entry.id === templateId);
  if (!template) {
    console.error(`  Unknown template: ${templateId}`);
    console.error('  Available templates:');
    templates.forEach(entry => {
      console.error(`    - ${entry.id}: ${entry.description}`);
    });
    process.exit(1);
  }

  const sourcePath = path.join(__dirname, 'templates', template.file);
  const outputPath = path.resolve(destination || `${template.id}.ncui`);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.copyFileSync(sourcePath, outputPath);
  console.log(`\n  NC UI Starter`);
  console.log(`  Template: ${template.name}`);
  console.log(`  Output:   ${outputPath}`);
  console.log(`  Done.\n`);
}

function cmdPackages() {
  const packages = listPackages();
  console.log(`\n  NC UI Packages\n`);
  packages.forEach(entry => {
    console.log(`  - ${entry.id} (${entry.version})`);
    console.log(`    ${entry.description}`);
    if (entry.integrations && entry.integrations.length) {
      console.log(`    integrations: ${entry.integrations.join(', ')}`);
    }
  });
  console.log('');
}

function cmdPackageInit(name, destination) {
  if (!name) {
    console.error('  package-init requires a package name.');
    process.exit(1);
  }
  const templatePath = path.join(__dirname, 'packages', 'package-template.json');
  const outputDir = path.resolve(destination || name);
  const outputPath = path.join(outputDir, 'ncui-package.json');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  template.name = name;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputDir, 'index.ncui'), `component ${name.replace(/[^a-zA-Z0-9_]/g, '_')}Banner:\n  text "${name} package is ready"\n`, 'utf8');
  fs.mkdirSync(path.join(outputDir, 'styles'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'styles', 'package.css'), `:root { --${name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}-ready: true; }\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'scripts', 'package.js'), `window.NCUIPackages = window.NCUIPackages || {};\nwindow.NCUIPackages[${JSON.stringify(name)}] = { ready: true };\n`, 'utf8');
  console.log(`\n  NC UI Package Init`);
  console.log(`  Package: ${name}`);
  console.log(`  Output:  ${outputPath}`);
  console.log(`  Done.\n`);
}

function copyRecursive(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const fromPath = path.join(sourceDir, entry.name);
    const toPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

function cmdPackageLink(sourceDir, destination) {
  if (!sourceDir) {
    console.error('  package-link requires a source directory.');
    process.exit(1);
  }
  const resolvedSource = path.resolve(sourceDir);
  const manifestPath = path.join(resolvedSource, 'ncui-package.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`  NC UI package manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const projectDir = path.resolve(destination || process.cwd());
  const packageDir = path.join(projectDir, 'packages', manifest.name);
  copyRecursive(resolvedSource, packageDir);
  const workspace = project.loadWorkspaceManifest(projectDir);
  workspace.dependencies = workspace.dependencies || {};
  workspace.dependencies[manifest.name] = `file:${resolvedSource}`;
  project.saveWorkspaceManifest(projectDir, workspace);
  const lock = project.loadLockfile(projectDir);
  lock.packages = lock.packages || {};
  lock.packages[manifest.name] = {
    version: manifest.version || '0.1.0',
    source: 'local',
    linkedFrom: resolvedSource,
    path: path.relative(projectDir, packageDir)
  };
  project.saveLockfile(projectDir, lock);
  console.log(`\n  NC UI Package Link`);
  console.log(`  Package: ${manifest.name}`);
  console.log(`  Output:  ${packageDir}`);
  console.log(`  Done.\n`);
}

function cmdPackageAdd(specifier, destination) {
  if (!specifier) {
    console.error('  package-add requires a package specifier.');
    process.exit(1);
  }
  const projectDir = path.resolve(destination || process.cwd());
  const result = project.installPackage(projectDir, specifier);
  console.log(`\n  NC UI Package Add`);
  console.log(`  Package: ${result.name}@${result.version}`);
  console.log(`  Source:  ${result.source}`);
  console.log(`  Output:  ${result.destination}`);
  console.log(`  Manifest:${result.manifestPath}`);
  console.log(`  Lock:    ${result.lockPath}`);
  console.log(`  Done.\n`);
}

function cmdPackageInstall(destination) {
  const projectDir = path.resolve(destination || process.cwd());
  const results = project.installWorkspace(projectDir);
  console.log(`\n  NC UI Package Install`);
  console.log(`  Workspace: ${projectDir}`);
  if (!results.length) {
    console.log('  No dependencies to install.\n');
    return;
  }
  results.forEach(result => {
    console.log(`  - ${result.name}@${result.version} (${result.source}) -> ${result.destination}`);
  });
  console.log(`  Done.\n`);
}

function cmdWatch(file, opts) {
  const inputPath = resolveFile(file);
  console.log(`\n  NC UI Watch`);
  console.log(`  Watching: ${path.basename(inputPath)}`);
  console.log(`  Press Ctrl+C to stop.\n`);

  // Initial build
  buildFile(inputPath, opts);

  let debounce = null;
  fs.watch(inputPath, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        console.log(`  [${timestamp()}] Rebuilding...`);
        buildFile(inputPath, opts);
      } catch (e) {
        console.error(`  [${timestamp()}] Error: ${e.message}`);
      }
    }, 150);
  });
}

function cmdServe(file, port, opts) {
  port = parseInt(port) || 3000;
  const inputPath = resolveFile(file);
  const http = require('http');
  opts = Object.assign({}, opts, { dev: true, release: false });
  const responseHeaders = createSecurityHeaderSet(opts);

  console.log(`\n  NC UI Dev Server`);
  console.log(`  Serving: ${path.basename(inputPath)}`);
  console.log(`  URL:     http://localhost:${port}`);
  console.log(`  Press Ctrl+C to stop.\n`);

  const clients = new Set();
  let result = buildFile(inputPath, opts);
  let html = result ? result.html : '<p>Build failed</p>';
  let prerenderedRoutes = result && result.buildResult ? result.buildResult.prerenderedRoutes || [] : [];

  let debounce = null;
  fs.watch(inputPath, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        console.log(`  [${timestamp()}] Rebuilding...`);
        const rebuilt = project.compileFile(inputPath, Object.assign({}, opts, createBuildProfile(opts), {
          securityHeaders: createSecurityHeaderSet(opts),
          assetBaseName: path.basename(outPath(inputPath, opts && opts.out), path.extname(outPath(inputPath, opts && opts.out)))
        }));
        html = rebuilt.html;
        prerenderedRoutes = rebuilt.prerenderedRoutes || [];
        const output = outPath(inputPath, opts && opts.out);
        fs.writeFileSync(output, html, 'utf-8');
        const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
        console.log(`  [${timestamp()}] Built (${sizeKB} KB). Reloading browsers...`);
        clients.forEach(res => { res.write('data: reload\n\n'); });
      } catch (e) {
        console.error(`  [${timestamp()}] Error: ${e.message}`);
      }
    }, 150);
  });

  function injectLiveReload(rawHtml) {
    const script = `
<script>
(function(){
  var es = new EventSource('/__ncui_reload');
  es.onmessage = function(e){ if(e.data==='reload') location.reload(); };
  es.onerror = function(){ setTimeout(function(){ location.reload(); }, 2000); };
})();
</script>`;
    return rawHtml.replace('</body>', script + '\n</body>');
  }

  const server = http.createServer((req, res) => {
    const requestPath = (req.url || '/').split('?')[0];

    if (req.url === '/__ncui_reload') {
      res.writeHead(200, {
        ...responseHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('data: connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // For SPA routing, serve index for any non-file path
    if (req.url === '/' || req.url === '/index.html' || !path.extname(req.url)) {
      const prerendered = prerenderedRoutes.find(route => requestPath === route.path || requestPath === route.path + '/');
      const served = injectLiveReload(prerendered ? prerendered.html : html);
      res.writeHead(200, {
        ...responseHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(served);
      return;
    }

    // Serve runtime.js
    if (req.url === '/runtime.js' || req.url === '/nc-ui/runtime.js') {
      const runtimePath = path.join(__dirname, 'runtime.js');
      if (fs.existsSync(runtimePath)) {
        res.writeHead(200, {
          ...responseHeaders,
          'Content-Type': 'application/javascript'
        });
        fs.createReadStream(runtimePath).pipe(res);
        return;
      }
    }

    // Serve static files from source directory
    const filePath = path.join(path.dirname(inputPath), req.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
        '.ttf': 'font/ttf', '.webp': 'image/webp', '.mp4': 'video/mp4',
      };
      res.writeHead(200, {
        ...responseHeaders,
        'Content-Type': mimeTypes[ext] || 'application/octet-stream'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, {
      ...responseHeaders,
      'Content-Type': 'text/plain'
    });
    res.end('404 Not Found');
  });

  server.listen(port);
}

function cmdTokens(file) {
  const inputPath = resolveFile(file);
  const source = fs.readFileSync(inputPath, 'utf-8');
  console.log(`\n  NC UI Lexer Output`);
  console.log(`  File: ${path.basename(inputPath)}\n`);

  try {
    const tokens = tokenize(source);
    let count = 0;
    for (const t of tokens) {
      if (t.type === 'NEWLINE') continue;
      const loc = `L${String(t.line).padStart(3)}`;
      const type = t.type.padEnd(12);
      console.log(`  ${loc}  ${type}  ${JSON.stringify(t.value)}`);
      count++;
    }
    console.log(`\n  Total: ${count} tokens\n`);
  } catch (e) {
    console.error(`  Lexer Error: ${e.message}\n`);
    process.exit(1);
  }
}

function cmdAST(file) {
  const inputPath = resolveFile(file);
  console.log(`\n  NC UI AST Output`);
  console.log(`  File: ${path.basename(inputPath)}\n`);

  try {
    const ast = project.parseFile(inputPath);
    console.log(JSON.stringify(ast, null, 2));
    console.log();
  } catch (e) {
    console.error(`  Parse Error: ${e.message}\n`);
    process.exit(1);
  }
}

function cmdCheck(file) {
  const inputPath = resolveFile(file);
  console.log(`\n  NC UI Syntax Check`);
  console.log(`  File: ${path.basename(inputPath)}`);

  try {
    const ast = project.parseFile(inputPath);
    const sections = (ast.children || []).filter(c => c.type === 'Section').length;
    const components = (ast.components || []).length;
    const states = (ast.states || []).length;
    const routes = (ast.routes || []).length;
    const actions = (ast.actions || []).length;

    console.log(`  Status: Valid`);
    console.log(`  Title:  ${ast.meta.title || '(none)'}`);
    console.log(`  Theme:  ${ast.meta.theme || 'dark'}`);
    console.log(`  Sections:   ${sections}`);
    if (components) console.log(`  Components: ${components}`);
    if (states) console.log(`  States:     ${states}`);
    if (routes) console.log(`  Routes:     ${routes}`);
    if (actions) console.log(`  Actions:    ${actions}`);
    console.log(`  Done.\n`);
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    process.exit(1);
  }
}

// ─── Argument Parsing ────────────────────────────────────────────────────────

function parseArgs(rawArgs) {
  const opts = {};
  const positional = [];
  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    if (arg === '--out' && i + 1 < rawArgs.length) {
      opts.out = rawArgs[++i];
    } else if (arg === '--minify') {
      opts.minify = true;
    } else if (arg === '--release') {
      opts.release = true;
    } else if (arg === '--dev') {
      opts.dev = true;
      opts.release = false;
    } else if (arg === '--no-runtime') {
      opts.noRuntime = true;
    } else if (arg === '--no-security-artifacts') {
      opts.noSecurityArtifacts = true;
    } else if (arg === '--verbose' || arg === '-v') {
      opts.verbose = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
    i++;
  }
  return { positional, opts };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const { positional, opts } = parseArgs(process.argv.slice(2));
const command = positional[0];
const file = positional[1];
  const fileOptionalCommands = new Set(['help', '--help', '-h', 'packages', 'package-install']);

if (!command || (!file && !fileOptionalCommands.has(command))) {
  usage();
  process.exit(command ? 1 : 0);
}

switch (command) {
  case 'packages':
    cmdPackages();
    break;
  case 'package-init':
    cmdPackageInit(file, positional[2]);
    break;
  case 'package-link':
    cmdPackageLink(file, positional[2]);
    break;
  case 'package-add':
    cmdPackageAdd(file, positional[2]);
    break;
  case 'package-install':
    cmdPackageInstall(file);
    break;
  case 'new':
    cmdNew(file, positional[2]);
    break;
  case 'build':
    cmdBuild(file, opts);
    break;
  case 'release':
    cmdRelease(file, opts);
    break;
  case 'watch':
    cmdWatch(file, opts);
    break;
  case 'serve':
    cmdServe(file, positional[2], opts);
    break;
  case 'tokens':
    cmdTokens(file);
    break;
  case 'ast':
    cmdAST(file);
    break;
  case 'check':
    cmdCheck(file);
    break;
  case 'help':
  case '--help':
  case '-h':
    usage();
    break;
  default:
    console.error(`  Unknown command: ${command}`);
    usage();
    process.exit(1);
}
