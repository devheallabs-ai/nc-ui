/**
 * test_sample_server.js — Focused regression tests for the sample backend.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sampleServer = require('../samples/plain-english-showcase/server');

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

console.log('\n=== Sample Server Security ===');

test('Path guard allows files inside dist', function () {
  const distDir = path.resolve(__dirname, '../samples/plain-english-showcase/dist');
  const resolved = sampleServer.isSafeStaticPath(distDir, '/index.html');
  assert.ok(resolved, 'Expected a valid resolved path');
  assert.ok(resolved.startsWith(distDir), 'Resolved path should remain inside dist');
});

test('Path guard blocks traversal outside dist', function () {
  const distDir = path.resolve(__dirname, '../samples/plain-english-showcase/dist');
  const resolved = sampleServer.isSafeStaticPath(distDir, '/../README.md');
  assert.strictEqual(resolved, null, 'Traversal should be rejected');
});

test('Validation rejects injection-like content', function () {
  const errors = sampleServer.validateSubmission({
    name: 'admin',
    email: 'user@example.com',
    message: "hello'; DROP TABLE users; --"
  });
  assert.ok(errors.some(msg => msg.includes('unsafe')), 'Injection-like content should be rejected');
});

test('Validation rejects honeypot fields', function () {
  const errors = sampleServer.validateSubmission({
    name: 'Valid User',
    email: 'user@example.com',
    message: 'hello world from the contact form',
    website: 'https://bot.example'
  });
  assert.ok(errors.some(msg => msg.includes('rejected')), 'Honeypot submissions should be rejected');
});

test('Validation rejects oversized name', function () {
  const errors = sampleServer.validateSubmission({
    name: 'a'.repeat(81),
    email: 'user@example.com',
    message: 'hello world from nc ui'
  });
  assert.ok(errors.some(msg => msg.includes('80 characters')), 'Oversized names should be rejected');
});

test('Body limit stays reasonably bounded', function () {
  assert.ok(sampleServer.MAX_BODY_BYTES <= 32768, 'Sample body limit should stay bounded');
});

test('Proxy-aware client IP extraction prefers forwarded header when trusted', function () {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.5' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.strictEqual(sampleServer.extractClientIp(req, true), '203.0.113.10');
  assert.strictEqual(sampleServer.extractClientIp(req, false), '127.0.0.1');
});

test('Same-origin check accepts matching origin and rejects mismatched origin', function () {
  assert.strictEqual(sampleServer.isSameOriginRequest({
    headers: { host: 'localhost:4011', origin: 'http://localhost:4011' }
  }), true);
  assert.strictEqual(sampleServer.isSameOriginRequest({
    headers: { host: 'localhost:4011', origin: 'http://evil.example' }
  }), false);
});

test('Audit logging persists to disk', function () {
  const logPath = sampleServer.AUDIT_LOG_PATH;
  const dir = path.dirname(logPath);
  fs.mkdirSync(dir, { recursive: true });
  const before = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  sampleServer.recordAudit('test.audit_entry', { ok: true });
  const after = fs.readFileSync(logPath, 'utf8');
  assert.ok(after.includes('test.audit_entry'), 'Audit log file should contain the written event');
  fs.writeFileSync(logPath, before, 'utf8');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Total: ${testsRun} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(testsFailed > 0 ? 1 : 0);
