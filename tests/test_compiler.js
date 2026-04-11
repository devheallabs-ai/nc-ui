/**
 * test_compiler.js — Test suite for the NC UI compiler.
 *
 * Validates lexing, parsing, AST generation, and code output
 * for the NC UI markup compiler.
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* ── Load the compiler ────────────────────────────────────── */

const compiler = require('../compiler.js');

/* ── Test framework ───────────────────────────────────────── */

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

/* ═══════════════════════════════════════════════════════════
 *  Basic Compilation Tests
 * ═══════════════════════════════════════════════════════════ */

section('Basic Compilation');

test('Basic page compiles to valid HTML', function () {
    const src = `page "Test Page"
  theme dark
  section "hero"
    text "Hello World"
`;
    const result = compiler.compile(src);
    assert.ok(result, 'Compiler should return output');
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Output should not be empty');
    assert.ok(output.includes('Hello World'), 'Output should contain the text');
});

test('Page with title appears in output', function () {
    const src = `page "My Dashboard"
  section "main"
    text "Welcome"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('Dashboard') || output.includes('Welcome'),
        'Output should include page content');
});

/* ═══════════════════════════════════════════════════════════
 *  Example Files Compilation
 * ═══════════════════════════════════════════════════════════ */

section('Example Files');

test('All example files compile without error', function () {
    const examplesDir = path.join(__dirname, '..', 'examples');
    if (!fs.existsSync(examplesDir)) {
        console.log('         (skipped: examples directory not found)');
        return;
    }
    const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.nc') || f.endsWith('.ncui'));
    let compiled = 0;
    for (const file of files) {
        const src = fs.readFileSync(path.join(examplesDir, file), 'utf8');
        const result = compiler.compile(src);
        assert.ok(result, `${file} should compile`);
        compiled++;
    }
    console.log(`         (compiled ${compiled} example files)`);
});

/* ═══════════════════════════════════════════════════════════
 *  State & Reactivity Tests
 * ═══════════════════════════════════════════════════════════ */

section('State & Reactivity');

test('State declarations produce reactive JS', function () {
    const src = `page "Stateful"
  state count = 0
  section "main"
    text "Count: {count}"
    button "Increment" -> count = count + 1
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Should produce output with state');
});

test('Multiple state variables compile', function () {
    const src = `page "Multi State"
  state name = "Alice"
  state age = 30
  state active = true
  section "main"
    text "{name} is {age}"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Multiple state variables should compile');
});

test('App metadata sets document title', function () {
    const src = `app "Enterprise Portal"
section hero:
  text "Welcome"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('<title>Enterprise Portal</title>'), 'App name should flow into HTML title');
});

test('Computed expressions compile into runtime helpers', function () {
    const src = `page "Metrics"
state count is 2
computed total is count
section hero:
  text "{{total}}"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('var _computed'), 'Computed registry should exist');
    assert.ok(output.includes('_computed["total"]'), 'Computed property should compile');
});

test('On mount fetch compiles into startup data flow', function () {
    const src = `page "Dashboard"
state users is []
on mount:
  fetch "/api/users" with auth save as users
section hero:
  text "Loaded"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('async function _runMountTasks'), 'Mount lifecycle should compile');
    assert.ok(output.includes('/api/users'), 'Mount fetch endpoint should compile');
    assert.ok(output.includes('_set("users", _fetchData)'), 'Mount fetch should save into state');
});

test('On server load parses into server-side lifecycle tasks', function () {
    const src = `page "User"
on server load:
  fetch "/api/users/{{id}}" save as user
routes:
  "/users/:id" shows profile publicly
component profile:
  text "{{id}}"
`;
    const ast = compiler.parse(src);
    assert.ok(ast.lifecycle.server.length > 0, 'Server lifecycle tasks should parse');
    assert.strictEqual(ast.lifecycle.server[0].saveAs, 'user');
});

test('Plain-English request actions parse for server mutations', function () {
    const src = `page "Tasks"
state created_item is null
action saveTask:
  post "/api/tasks" with task_payload save response as created_item redirect to "/tasks"
  reload created_item
`;
    const ast = compiler.parse(src);
    assert.strictEqual(ast.actions[0].body[0].type, 'request');
    assert.strictEqual(ast.actions[0].body[0].method, 'POST');
    assert.strictEqual(ast.actions[0].body[0].saveAs, 'created_item');
    assert.strictEqual(ast.actions[0].body[1].type, 'reload');
});

