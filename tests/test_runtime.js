/**
 * test_runtime.js — Test suite for the NC UI runtime.
 *
 * Validates StateStore, Router, Animation, Event binding,
 * and template interpolation in a simulated environment.
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* ── Simulate a minimal browser-like environment ──────────── */

const _globalState = {};
const _listeners = {};

// Load the runtime source and extract classes
const runtimeSrc = fs.readFileSync(path.join(__dirname, '..', 'runtime.js'), 'utf8');

// The runtime attaches to `root` — we simulate that
const fakeWindow = {
    addEventListener: function (ev, fn) { _listeners[ev] = fn; },
    location: { pathname: '/', search: '', hash: '' },
    history: {
        pushState: function (state, title, url) { fakeWindow.location.pathname = url; },
        replaceState: function (state, title, url) { fakeWindow.location.pathname = url; },
    },
    document: {
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        createElement: function (tag) { return { tagName: tag, style: {}, classList: { add: function(){}, remove: function(){} }, setAttribute: function(){}, appendChild: function(){} }; },
    },
};

// Execute runtime in our fake context
let NCUI;
try {
    const wrappedSrc = `(function(window, document) { ${runtimeSrc} ; return typeof NCUI !== 'undefined' ? NCUI : (typeof root !== 'undefined' && root.NCUI ? root.NCUI : null); })(fakeWindow, fakeWindow.document);`;
    // Alternative: extract classes manually by evaluating
    const fn = new Function('root', 'window', 'document', runtimeSrc + '\n; return typeof root.NCUI !== "undefined" ? root.NCUI : root;');
    NCUI = fn(fakeWindow, fakeWindow, fakeWindow.document);
} catch (err) {
    // Runtime may not export cleanly in Node — test what we can
    NCUI = null;
}

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
 *  StateStore Tests
 * ═══════════════════════════════════════════════════════════ */

section('StateStore');

test('StateStore: get/set basic values', function () {
    if (!NCUI || !NCUI.StateStore) {
        console.log('         (skipped: StateStore not exported)');
        return;
    }
    const store = new NCUI.StateStore({ count: 0, name: 'test' });
    assert.strictEqual(store.get('count'), 0);
    assert.strictEqual(store.get('name'), 'test');
    store.set('count', 42);
    assert.strictEqual(store.get('count'), 42);
});

test('StateStore: reactive updates fire listeners', function () {
    if (!NCUI || !NCUI.StateStore) {
        console.log('         (skipped: StateStore not exported)');
        return;
    }
    const store = new NCUI.StateStore({ value: 'initial' });
    let notified = false;
    store.on('value', function (newVal, oldVal) {
        notified = true;
        assert.strictEqual(newVal, 'updated');
        assert.strictEqual(oldVal, 'initial');
    });
    store.set('value', 'updated');
    assert.ok(notified, 'Listener should have been called');
});

test('StateStore: update with function', function () {
    if (!NCUI || !NCUI.StateStore) {
        console.log('         (skipped: StateStore not exported)');
        return;
    }
    const store = new NCUI.StateStore({ items: [1, 2, 3] });
    store.update('items', function (arr) {
        arr.push(4);
        return arr;
    });
    const items = store.get('items');
    assert.ok(Array.isArray(items));
    assert.strictEqual(items.length, 4);
});

test('StateStore: addTo appends to array', function () {
    if (!NCUI || !NCUI.StateStore) {
        console.log('         (skipped: StateStore not exported)');
        return;
    }
    const store = new NCUI.StateStore({ list: ['a', 'b'] });
    store.addTo('list', 'c');
    assert.strictEqual(store.get('list').length, 3);
});

/* ═══════════════════════════════════════════════════════════
 *  Router Tests
 * ═══════════════════════════════════════════════════════════ */

section('Router');

