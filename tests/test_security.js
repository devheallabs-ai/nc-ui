/**
 * test_security.js — Test suite for the NC UI security module.
 *
 * Validates XSS sanitization, CSRF tokens, CSP generation,
 * JWT handling, OAuth PKCE, input validation, rate limiting,
 * and security headers.
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 */

'use strict';

const assert = require('assert');
const security = require('../security.js');

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
 *  XSS Sanitization
 * ═══════════════════════════════════════════════════════════ */

section('XSS Protection');

test('sanitize strips script tags', function () {
    const input = '<script>alert("xss")</script>Hello';
    const result = security.xss.sanitize(input);
    assert.ok(!result.includes('<script>'), 'Should strip script tags');
    assert.ok(result.includes('Hello'), 'Should keep safe content');
});

test('sanitize encodes HTML entities', function () {
    const input = '<img src=x onerror=alert(1)>';
    const result = security.xss.sanitize(input);
    assert.ok(!result.includes('<img'), 'Should encode angle brackets');
});

test('sanitize handles null/undefined', function () {
    assert.strictEqual(security.xss.sanitize(null), '');
    assert.strictEqual(security.xss.sanitize(undefined), '');
    assert.strictEqual(security.xss.sanitize(42), '');
});

test('sanitizeUrl blocks javascript: protocol', function () {
    assert.strictEqual(security.xss.sanitizeUrl('javascript:alert(1)'), 'about:blank');
    assert.strictEqual(security.xss.sanitizeUrl('data:text/html,<script>'), 'about:blank');
    assert.strictEqual(security.xss.sanitizeUrl('https://example.com'), 'https://example.com');
});

test('createPolicy returns policy object', function () {
    const policy = security.xss.createPolicy('test');
    assert.ok(policy.createHTML, 'Should have createHTML');
    assert.ok(policy.createScript, 'Should have createScript');
    assert.ok(policy.createScriptURL, 'Should have createScriptURL');
});

/* ═══════════════════════════════════════════════════════════
 *  CSRF Protection
 * ═══════════════════════════════════════════════════════════ */

section('CSRF Protection');

test('generateToken returns unique tokens', function () {
    const token1 = security.csrf.generateToken();
    const token2 = security.csrf.generateToken();
    assert.ok(token1.length > 20, 'Token should be sufficiently long');
    assert.notStrictEqual(token1, token2, 'Tokens should be unique');
});

test('validateToken accepts valid token', function () {
    const token = security.csrf.generateToken();
    assert.strictEqual(security.csrf.validateToken(token), true, 'Should validate generated token');
});

test('validateToken rejects invalid token', function () {
    assert.strictEqual(security.csrf.validateToken('invalid_token_12345'), false);
    assert.strictEqual(security.csrf.validateToken(null), false);
    assert.strictEqual(security.csrf.validateToken(''), false);
});

test('validateToken is single-use', function () {
    const token = security.csrf.generateToken();
    security.csrf.validateToken(token);
    assert.strictEqual(security.csrf.validateToken(token), false, 'Used token should be rejected');
});

/* ═══════════════════════════════════════════════════════════
 *  CSP Policy
 * ═══════════════════════════════════════════════════════════ */

section('Content Security Policy');

test('defaultPolicy generates valid CSP string', function () {
    const policy = security.csp.defaultPolicy();
    assert.ok(policy.includes("default-src 'self'"), 'Should include default-src');
    assert.ok(policy.includes("script-src 'self'"), 'Should include script-src');
    assert.ok(policy.includes("object-src 'none'"), 'Should block objects');
});

test('generate accepts custom directives', function () {
    const policy = security.csp.generate({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
    });
    assert.ok(policy.includes('cdn.example.com'), 'Should include custom CDN');
});

test('generateNonce returns base64url string', function () {
    const nonce = security.csp.generateNonce();
    assert.ok(nonce.length >= 16, 'Nonce should be sufficiently long');
    assert.ok(/^[A-Za-z0-9_-]+$/.test(nonce), 'Should be base64url encoded');
});

/* ═══════════════════════════════════════════════════════════
 *  JWT Handling
 * ═══════════════════════════════════════════════════════════ */

section('JWT Handling');

test('decode parses valid JWT payload', function () {
    // JWT: {"sub":"1234","name":"NC User","exp":9999999999}
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6Ik5DIFVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.signature';
    const payload = security.jwt.decode(token);
    assert.ok(payload, 'Should decode payload');
    assert.strictEqual(payload.sub, '1234');
    assert.strictEqual(payload.name, 'NC User');
});

test('decode returns null for invalid JWT', function () {
    assert.strictEqual(security.jwt.decode('not.a.jwt'), null);
    assert.strictEqual(security.jwt.decode(null), null);
    assert.strictEqual(security.jwt.decode(''), null);
});

test('isExpired detects expired token', function () {
    // exp in the past
    const expiredPayload = Buffer.from(JSON.stringify({ exp: 1000 })).toString('base64');
    const token = 'eyJhbGciOiJIUzI1NiJ9.' + expiredPayload + '.sig';
    assert.strictEqual(security.jwt.isExpired(token), true);
});

