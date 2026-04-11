/**
 * test_cli.js — Test suite for the NC UI CLI.
 *
 * Verifies production build artifacts and deployment security manifests.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    testsFailed++;
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${err.message}`);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ncui-cli-'));
}

function runCli(args, cwd) {
  return execFileSync(process.execPath, ['nc-ui/cli.js'].concat(args), {
    cwd: cwd || repoRoot,
    encoding: 'utf8'
  });
}

function runCliWithEnv(args, extraEnv, cwd) {
  return execFileSync(process.execPath, ['nc-ui/cli.js'].concat(args), {
    cwd: cwd || repoRoot,
    encoding: 'utf8',
    env: Object.assign({}, process.env, extraEnv || {})
  });
}

section('Build Artifacts');

test('New scaffolds a starter template', function () {
  const dir = tempDir();
  const outPath = path.join(dir, 'customer-portal.ncui');
  runCli(['new', 'customer-portal', outPath]);
  const source = fs.readFileSync(outPath, 'utf8');
  assert.ok(source.includes('app "Customer Portal"'), 'Template source should be copied');
  assert.ok(source.includes('form action "/api/customer/login"'), 'Starter should include end-to-end app flows');
});

test('Packages lists official ecosystem packages', function () {
  const output = runCli(['packages']);
  assert.ok(output.includes('auth-kit'), 'Official package list should include auth-kit');
  assert.ok(output.includes('ops-dashboard'), 'Official package list should include ops-dashboard');
});

test('Package init scaffolds a package manifest', function () {
  const dir = tempDir();
  const outputDir = path.join(dir, 'ncui-auth');
  runCli(['package-init', 'ncui-auth', outputDir]);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'ncui-package.json'), 'utf8'));
  assert.strictEqual(manifest.name, 'ncui-auth');
  assert.ok(Array.isArray(manifest.exports), 'Package manifest should include exports');
  assert.ok(fs.existsSync(path.join(outputDir, 'index.ncui')), 'Package init should scaffold an entry file');
  assert.ok(fs.existsSync(path.join(outputDir, 'styles', 'package.css')), 'Package init should scaffold package styles');
  assert.ok(fs.existsSync(path.join(outputDir, 'scripts', 'package.js')), 'Package init should scaffold package scripts');
});

test('Package link copies a local package into a project packages directory', function () {
  const dir = tempDir();
  const sourceDir = path.join(dir, 'source-package');
  const projectDir = path.join(dir, 'portal');
  fs.mkdirSync(path.join(sourceDir, 'styles'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'ncui-package.json'), JSON.stringify({
    name: 'linked-kit',
    version: '0.1.0',
    main: 'index.ncui'
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(sourceDir, 'index.ncui'), 'component LinkedKit:\n  text "Linked"\n', 'utf8');

  runCli(['package-link', sourceDir, projectDir]);

  const workspace = JSON.parse(fs.readFileSync(path.join(projectDir, 'ncui-workspace.json'), 'utf8'));
  assert.ok(fs.existsSync(path.join(projectDir, 'packages', 'linked-kit', 'ncui-package.json')), 'Linked package manifest should exist in project');
  assert.ok(fs.existsSync(path.join(projectDir, 'packages', 'linked-kit', 'index.ncui')), 'Linked package entry should exist in project');
  assert.ok(String(workspace.dependencies['linked-kit']).startsWith('file:'), 'Linked packages should remain local in workspace manifest');
});

test('Package add installs an official package and writes workspace files', function () {
  const dir = tempDir();
  runCli(['package-add', 'auth-kit', dir]);

  const workspace = JSON.parse(fs.readFileSync(path.join(dir, 'ncui-workspace.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(dir, 'ncui-lock.json'), 'utf8'));

  assert.strictEqual(workspace.dependencies['auth-kit'], '0.1.0');
  assert.strictEqual(lock.packages['auth-kit'].source, 'official');
  assert.ok(fs.existsSync(path.join(dir, 'packages', 'auth-kit', 'index.ncui')), 'Official package should be installed into workspace');
});

test('Package install reinstalls dependencies from workspace manifest', function () {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'ncui-workspace.json'), JSON.stringify({
    name: 'portal',
    dependencies: {
      'data-table': '0.1.0'
    }
  }, null, 2) + '\n', 'utf8');

  runCli(['package-install', dir]);

  assert.ok(fs.existsSync(path.join(dir, 'packages', 'data-table', 'index.ncui')), 'Workspace dependency should be installed');
});

test('Build emits production security manifests', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  const outPath = path.join(dir, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Portal"\nsection hero:\n  text "Secure"\n', 'utf8');

  runCli(['build', srcPath, '--out', outPath]);

  const jsonPath = path.join(dir, 'dist', 'index.security-headers.json');
  const netlifyPath = path.join(dir, 'dist', '_headers');
  const swaPath = path.join(dir, 'dist', 'staticwebapp.config.json');
  const vercelPath = path.join(dir, 'dist', 'vercel.json');
  const jsPath = path.join(dir, 'dist', 'index.js');
  const cssPath = path.join(dir, 'dist', 'index.css');

  assert.ok(fs.existsSync(outPath), 'Compiled HTML should exist');
  assert.ok(fs.existsSync(jsPath), 'Release build should externalize runtime JS');
  assert.ok(fs.existsSync(cssPath), 'Release build should externalize CSS');
  assert.ok(fs.existsSync(jsonPath), 'JSON security manifest should exist');
  assert.ok(fs.existsSync(netlifyPath), 'Static host headers manifest should exist');
  assert.ok(fs.existsSync(swaPath), 'Azure Static Web Apps config should exist');
  assert.ok(fs.existsSync(vercelPath), 'Vercel config should exist');

  const html = fs.readFileSync(outPath, 'utf8');
  const headers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const netlify = fs.readFileSync(netlifyPath, 'utf8');
  const swa = JSON.parse(fs.readFileSync(swaPath, 'utf8'));
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  assert.ok(headers['Content-Security-Policy'], 'CSP should be present');
  assert.ok(headers['Strict-Transport-Security'], 'HSTS should be present for production artifacts');
  assert.ok(headers['Content-Security-Policy'].includes("script-src 'self'"), 'Release CSP should require self-hosted scripts');
  assert.ok(headers['Content-Security-Policy'].includes("style-src 'self'"), 'Release CSP should require self-hosted styles');
  assert.ok(headers['Content-Security-Policy'].includes("form-action 'self'"), 'Release CSP should keep form submissions same-origin by default');
  assert.ok(!headers['Content-Security-Policy'].includes("form-action 'self' https:"), 'Release CSP should not allow broad external form targets by default');
  assert.ok(!headers['Content-Security-Policy'].includes("'unsafe-inline'"), 'Release CSP should avoid unsafe-inline directives');
  assert.ok(!headers['Content-Security-Policy'].includes('fonts.googleapis.com'), 'Release CSP should avoid external font hosts by default');
  assert.ok(html.includes('<script src="./index.js" defer></script>'), 'HTML should reference external runtime JS');
  assert.ok(html.includes('<link rel="stylesheet" href="./index.css">'), 'HTML should reference external CSS');
  assert.ok(!html.includes('fonts.googleapis.com'), 'Release HTML should not depend on external Google fonts');
  assert.ok(netlify.includes('Content-Security-Policy:'), 'Static manifest should include CSP');
  assert.strictEqual(swa.globalHeaders['X-Frame-Options'], 'DENY');
  assert.ok(Array.isArray(vercel.headers), 'Vercel headers should be generated');
});

test('Release builds a full dist bundle in one command', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  fs.writeFileSync(srcPath, 'page "Portal"\nsection hero:\n  text "One command"\n', 'utf8');

  runCli(['release', srcPath]);

  const distDir = path.join(dir, 'dist');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'Release should emit dist/index.html by default');
  assert.ok(fs.existsSync(path.join(distDir, 'index.js')), 'Release should emit external runtime JS');
  assert.ok(fs.existsSync(path.join(distDir, 'index.css')), 'Release should emit external CSS');
  assert.ok(fs.existsSync(path.join(distDir, 'index.security-headers.json')), 'Release should emit security headers manifest');
});

test('Build emits SPA routing manifests when routes are present', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  const outPath = path.join(dir, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Portal"\nroutes:\n  "/admin" shows dashboard requires auth\ncomponent dashboard:\n  text "Admin"\n', 'utf8');

  runCli(['build', srcPath, '--out', outPath]);

  const manifestPath = path.join(dir, 'dist', 'routes-manifest.json');
  const redirectsPath = path.join(dir, 'dist', '_redirects');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const redirects = fs.readFileSync(redirectsPath, 'utf8');

  assert.ok(fs.existsSync(manifestPath), 'Routes manifest should exist');
  assert.ok(fs.existsSync(redirectsPath), 'Redirect manifest should exist');
  assert.strictEqual(manifest.routes[0].path, '/admin');
  assert.ok(redirects.includes('/* /index.html 200'), 'SPA fallback should be emitted');
});

test('Build emits SSR manifest and prerendered static route files', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  const outPath = path.join(dir, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Portal"\nroutes:\n  "/" shows home publicly\n  "/reports" shows reports publicly\ncomponent home:\n  text "Home"\ncomponent reports:\n  text "Reports"\n', 'utf8');

  runCli(['build', srcPath, '--out', outPath]);

  const ssrManifestPath = path.join(dir, 'dist', 'ssr-manifest.json');
  const prerenderedPath = path.join(dir, 'dist', 'reports', 'index.html');
  const manifest = JSON.parse(fs.readFileSync(ssrManifestPath, 'utf8'));

  assert.ok(fs.existsSync(ssrManifestPath), 'SSR manifest should be emitted');
  assert.ok(fs.existsSync(prerenderedPath), 'Static route HTML should be prerendered');
  assert.strictEqual(manifest.staticRoutes[0].path, '/reports');
  assert.ok(fs.readFileSync(prerenderedPath, 'utf8').includes('Reports'), 'Prerendered route should contain component content');
});

test('Build emits dynamic SSR hydration metadata for param routes', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  const outPath = path.join(dir, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Portal"\nroutes:\n  "/users/:id" shows userDetail publicly\ncomponent userDetail:\n  text "User {{id}}"\n', 'utf8');

  runCli(['build', srcPath, '--out', outPath]);

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'dist', 'ssr-manifest.json'), 'utf8'));
  const indexHtml = fs.readFileSync(outPath, 'utf8');

  assert.strictEqual(manifest.dynamicRoutes[0].path, '/users/:id');
  assert.ok(manifest.dynamicRoutes[0].routePattern.includes('(?<id>[^/]+)'), 'Dynamic route regex should be emitted');
  assert.ok(indexHtml.includes('<script id="ncui-ssr-data" type="application/json">null</script>'), 'SSR bootstrap payload hook should exist in HTML');
});

test('Build can skip security manifests explicitly', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'portal.ncui');
  const outPath = path.join(dir, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Portal"\nsection hero:\n  text "Secure"\n', 'utf8');

  runCli(['build', srcPath, '--out', outPath, '--no-security-artifacts']);

  assert.ok(fs.existsSync(outPath), 'Compiled HTML should exist');
  assert.ok(!fs.existsSync(path.join(dir, 'dist', 'index.security-headers.json')), 'JSON security manifest should be skipped');
  assert.ok(!fs.existsSync(path.join(dir, 'dist', '_headers')), 'Static host headers manifest should be skipped');
});

test('Build stays plain under NO_COLOR and NC_NO_ANIM', function () {
  const dir = tempDir();
  const srcPath = path.join(dir, 'plain.ncui');
  const outPath = path.join(dir, 'dist', 'plain.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(srcPath, 'page "Plain"\nsection hero:\n  text "No color"\n', 'utf8');

  const output = runCliWithEnv(['build', srcPath, '--out', outPath], {
    NO_COLOR: '1',
    NC_NO_ANIM: '1'
  });

  assert.ok(output.includes('NC UI Build'), 'Build header should still be printed');
  assert.ok(output.includes('Done.'), 'Build completion should still be printed');
  assert.ok(!/\x1b\[[0-9;]*m/.test(output), 'CLI output should not contain ANSI escapes');
  assert.ok(fs.existsSync(outPath), 'Build should still succeed in plain mode');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