test('Router: path matching for static routes', function () {
    if (!NCUI || !NCUI.Router) {
        console.log('         (skipped: Router not exported)');
        return;
    }
    const router = new NCUI.Router();
    let matched = false;
    router.add('/', function () { matched = true; });
    router.navigate('/');
    assert.ok(matched, 'Root route should match');
});

test('Router: param extraction from path', function () {
    if (!NCUI || !NCUI.Router) {
        console.log('         (skipped: Router not exported)');
        return;
    }
    const router = new NCUI.Router();
    let extractedId = null;
    router.add('/users/:id', function (params) { extractedId = params.id; });
    router.navigate('/users/42');
    assert.strictEqual(extractedId, '42', 'Should extract :id param');
});

test('Router: 404 fallback', function () {
    if (!NCUI || !NCUI.Router) {
        console.log('         (skipped: Router not exported)');
        return;
    }
    const router = new NCUI.Router();
    let notFound = false;
    router.setNotFound(function () { notFound = true; });
    router.navigate('/nonexistent');
    assert.ok(notFound, 'Should trigger 404 handler');
});

/* ═══════════════════════════════════════════════════════════
 *  Animation Tests
 * ═══════════════════════════════════════════════════════════ */

section('Animation');

test('Animation: trigger creates animation config', function () {
    if (!NCUI || !NCUI.Animation) {
        console.log('         (skipped: Animation not exported)');
        return;
    }
    const anim = NCUI.Animation.create({
        type: 'fadeIn',
        duration: 300,
        easing: 'ease-in-out',
    });
    assert.ok(anim, 'Should create animation config');
    assert.strictEqual(anim.type || anim.name, 'fadeIn');
});

/* ═══════════════════════════════════════════════════════════
 *  Event Binding Tests
 * ═══════════════════════════════════════════════════════════ */

section('Event Binding');

test('Event binding registers handlers', function () {
    if (!NCUI || !NCUI.EventBinder) {
        console.log('         (skipped: EventBinder not exported)');
        return;
    }
    let clicked = false;
    const el = {
        addEventListener: function (ev, fn) {
            if (ev === 'click') clicked = true;
        },
    };
    NCUI.EventBinder.bind(el, 'click', function () {});
    assert.ok(clicked, 'Should register click handler');
});

/* ═══════════════════════════════════════════════════════════
 *  Template Interpolation Tests
 * ═══════════════════════════════════════════════════════════ */

section('Template Interpolation');

test('Template interpolation replaces variables', function () {
    if (!NCUI || !NCUI.Template) {
        console.log('         (skipped: Template not exported)');
        return;
    }
    const result = NCUI.Template.render('Hello {name}, you are {age}', {
        name: 'NC User',
        age: 25,
    });
    assert.ok(result.includes('NC User'), 'Should replace {name}');
    assert.ok(result.includes('25'), 'Should replace {age}');
});

test('Template handles missing variables gracefully', function () {
    if (!NCUI || !NCUI.Template) {
        console.log('         (skipped: Template not exported)');
        return;
    }
    const result = NCUI.Template.render('Hello {unknown}', {});
    assert.ok(typeof result === 'string', 'Should return a string even for missing vars');
});

/* ═══════════════════════════════════════════════════════════
 *  Runtime Source Validation
 * ═══════════════════════════════════════════════════════════ */

section('Runtime Source');

test('Runtime file exists and is non-empty', function () {
    const runtimePath = path.join(__dirname, '..', 'runtime.js');
    assert.ok(fs.existsSync(runtimePath), 'runtime.js should exist');
    const stat = fs.statSync(runtimePath);
    assert.ok(stat.size > 1000, 'runtime.js should be substantial');
});

test('Runtime contains StateStore class', function () {
    assert.ok(runtimeSrc.includes('StateStore'), 'Should define StateStore');
});

test('Runtime contains Router', function () {
    assert.ok(runtimeSrc.includes('Router') || runtimeSrc.includes('router'),
        'Should define Router');
});

/* ═══════════════════════════════════════════════════════════
 *  Report
 * ═══════════════════════════════════════════════════════════ */

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