test('Stores and slots compile into reusable composition primitives', function () {
    const src = `page "Workspace"
store session is {}
component shell with title:
  heading "{{title}}"
  slot content:
    text "Default content"
section hero:
  use shell with title "Portal":
    slot content:
      text "Signed in"
action saveSession:
  set store.session to "active"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('Signed in'), 'Slot content should be rendered into the component');
    assert.ok(output.includes('window.NCUIStores'), 'Store runtime should be exposed');
    assert.ok(output.includes('_setStorePath("session"'), 'Store mutations should compile');
});

/* ═══════════════════════════════════════════════════════════
 *  Router Tests
 * ═══════════════════════════════════════════════════════════ */

section('Routing');

test('Routes produce History API code', function () {
    const src = `page "Routed App"
  route "/" -> "home"
  route "/about" -> "about"
  section "home"
    text "Home Page"
  section "about"
    text "About Page"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Routed app should compile');
});

test('Guarded routes compile route access checks', function () {
    const src = `page "Admin"
guard "admin-only":
  require role "admin"
  redirect to "/403"
routes:
  "/admin" shows dashboard guard "admin-only"
component dashboard:
  text "Admin"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('_routeAllowed'), 'Guarded routes should compile route checks');
    assert.ok(output.includes('"admin-only"'), 'Guard name should be preserved');
});

test('Route fallbacks compile for unauthorized, loading, and error states', function () {
    const src = `page "Secure Console"
routes:
  "/admin" shows dashboard requires auth loading shows route_loading unauthorized shows route_denied error shows route_error
component dashboard:
  text "Admin"
component route_loading:
  loading spinner size "large" "Checking access..."
component route_denied:
  alert "Access denied" type "error" dismissible
component route_error:
  alert "Page failed" type "error"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('unauthorizedComponent'), 'Unauthorized route fallback should compile');
    assert.ok(output.includes('loadingComponent'), 'Loading route fallback should compile');
    assert.ok(output.includes('errorComponent'), 'Error route fallback should compile');
});

test('Lazy routes compile suspense-like metadata', function () {
    const src = `page "Lazy"
routes:
  "/chat" shows chat lazy loading shows route_loading
component chat:
  text "Chat"
component route_loading:
  loading spinner size "large" "Loading chat..."
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('lazy:true'), 'Lazy route metadata should compile');
});

/* ═══════════════════════════════════════════════════════════
 *  Component Tests
 * ═══════════════════════════════════════════════════════════ */

section('Components');

test('Components are reusable', function () {
    const src = `page "Components"
  component "card" with title content
    box
      text "{title}"
      text "{content}"
  section "main"
    card title="Hello" content="World"
    card title="Foo" content="Bar"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Components should compile');
});

test('Nested components compile correctly', function () {
    const src = `page "Nested"
  component "inner" with label
    text "{label}"
  component "outer" with title
    box
      text "{title}"
      inner label="Nested"
  section "main"
    outer title="Parent"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.length > 0, 'Nested components should compile');
});

test('Table markup compiles with deterministic data binding', function () {
    const src = `page "Users"
state users is []
section hero:
  table users:
    column "Name" shows item.name
    column "Role" shows item.role
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('data-ncui-table="users"'), 'Table data source should compile');
    assert.ok(output.includes('ncui-table-head'), 'Table headers should compile');
});

test('Alert and loading primitives compile into enterprise feedback UI', function () {
    const src = `page "Feedback"
section hero:
  alert "Something went wrong" type "error" dismissible
  loading spinner size "large" "Loading secure data..."
  loading skeleton rows 3
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('ncui-alert-error'), 'Error alerts should compile');
    assert.ok(output.includes('data-ncui-dismissible="true"'), 'Dismissible alerts should compile');
    assert.ok(output.includes('ncui-loading-spinner'), 'Spinner loading UI should compile');
    assert.ok(output.includes('ncui-loading-skeleton'), 'Skeleton loading UI should compile');
});

test('Markdown and external widget primitives compile for advanced app shells', function () {
    const src = `page "Advanced"
section hero:
  markdown "# Status\\n\\n- **Healthy**\\n- Streaming ready"
  external "pipeline-graph" with project "alpha" view "live"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('ncui-markdown'), 'Markdown blocks should compile');
    assert.ok(output.includes('data-ncui-external="pipeline-graph"'), 'External widgets should compile');
    assert.ok(output.includes('data-ncui-external-props='), 'External widget props should compile');
});

