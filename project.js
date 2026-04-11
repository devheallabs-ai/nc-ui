'use strict';

const fs = require('fs');
const path = require('path');
const compiler = require('./compiler');

const WORKSPACE_MANIFEST = 'ncui-workspace.json';
const LOCKFILE_NAME = 'ncui-lock.json';

function createDocument() {
  return {
    type: 'Document',
    meta: {},
    components: [],
    routes: [],
    states: [],
    stores: [],
    computeds: [],
    guards: [],
    auth: null,
    lifecycle: { mount: [], server: [] },
    actions: [],
    imports: [],
    children: [],
    packageAssets: { styles: [], scripts: [] },
    sourceFiles: []
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePackageAssets(assets) {
  const next = { styles: [], scripts: [] };
  if (assets && Array.isArray(assets.styles)) next.styles = assets.styles.slice();
  if (assets && Array.isArray(assets.scripts)) next.scripts = assets.scripts.slice();
  return next;
}

function mergeUniqueStrings(values) {
  const seen = new Set();
  const merged = [];
  for (const value of values || []) {
    if (typeof value !== 'string') continue;
    if (seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }
  return merged;
}

function mergeDocuments(base, incoming) {
  const merged = createDocument();
  merged.meta = Object.assign({}, base.meta || {}, incoming.meta || {});
  merged.components = (base.components || []).concat(incoming.components || []);
  merged.routes = (base.routes || []).concat(incoming.routes || []);
  merged.states = (base.states || []).concat(incoming.states || []);
  merged.stores = (base.stores || []).concat(incoming.stores || []);
  merged.computeds = (base.computeds || []).concat(incoming.computeds || []);
  merged.guards = (base.guards || []).concat(incoming.guards || []);
  merged.lifecycle = {
    mount: ((base.lifecycle && base.lifecycle.mount) || []).concat(((incoming.lifecycle && incoming.lifecycle.mount) || [])),
    server: ((base.lifecycle && base.lifecycle.server) || []).concat(((incoming.lifecycle && incoming.lifecycle.server) || []))
  };
  merged.actions = (base.actions || []).concat(incoming.actions || []);
  merged.imports = (base.imports || []).concat(incoming.imports || []);
  merged.children = (base.children || []).concat(incoming.children || []);
  merged.auth = incoming.auth || base.auth || null;
  merged.packageAssets = {
    styles: mergeUniqueStrings([].concat(
      normalizePackageAssets(base.packageAssets).styles,
      normalizePackageAssets(incoming.packageAssets).styles
    )),
    scripts: mergeUniqueStrings([].concat(
      normalizePackageAssets(base.packageAssets).scripts,
      normalizePackageAssets(incoming.packageAssets).scripts
    ))
  };
  merged.sourceFiles = mergeUniqueStrings([].concat(base.sourceFiles || [], incoming.sourceFiles || []));
  return merged;
}

function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const packageDir = path.join(current, 'packages');
    if (fs.existsSync(packageDir) && fs.statSync(packageDir).isDirectory()) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function loadOfficialRegistry() {
  const registryPath = path.join(__dirname, 'packages', 'official-registry.json');
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function findOfficialPackage(id) {
  const registry = loadOfficialRegistry();
  return (registry.packages || []).find(entry => entry.id === id) || null;
}

function parsePackageSpecifier(specifier) {
  const value = String(specifier || '').trim();
  if (!value) throw new Error('NC UI package specifier is required.');
  if (value.startsWith('file:')) {
    const localPath = value.slice(5);
    return { type: 'local', id: path.basename(localPath), requested: null, source: localPath };
  }
  if (value.startsWith('.') || value.startsWith('/') || value.includes(path.sep)) {
    return { type: 'local', id: path.basename(value), requested: null, source: value };
  }
  const at = value.lastIndexOf('@');
  if (at > 0) {
    return { type: 'official', id: value.slice(0, at), requested: value.slice(at + 1), source: null };
  }
  return { type: 'official', id: value, requested: null, source: null };
}

function loadWorkspaceManifest(projectDir) {
  const manifestPath = path.join(projectDir, WORKSPACE_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    return {
      name: path.basename(projectDir),
      dependencies: {},
      integrations: {
        react: true,
        web_component: true
      }
    };
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function saveWorkspaceManifest(projectDir, manifest) {
  const manifestPath = path.join(projectDir, WORKSPACE_MANIFEST);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifestPath;
}

function loadLockfile(projectDir) {
  const lockPath = path.join(projectDir, LOCKFILE_NAME);
  if (!fs.existsSync(lockPath)) return { packages: {} };
  return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
}

function saveLockfile(projectDir, lock) {
  const lockPath = path.join(projectDir, LOCKFILE_NAME);
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  return lockPath;
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

function resolveOfficialPackageSource(id) {
  const registryEntry = findOfficialPackage(id);
  if (!registryEntry) {
    throw new Error(`NC UI official package not found: ${id}`);
  }
  const relativePath = registryEntry.path || path.join('catalog', id);
  const sourceDir = path.join(__dirname, 'packages', relativePath);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`NC UI official package source missing: ${sourceDir}`);
  }
  return { registryEntry, sourceDir };
}

function installPackage(projectDir, specifier, options) {
  const opts = options || {};
  const parsed = parsePackageSpecifier(specifier);
  const rootDir = path.resolve(projectDir);
  const packagesDir = path.join(rootDir, 'packages');
  fs.mkdirSync(packagesDir, { recursive: true });

  let packageName;
  let version;
  let source;
  let sourceDir;

  if (parsed.type === 'official') {
    const official = resolveOfficialPackageSource(parsed.id);
    packageName = official.registryEntry.id;
    version = parsed.requested || official.registryEntry.version;
    source = 'official';
    sourceDir = official.sourceDir;
  } else {
    sourceDir = path.resolve(rootDir, parsed.source);
    const manifestPath = path.join(sourceDir, 'ncui-package.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`NC UI local package manifest not found: ${manifestPath}`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    packageName = manifest.name;
    version = manifest.version || '0.1.0';
    source = 'local';
  }

  const destination = path.join(packagesDir, packageName);
  copyRecursive(sourceDir, destination);

  const workspace = loadWorkspaceManifest(rootDir);
  workspace.dependencies = workspace.dependencies || {};
  workspace.dependencies[packageName] = version;
  const manifestPath = saveWorkspaceManifest(rootDir, workspace);

  const lock = loadLockfile(rootDir);
  lock.packages = lock.packages || {};
  lock.packages[packageName] = {
    version,
    source,
    installedAt: new Date().toISOString(),
    path: path.relative(rootDir, destination) || `packages/${packageName}`
  };
  if (source === 'local') {
    lock.packages[packageName].linkedFrom = path.resolve(sourceDir);
  }
  const lockPath = saveLockfile(rootDir, lock);

  return {
    name: packageName,
    version,
    source,
    destination,
    manifestPath,
    lockPath
  };
}

function installWorkspace(projectDir, options) {
  const rootDir = path.resolve(projectDir);
  const workspace = loadWorkspaceManifest(rootDir);
  const results = [];
  for (const [name, version] of Object.entries(workspace.dependencies || {})) {
    if (typeof version === 'string' && version.startsWith('file:')) {
      results.push(installPackage(rootDir, version, options));
      continue;
    }
    results.push(installPackage(rootDir, `${name}@${version}`, options));
  }
  return results;
}

function resolvePackageEntry(basePath) {
  if (!fs.existsSync(basePath)) return null;

  if (fs.statSync(basePath).isFile()) {
    return {
      entry: basePath,
      packageDir: path.dirname(basePath),
      manifest: null
    };
  }

  const manifestPath = path.join(basePath, 'ncui-package.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  const mainFile = manifest && manifest.main ? manifest.main : 'index.ncui';
  const entry = path.join(basePath, mainFile);
  if (!fs.existsSync(entry)) {
    throw new Error(`NC UI package entry not found: ${entry}`);
  }

  return {
    entry,
    packageDir: basePath,
    manifest
  };
}

function resolveImportEntry(specifier, fromFile, options) {
  const fromDir = path.dirname(fromFile);
  const projectRoot = options.projectRoot || findProjectRoot(fromDir);
  const candidates = [];

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    candidates.push(path.resolve(fromDir, specifier));
  } else {
    candidates.push(path.join(fromDir, 'packages', specifier));
    candidates.push(path.join(projectRoot, 'packages', specifier));
    candidates.push(path.join(projectRoot, 'node_modules', specifier));
    candidates.push(path.join(__dirname, 'packages', specifier));
  }

  for (const candidate of candidates) {
    const variants = [candidate];
    if (!path.extname(candidate)) {
      variants.push(candidate + '.ncui');
    }
    for (const variant of variants) {
      if (!fs.existsSync(variant)) continue;
      return resolvePackageEntry(variant);
    }
  }

  throw new Error(`NC UI import could not be resolved: ${specifier} (from ${fromFile})`);
}

function loadPackageAssets(packageInfo) {
  const assets = { styles: [], scripts: [] };
  if (!packageInfo || !packageInfo.packageDir || !packageInfo.manifest) return assets;

  for (const file of packageInfo.manifest.styles || []) {
    const filePath = path.join(packageInfo.packageDir, file);
    if (fs.existsSync(filePath)) {
      assets.styles.push(fs.readFileSync(filePath, 'utf8'));
    }
  }

  for (const file of packageInfo.manifest.scripts || []) {
    const filePath = path.join(packageInfo.packageDir, file);
    if (fs.existsSync(filePath)) {
      assets.scripts.push(fs.readFileSync(filePath, 'utf8'));
    }
  }

  return assets;
}

function parseFileGraph(filePath, options, seen) {
  const resolved = path.resolve(filePath);
  const visitSet = seen || new Set();
  if (visitSet.has(resolved)) {
    return createDocument();
  }
  visitSet.add(resolved);

  const source = fs.readFileSync(resolved, 'utf8');
  const ast = compiler.parse(source);
  ast.sourceFiles = [resolved];
  ast.packageAssets = ast.packageAssets || { styles: [], scripts: [] };

  let merged = createDocument();
  const imports = ast.imports || [];
  for (const entry of imports) {
    const importFile = entry && entry.file ? entry.file : null;
    if (!importFile) continue;
    const packageInfo = resolveImportEntry(importFile, resolved, options);
    const importedAst = parseFileGraph(packageInfo.entry, options, visitSet);
    const packageAssets = loadPackageAssets(packageInfo);
    importedAst.packageAssets = {
      styles: mergeUniqueStrings([].concat(
        normalizePackageAssets(importedAst.packageAssets).styles,
        packageAssets.styles
      )),
      scripts: mergeUniqueStrings([].concat(
        normalizePackageAssets(importedAst.packageAssets).scripts,
        packageAssets.scripts
      ))
    };
    merged = mergeDocuments(merged, importedAst);
  }

  const localAst = clone(ast);
  merged = mergeDocuments(merged, localAst);
  return merged;
}

function parseFile(filePath, options) {
  const opts = Object.assign({ projectRoot: findProjectRoot(path.dirname(path.resolve(filePath))) }, options || {});
  return parseFileGraph(filePath, opts, new Set());
}

function compileFile(filePath, options) {
  const ast = parseFile(filePath, options);
  const generator = new compiler.CodeGenerator(ast, options || {});
  const artifacts = generator.buildArtifacts();
  return Object.assign({ ast }, artifacts);
}

function workspaceAliases(projectDir) {
  const rootDir = path.resolve(projectDir);
  const packagesDir = path.join(rootDir, 'packages');
  const aliases = {};
  if (!fs.existsSync(packagesDir) || !fs.statSync(packagesDir).isDirectory()) {
    return aliases;
  }

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageRoot = path.join(packagesDir, entry.name);
    let resolved;
    try {
      resolved = resolvePackageEntry(packageRoot);
    } catch (_) {
      continue;
    }
    const packageName = resolved.manifest && resolved.manifest.name ? resolved.manifest.name : entry.name;
    aliases[`@ncui/${packageName}`] = resolved.entry;
    aliases[`@ncui/${packageName}/package`] = resolved.packageDir;
  }
  return aliases;
}

module.exports = {
  createDocument,
  mergeDocuments,
  parseFile,
  compileFile,
  workspaceAliases,
  resolveImportEntry,
  loadWorkspaceManifest,
  saveWorkspaceManifest,
  loadLockfile,
  saveLockfile,
  installPackage,
  installWorkspace,
  parsePackageSpecifier,
  findOfficialPackage
};
