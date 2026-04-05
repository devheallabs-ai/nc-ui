'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ncui-lsp-'));
}

function encode(message) {
  const json = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function createReader(stream) {
  let buffer = Buffer.alloc(0);
  const pending = [];

  stream.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (buffer.length < total) return;
      const body = buffer.slice(headerEnd + 4, total).toString('utf8');
      buffer = buffer.slice(total);
      const message = JSON.parse(body);
      const waiter = pending.shift();
      if (waiter) waiter(message);
    }
  });

  return function nextMessage() {
    return new Promise(resolve => pending.push(resolve));
  };
}

async function main() {
  const dir = tempDir();
  const filePath = path.join(dir, 'app.ncui');
  fs.writeFileSync(filePath, 'component PortalCard:\n  text "Hello"\n', 'utf8');

  const server = cp.spawn(process.execPath, ['nc-ui/lsp/server.js'], {
    cwd: '/Users/NuckalaSai.Narender4/Documents/nc-main',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const nextMessage = createReader(server.stdout);

  server.stdin.write(encode({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: `file://${dir}`
    }
  }));

  const init = await nextMessage();
  assert.strictEqual(init.id, 1);
  assert.ok(init.result.capabilities.workspaceSymbolProvider, 'LSP should advertise workspace symbol support');

  server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
  server.stdin.write(encode({
    jsonrpc: '2.0',
    id: 2,
    method: 'workspace/symbol',
    params: { query: 'Portal' }
  }));

  const symbols = await nextMessage();
  assert.strictEqual(symbols.id, 2);
  assert.ok(Array.isArray(symbols.result), 'workspace/symbol should return an array');
  assert.ok(symbols.result.some(item => item.name === 'PortalCard'), 'Workspace symbol search should find component definitions');

  server.kill();
  console.log('  [PASS] LSP workspace symbol search');
}

main().catch(err => {
  console.error('  [FAIL] LSP workspace symbol search');
  console.error(`         ${err.message}`);
  process.exit(1);
});