test('isExpired returns false for valid future token', function () {
    const futurePayload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString('base64');
    const token = 'eyJhbGciOiJIUzI1NiJ9.' + futurePayload + '.sig';
    assert.strictEqual(security.jwt.isExpired(token), false);
});

test('store and retrieve cycle works', function () {
    security.jwt.store('test_token_abc');
    assert.strictEqual(security.jwt.retrieve(), 'test_token_abc');
    security.jwt.clear();
    assert.strictEqual(security.jwt.retrieve(), null);
});

/* ═══════════════════════════════════════════════════════════
 *  OAuth PKCE
 * ═══════════════════════════════════════════════════════════ */

section('OAuth PKCE');

test('generateCodeVerifier produces correct length', function () {
    const v1 = security.oauth.generateCodeVerifier(64);
    assert.strictEqual(v1.length, 64, 'Should be 64 chars');
    const v2 = security.oauth.generateCodeVerifier(43);
    assert.strictEqual(v2.length, 43, 'Minimum 43 chars');
    const v3 = security.oauth.generateCodeVerifier(128);
    assert.strictEqual(v3.length, 128, 'Maximum 128 chars');
});

test('generateCodeVerifier uses valid charset', function () {
    const v = security.oauth.generateCodeVerifier(128);
    assert.ok(/^[A-Za-z0-9\-._~]+$/.test(v), 'Should only use unreserved chars');
});

test('buildAuthUrl constructs valid URL', function () {
    const url = security.oauth.buildAuthUrl({
        authEndpoint: 'https://auth.example.com/authorize',
        clientId: 'my-client',
        redirectUri: 'https://app.example.com/callback',
        scope: 'openid',
        codeChallenge: 'abc123',
    });
    assert.ok(url.startsWith('https://auth.example.com/authorize?'));
    assert.ok(url.includes('client_id=my-client'));
    assert.ok(url.includes('code_challenge=abc123'));
    assert.ok(url.includes('code_challenge_method=S256'));
});

test('handleCallback extracts code', function () {
    const result = security.oauth.handleCallback('https://app.example.com/callback?code=AUTH_CODE&state=xyz');
    assert.strictEqual(result.code, 'AUTH_CODE');
    assert.strictEqual(result.state, 'xyz');
});

test('handleCallback handles error', function () {
    const result = security.oauth.handleCallback('https://app.example.com/callback?error=access_denied');
    assert.strictEqual(result.error, 'access_denied');
});

/* ═══════════════════════════════════════════════════════════
 *  Input Validation
 * ═══════════════════════════════════════════════════════════ */

section('Input Validation');

test('email validation', function () {
    assert.strictEqual(security.validate.email('user@example.com'), true);
    assert.strictEqual(security.validate.email('not-an-email'), false);
    assert.strictEqual(security.validate.email(''), false);
});

test('url validation', function () {
    assert.strictEqual(security.validate.url('https://example.com'), true);
    assert.strictEqual(security.validate.url('not a url'), false);
});

test('SQL injection detection', function () {
    assert.strictEqual(security.validate.noSqlInjection("'; DROP TABLE users; --"), false);
    assert.strictEqual(security.validate.noSqlInjection('SELECT * FROM users'), false);
    assert.strictEqual(security.validate.noSqlInjection('hello world'), true);
});

test('NoSQL injection detection', function () {
    assert.strictEqual(security.validate.noSqlInjection('{"$gt": ""}'), false);
    assert.strictEqual(security.validate.noSqlInjection('normal text'), true);
});

test('required validation', function () {
    assert.strictEqual(security.validate.required('hello'), true);
    assert.strictEqual(security.validate.required(''), false);
    assert.strictEqual(security.validate.required(null), false);
});

/* ═══════════════════════════════════════════════════════════
 *  Rate Limiting
 * ═══════════════════════════════════════════════════════════ */

section('Rate Limiting');

test('rate limiter allows requests within limit', function () {
    const limiter = security.rateLimit.create(5, 1000);
    for (let i = 0; i < 5; i++) {
        assert.strictEqual(security.rateLimit.check(limiter), true, `Request ${i+1} should be allowed`);
    }
});

test('rate limiter blocks excess requests', function () {
    const limiter = security.rateLimit.create(2, 60000);
    security.rateLimit.check(limiter);
    security.rateLimit.check(limiter);
    assert.strictEqual(security.rateLimit.check(limiter), false, 'Third request should be blocked');
});

/* ═══════════════════════════════════════════════════════════
 *  Security Headers
 * ═══════════════════════════════════════════════════════════ */

section('Security Headers');

test('generate returns all required headers', function () {
    const hdrs = security.headers.generate();
    assert.strictEqual(hdrs['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(hdrs['X-Frame-Options'], 'DENY');
    assert.strictEqual(hdrs['X-XSS-Protection'], '1; mode=block');
    assert.ok(hdrs['Strict-Transport-Security'].includes('max-age=31536000'));
    assert.ok(hdrs['Referrer-Policy']);
    assert.ok(hdrs['Permissions-Policy'].includes('camera=()'));
    assert.ok(hdrs['Content-Security-Policy']);
});

/* ═══════════════════════════════════════════════════════════
 *  Report
 * ═══════════════════════════════════════════════════════════ */

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