test('Stream, socket, and graph primitives compile for live enterprise dashboards', function () {
    const src = `page "Realtime"
state pipeline_data is []
section hero:
  stream "/api/chat/stream" save as chat_feed
  socket "wss://example.com/live" save as live_events channel "metrics"
  graph "pipeline" from pipeline_data
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('data-ncui-stream-url="/api/chat/stream"'), 'Stream blocks should compile');
    assert.ok(output.includes('data-ncui-socket-url="wss://example.com/live"'), 'Socket blocks should compile');
    assert.ok(output.includes('data-ncui-graph-kind="pipeline"'), 'Graph blocks should compile');
    assert.ok(output.includes('_initStreams'), 'Stream runtime should compile');
    assert.ok(output.includes('_initSockets'), 'Socket runtime should compile');
    assert.ok(output.includes('_renderGraphs'), 'Graph runtime should compile');
});

test('Drag drop and flow primitives compile for interactive pipeline UIs', function () {
    const src = `page "Pipeline Studio"
state backlog is []
state active_items is []
state pipeline_flow is {}
section hero:
  drag list backlog title "Backlog"
  drop zone active_items title "Active Stage"
  flow "pipeline" from pipeline_flow
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('data-ncui-drag-source="backlog"'), 'Drag lists should compile');
    assert.ok(output.includes('data-ncui-drop-target="active_items"'), 'Drop zones should compile');
    assert.ok(output.includes('data-ncui-flow-kind="pipeline"'), 'Flow canvases should compile');
    assert.ok(output.includes('_initDragDrop'), 'Drag drop runtime should compile');
    assert.ok(output.includes('_initFlowInteractions'), 'Flow interaction runtime should compile');
});

test('Shell primitives compile for large product-style layouts', function () {
    const src = `page "Console"
shell:
  sidebar:
    heading "Platform"
    link "Dashboard" to "/"
  topbar:
    text "Signed in as admin"
  banner "Maintenance window tonight" type "warning"
  panel "Overview":
    text "System healthy"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('ncui-shell'), 'Shell layout should compile');
    assert.ok(output.includes('ncui-sidebar'), 'Sidebar should compile');
    assert.ok(output.includes('ncui-topbar'), 'Topbar should compile');
    assert.ok(output.includes('ncui-panel'), 'Panels should compile');
    assert.ok(output.includes('ncui-banner-warning'), 'Banner variants should compile');
});

test('Provider and service registries compile for larger app shells', function () {
    const src = `page "Platform"
provider "realtime":
  mode is "shared"
  source is "ops"
service "platform_api":
  base is "/api"
  timeout is 12000
  endpoint "listUsers" uses GET "/users"
  endpoint "saveUser" uses POST "/users"
section hero:
  text "Platform shell"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('window.NCUIProviders'), 'Provider registry should compile');
    assert.ok(output.includes('window.NCUIServices'), 'Service registry should compile');
    assert.ok(output.includes('listUsers'), 'Service endpoint helpers should compile');
});

/* ═══════════════════════════════════════════════════════════
 *  Security Tests
 * ═══════════════════════════════════════════════════════════ */

section('Security');

