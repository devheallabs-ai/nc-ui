'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const reactAdapter = require('../adapters/react');
const hostAdapter = require('../adapters/framework-host');
const nextAdapter = require('../adapters/next');
const viteAdapter = require('../adapters/vite');

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

test('React adapter exports component and route factories', function () {
  assert.strictEqual(typeof reactAdapter.createNCUIComponent, 'function');
  assert.strictEqual(typeof reactAdapter.createNCUIRoute, 'function');
  assert.strictEqual(typeof reactAdapter.mountWithInterop, 'function');
});

test('Framework host adapter exports mount helpers', function () {
  assert.strictEqual(typeof hostAdapter.mountComponent, 'function');
  assert.strictEqual(typeof hostAdapter.mountRoute, 'function');
  assert.strictEqual(typeof hostAdapter.snapshot, 'function');
});

test('Next adapter exports client and SSR helpers', function () {
  assert.strictEqual(typeof nextAdapter.createNextNCUIClient, 'function');
  assert.strictEqual(typeof nextAdapter.createNextNCUIRoute, 'function');
  assert.strictEqual(typeof nextAdapter.createSSRBootstrap, 'function');
  assert.strictEqual(typeof nextAdapter.createNextDocumentProps, 'function');
  assert.strictEqual(typeof nextAdapter.createNextNCUIConfig, 'function');
});

test('Vite adapter exports plugin and mount helpers', function () {
  assert.strictEqual(typeof viteAdapter.createNCUIVitePlugin, 'function');
  assert.strictEqual(typeof viteAdapter.createViteNCUIConfig, 'function');
  assert.strictEqual(typeof viteAdapter.mountViteComponent, 'function');
  assert.strictEqual(typeof viteAdapter.mountViteRoute, 'function');
});

test('Next adapter injects workspace aliases into config', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ncui-next-'));
  const pkgDir = path.join(dir, 'packages', 'chart-kit');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'ncui-package.json'), JSON.stringify({
    name: 'chart-kit',
    version: '0.1.0',
    main: 'index.ncui'
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(pkgDir, 'index.ncui'), 'component ChartCard:\n  text "Chart"\n', 'utf8');

  const config = nextAdapter.createNextNCUIConfig({}, { projectDir: dir });
  const webpackConfig = config.webpack({ resolve: { alias: {} } }, {});

  assert.strictEqual(typeof webpackConfig.resolve.alias['@ncui/chart-kit'], 'string');
  assert.strictEqual(typeof config.headers, 'function');
});

test('Vite adapter transforms .ncui source into an HTML module', function () {
  const plugin = viteAdapter.createNCUIVitePlugin({});
  const transformed = plugin.transform('page "Demo"\nsection hero:\n  text "Hello"\n', '/tmp/demo.ncui');
  assert.ok(typeof transformed === 'string', 'Vite transform should return JS source');
  assert.ok(transformed.includes('export default'), 'Vite transform should export compiled HTML');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
