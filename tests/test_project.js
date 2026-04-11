'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const project = require('../project');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ncui-project-'));
}

section('Project Graph');

test('compileFile resolves local package imports, plugin assets, and prerendered routes', function () {
  const dir = tempDir();
  const pkgDir = path.join(dir, 'packages', 'shared-kit');
  fs.mkdirSync(path.join(pkgDir, 'styles'), { recursive: true });
  fs.mkdirSync(path.join(pkgDir, 'scripts'), { recursive: true });

  fs.writeFileSync(path.join(pkgDir, 'ncui-package.json'), JSON.stringify({
    name: 'shared-kit',
    version: '0.1.0',
    main: 'index.ncui',
    styles: ['styles/package.css'],
    scripts: ['scripts/package.js']
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(pkgDir, 'index.ncui'), 'component SharedBanner:\n  text "Shared banner"\n', 'utf8');
  fs.writeFileSync(path.join(pkgDir, 'styles', 'package.css'), '.shared-kit-ready{display:block}\n', 'utf8');
  fs.writeFileSync(path.join(pkgDir, 'scripts', 'package.js'), 'window.SharedKitReady=true;\n', 'utf8');

  const appPath = path.join(dir, 'portal.ncui');
  fs.writeFileSync(appPath, [
    'import "./packages/shared-kit"',
    'page "Portal"',
    'routes:',
    '  "/" shows dashboard publicly',
    '  "/about" shows aboutPage publicly',
    'component dashboard:',
    '  use SharedBanner',
    'component aboutPage:',
    '  text "About route"',
    'section hero:',
    '  text "Portal home"'
  ].join('\n') + '\n', 'utf8');

  const result = project.compileFile(appPath);

  assert.ok(result.html.includes('Shared banner'), 'Imported package component should render in root route SSR');
  assert.ok(result.html.includes('window.SharedKitReady=true;'), 'Imported package script should be inlined');
  assert.ok(result.html.includes('.shared-kit-ready{display:block}'), 'Imported package style should be inlined');
  assert.ok(Array.isArray(result.prerenderedRoutes), 'Prerendered routes should be returned');
  assert.strictEqual(result.prerenderedRoutes[0].path, '/about');
  assert.ok(result.prerenderedRoutes[0].html.includes('About route'), 'Static route HTML should be prerendered');
});

test('installPackage writes workspace manifest and lockfile for official packages', function () {
  const dir = tempDir();
  const result = project.installPackage(dir, 'auth-kit');
  const workspace = project.loadWorkspaceManifest(dir);
  const lock = project.loadLockfile(dir);

  assert.strictEqual(result.name, 'auth-kit');
  assert.strictEqual(workspace.dependencies['auth-kit'], '0.1.0');
  assert.strictEqual(lock.packages['auth-kit'].source, 'official');
  assert.ok(fs.existsSync(path.join(dir, 'packages', 'auth-kit', 'index.ncui')), 'Installed official package should be copied into workspace');
});

test('compileFile exposes dynamic route hydration metadata and interop runtime hooks', function () {
  const dir = tempDir();
  const appPath = path.join(dir, 'portal.ncui');
  fs.writeFileSync(appPath, [
    'page "Portal"',
    'on server load:',
    '  fetch "/api/users/{{id}}" save as user',
    'routes:',
    '  "/users/:id" shows userDetail publicly',
    'component userDetail:',
    '  text "User {{id}}"',
    'section hero:',
    '  text "Portal home"'
  ].join('\n') + '\n', 'utf8');

  const result = project.compileFile(appPath);

  assert.strictEqual(result.ssrManifest.dynamicRoutes[0].path, '/users/:id');
  assert.ok(result.ssrManifest.dynamicRoutes[0].routePattern.includes('(?<id>[^/]+)'), 'Dynamic route regex should be emitted for SSR');
  assert.ok(result.ssrManifest.dynamicRoutes[0].templateHtml.includes('User'), 'Dynamic route template HTML should be present');
  assert.strictEqual(result.ssrManifest.serverLoad[0].url, '/api/users/{{id}}');
  assert.strictEqual(result.ssrManifest.serverLoad[0].saveAs, 'user');
  assert.ok(result.html.includes('window.NCUIInterop'), 'Interop runtime should be exposed');
  assert.ok(result.html.includes("customElements.define('ncui-route'"), 'Custom element interop should be emitted');
});

test('workspaceAliases exposes installed package entry points for host toolchains', function () {
  const dir = tempDir();
  const pkgDir = path.join(dir, 'packages', 'state-kit');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'ncui-package.json'), JSON.stringify({
    name: 'state-kit',
    version: '0.1.0',
    main: 'index.ncui'
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(pkgDir, 'index.ncui'), 'component StateBanner:\n  text "State"\n', 'utf8');

  const aliases = project.workspaceAliases(dir);
  assert.strictEqual(typeof aliases['@ncui/state-kit'], 'string');
  assert.ok(aliases['@ncui/state-kit'].endsWith(path.join('packages', 'state-kit', 'index.ncui')));
  assert.ok(aliases['@ncui/state-kit/package'].endsWith(path.join('packages', 'state-kit')));
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