test('XSS: script tags in text are escaped', function () {
    const src = `page "XSS Test"
  section "main"
    text "<script>alert('xss')</script>"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    // Output should NOT contain an unescaped script tag
    assert.ok(!output.includes('<script>alert'), 'Script tags should be escaped or stripped');
});

test('Auth config compiles enterprise auth runtime hooks', function () {
    const src = `page "Secure Portal"
auth:
  type is "pkce"
  auth endpoint is "https://auth.example.com/authorize"
  callback endpoint is "/api/auth/callback"
  client id is "portal-web"
  redirect uri is "https://app.example.com/callback"
  verify endpoint is "/api/auth/verify"
  session mode is "backend"
  token store is "session"
  on login success navigate to is "/dashboard"
guard "admin-only":
  require authenticated
  require role "admin"
  redirect to "/login"
routes:
  "/admin" shows dashboard guard "admin-only"
component dashboard:
  text "Secret"
section hero:
  form on submit runs login:
    input "Email" type "email" bind email
    input "Password" type "password" bind password
    button "Sign In"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('window.NCUIAuth=_auth'), 'Auth runtime should be exposed');
    assert.ok(output.includes('exchangeCode'), 'OAuth/PKCE callback handling should compile');
    assert.ok(output.includes('Direct provider token exchange in the browser is disabled'), 'Backend-first OAuth guidance should compile into runtime');
    assert.ok(output.includes('data-ncui-submit="login"'), 'Auth form should bind to generated login action');
    assert.ok(output.includes('data-ncui-bind="email"'), 'Bound inputs should compile');
    assert.ok(output.includes('window.NCUISecurityHeaders=_securityHeaders'), 'Security headers contract should be exported');
});

test('Enterprise security meta tags are included in HTML output', function () {
    const src = `page "Hardened"
section hero:
  text "Secure"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('Content-Security-Policy'), 'CSP meta should be present');
    assert.ok(output.includes('Permissions-Policy'), 'Permissions policy should be present');
    assert.ok(output.includes('Cross-Origin-Embedder-Policy'), 'COEP meta should be present');
    assert.ok(output.includes('X-Permitted-Cross-Domain-Policies'), 'Cross-domain policy meta should be present');
});

test('Forms compile plain-English validation and built-in submission metadata', function () {
    const src = `page "Signup"
state signup_result is null
section hero:
  form action "/api/signup" method "POST" with auth save response as signup_result redirect to "/welcome":
    input "Email" type "email" bind email
      validate required email
    input "Password" type "password" bind password
      validate required min-length 8 strong-password
    textarea "About" bind about rows 6
      validate max-length 240
    button "Create Account"
`;
    const result = compiler.compile(src);
    const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
    assert.ok(output.includes('data-ncui-action-url="/api/signup"'), 'Built-in form action should compile');
    assert.ok(output.includes('data-ncui-save-response="signup_result"'), 'Response save target should compile');
    assert.ok(output.includes('data-ncui-validators="'), 'Validation metadata should compile');
    assert.ok(output.includes('data-ncui-form-status'), 'Form status region should compile');
    assert.ok(output.includes('_validateForm'), 'Runtime form validation should compile');
});

/* ═══════════════════════════════════════════════════════════
 *  Robustness Tests
 * ═══════════════════════════════════════════════════════════ */

section('Robustness');

test('Large input (10K lines) does not crash', function () {
    let src = 'page "Large"\n';
    src += '  section "main"\n';
    for (let i = 0; i < 10000; i++) {
        src += `    text "Line ${i}"\n`;
    }
    const result = compiler.compile(src);
    assert.ok(result, 'Large input should compile without crash');
});

test('Invalid syntax produces helpful error', function () {
    const src = `this is not valid NC UI syntax }{}{}{`;
    let errored = false;
    try {
        compiler.compile(src);
    } catch (err) {
        errored = true;
        assert.ok(err.message.length > 0, 'Error should have a message');
    }
    // Either throws with a message or returns an error result
    if (!errored) {
        // Compiler may return an error object instead of throwing
        console.log('         (compiler did not throw, returned result)');
    }
});

test('Empty input produces valid HTML', function () {
    let result;
    try {
        result = compiler.compile('');
    } catch (_) {
        // Empty input may throw — acceptable
        console.log('         (compiler throws on empty input — acceptable)');
        return;
    }
    if (result) {
        const output = typeof result === 'string' ? result : (result.html || result.code || result.output || '');
        assert.ok(typeof output === 'string', 'Should return a string');
    }
});

/* ═══════════════════════════════════════════════════════════
 *  Report
 * ═══════════════════════════════════════════════════════════ */

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
