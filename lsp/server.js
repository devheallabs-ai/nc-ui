#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('../compiler');

const KEYWORDS = [
  'app', 'page', 'theme', 'accent', 'font', 'section', 'nav', 'footer',
  'state', 'computed', 'routes', 'guard', 'auth', 'component',
  'form', 'input', 'textarea', 'table', 'button', 'text', 'heading',
  'on mount', 'fetch', 'validate', 'with auth', 'save response as', 'redirect to'
];

let buffer = Buffer.alloc(0);
const documents = new Map();
let workspaceRoot = null;

function writeMessage(payload) {
  const json = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`);
}

function sendResponse(id, result) {
  writeMessage({ jsonrpc: '2.0', id, result });
}

function sendNotification(method, params) {
  writeMessage({ jsonrpc: '2.0', method, params });
}

function makeRange(line, start, end) {
  return {
    start: { line, character: start },
    end: { line, character: end }
  };
}

function makeDiagnostic(message, line, start, end) {
  return {
    severity: 1,
    source: 'nc-ui',
    message,
    range: makeRange(line, start || 0, end || 1)
  };
}

function indexToPosition(text, index) {
  const slice = text.slice(0, index);
  const lines = slice.split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length
  };
}

function positionToIndex(text, position) {
  const lines = text.split('\n');
  let index = 0;
  for (let i = 0; i < position.line; i++) {
    index += (lines[i] || '').length + 1;
  }
  return index + position.character;
}

function isInsideRange(position, range) {
  if (position.line < range.start.line || position.line > range.end.line) return false;
  if (position.line === range.start.line && position.character < range.start.character) return false;
  if (position.line === range.end.line && position.character > range.end.character) return false;
  return true;
}

function toLocation(uri, ref) {
  return {
    uri,
    range: ref.range
  };
}

function uriToPath(uri) {
  if (!uri) return null;
  if (uri.startsWith('file://')) {
    return decodeURIComponent(new URL(uri).pathname);
  }
  return uri;
}

function pathToUri(filePath) {
  const resolved = path.resolve(filePath);
  return `file://${resolved}`;
}

function formatText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const indentStack = [0];
  const output = [];

  for (const rawLine of lines) {
    const expanded = rawLine.replace(/\t/g, '    ');
    const trimmed = expanded.trim();
    if (!trimmed) {
      if (output.length && output[output.length - 1] !== '') output.push('');
      continue;
    }

    const currentIndent = expanded.length - expanded.trimStart().length;
    while (indentStack.length > 1 && currentIndent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
    }

    const level = indentStack.length - 1;
    output.push(`${'  '.repeat(level)}${trimmed.replace(/\s+$/g, '')}`);

    if (trimmed.endsWith(':')) {
      indentStack.push(currentIndent + 2);
    }
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n') + (text.endsWith('\n') ? '\n' : '');
}

function symbolKindPriority(kind) {
  return {
    component: 1,
    action: 2,
    guard: 3,
    computed: 4,
    state: 5
  }[kind] || 99;
}

function collectMatches(lineText, lineNumber, regex, kind, role, nameGroup) {
  const matches = [];
  let match;
  const localRegex = new RegExp(regex.source, regex.flags);
  while ((match = localRegex.exec(lineText))) {
    const symbol = match[nameGroup || 1];
    if (!symbol) continue;
    const start = match.index + match[0].indexOf(symbol);
    const end = start + symbol.length;
    matches.push({
      kind,
      role,
      name: symbol,
      range: makeRange(lineNumber, start, end)
    });
  }
  return matches;
}

function buildSymbolIndex(text) {
  const lines = text.split('\n');
  const definitions = [];
  const references = [];

  lines.forEach((lineText, lineNumber) => {
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*component\s+([A-Za-z_][\w-]*)\s*:/g, 'component', 'definition'));
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*state\s+([A-Za-z_][\w-]*)\b/g, 'state', 'definition'));
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*computed\s+([A-Za-z_][\w-]*)\b/g, 'computed', 'definition'));
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*action\s+([A-Za-z_][\w-]*)\b/g, 'action', 'definition'));
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*guard\s+"([^"]+)"\s*:/g, 'guard', 'definition'));
    definitions.push(...collectMatches(lineText, lineNumber, /^\s*guard\s+([A-Za-z_][\w-]*)\s*:/g, 'guard', 'definition'));

    references.push(...collectMatches(lineText, lineNumber, /\buse\s+([A-Za-z_][\w-]*)\b/g, 'component', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bshows\s+([A-Za-z_][\w-]*)\b/g, 'component', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bruns\s+([A-Za-z_][\w-]*)\b/g, 'action', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bonClick\s+([A-Za-z_][\w-]*)\b/g, 'action', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bonSubmit\s+([A-Za-z_][\w-]*)\b/g, 'action', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bguard\s+"([^"]+)"/g, 'guard', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bguard\s+([A-Za-z_][\w-]*)\b/g, 'guard', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bbind\s+([A-Za-z_][\w-]*)\b/g, 'state', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\bsave\s+(?:response\s+)?as\s+([A-Za-z_][\w-]*)\b/g, 'state', 'reference'));
    references.push(...collectMatches(lineText, lineNumber, /\{\{\s*([A-Za-z_][\w-]*)\s*\}\}/g, 'computed', 'reference'));
  });

  const symbolTable = new Map();
  for (const def of definitions) {
    const key = `${def.kind}:${def.name}`;
    if (!symbolTable.has(key)) {
      symbolTable.set(key, { definition: def, references: [] });
    }
  }
  for (const ref of references) {
    const key = `${ref.kind}:${ref.name}`;
    if (!symbolTable.has(key)) {
      symbolTable.set(key, { definition: null, references: [] });
    }
    symbolTable.get(key).references.push(ref);
  }

  return { definitions, references, symbolTable };
}

function symbolKindForLsp(kind) {
  return {
    component: 5,
    action: 12,
    guard: 13,
    computed: 13,
    state: 13
  }[kind] || 13;
}

function listWorkspaceNcuiFiles(rootDir) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.ncui')) {
        files.push(fullPath);
      }
    }
  }
  if (rootDir && fs.existsSync(rootDir)) walk(rootDir);
  return files;
}

function workspaceSymbols(query) {
  if (!workspaceRoot) return [];
  const lowered = String(query || '').trim().toLowerCase();
  const results = [];
  for (const filePath of listWorkspaceNcuiFiles(workspaceRoot)) {
    const text = documents.get(pathToUri(filePath)) || fs.readFileSync(filePath, 'utf8');
    const index = buildSymbolIndex(text);
    for (const def of index.definitions) {
      if (lowered && !String(def.name).toLowerCase().includes(lowered)) continue;
      results.push({
        name: def.name,
        kind: symbolKindForLsp(def.kind),
        location: {
          uri: pathToUri(filePath),
          range: def.range
        },
        containerName: path.basename(filePath)
      });
    }
  }
  return results.slice(0, 200);
}

function symbolAtPosition(text, position) {
  const index = buildSymbolIndex(text);
  const matches = []
    .concat(index.definitions.filter(ref => isInsideRange(position, ref.range)))
    .concat(index.references.filter(ref => isInsideRange(position, ref.range)));

  matches.sort((a, b) => symbolKindPriority(a.kind) - symbolKindPriority(b.kind));
  return matches[0] || null;
}

function symbolEntry(text, position) {
  const found = symbolAtPosition(text, position);
  if (!found) return null;
  const index = buildSymbolIndex(text);
  const exactKey = `${found.kind}:${found.name}`;
  if (index.symbolTable.has(exactKey)) {
    return { symbol: found, entry: index.symbolTable.get(exactKey) };
  }

  if (found.kind === 'computed') {
    const stateKey = `state:${found.name}`;
    if (index.symbolTable.has(stateKey)) return { symbol: { kind: 'state', name: found.name }, entry: index.symbolTable.get(stateKey) };
  }
  if (found.kind === 'state') {
    const computedKey = `computed:${found.name}`;
    if (index.symbolTable.has(computedKey)) return { symbol: { kind: 'computed', name: found.name }, entry: index.symbolTable.get(computedKey) };
  }

  return null;
}

function renameEdits(text, position, newName) {
  const found = symbolEntry(text, position);
  if (!found || !newName || !/^[A-Za-z_][\w-]*$/.test(newName)) return null;

  const oldName = found.symbol.name;
  const edits = [];
  const seen = new Set();
  function pushEdit(range) {
    const key = `${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
    if (seen.has(key)) return;
    seen.add(key);
    edits.push({ range, newText: newName });
  }
  if (found.entry.definition) {
    pushEdit(found.entry.definition.range);
  }
  for (const ref of found.entry.references || []) {
    pushEdit(ref.range);
  }

  return {
    oldName,
    newName,
    edits
  };
}

function validateText(text) {
  const diagnostics = [];
  try {
    const ast = parse(text);
    const seenStates = new Set();
    for (const state of ast.states || []) {
      const key = String(state.name || '').toLowerCase();
      if (seenStates.has(key)) {
        diagnostics.push(makeDiagnostic(`Duplicate state "${state.name}".`, 0, 0, 5));
      }
      seenStates.add(key);
    }
  } catch (error) {
    const match = /line (\d+)/i.exec(error.message || '');
    const line = match ? Math.max(parseInt(match[1], 10) - 1, 0) : 0;
    diagnostics.push(makeDiagnostic(error.message || 'Parse error', line, 0, 20));
  }
  return diagnostics;
}

function publishDiagnostics(uri) {
  const text = documents.get(uri) || '';
  sendNotification('textDocument/publishDiagnostics', {
    uri,
    diagnostics: validateText(text)
  });
}

function handleMessage(msg) {
  switch (msg.method) {
    case 'initialize':
      workspaceRoot = uriToPath(msg.params && msg.params.rootUri);
      sendResponse(msg.id, {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: { resolveProvider: false, triggerCharacters: [' ', ':'] },
          hoverProvider: true,
          definitionProvider: true,
          renameProvider: { prepareProvider: true },
          documentFormattingProvider: true,
          workspaceSymbolProvider: true
        },
        serverInfo: {
          name: 'nc-ui-language-server',
          version: '0.2.0'
        }
      });
      return;
    case 'initialized':
      return;
    case 'shutdown':
      sendResponse(msg.id, null);
      return;
    case 'exit':
      process.exit(0);
      return;
    case 'textDocument/didOpen': {
      const doc = msg.params.textDocument;
      documents.set(doc.uri, doc.text);
      publishDiagnostics(doc.uri);
      return;
    }
    case 'textDocument/didChange': {
      const uri = msg.params.textDocument.uri;
      const text = msg.params.contentChanges.length ? msg.params.contentChanges[msg.params.contentChanges.length - 1].text : '';
      documents.set(uri, text);
      publishDiagnostics(uri);
      return;
    }
    case 'textDocument/completion':
      sendResponse(msg.id, {
        isIncomplete: false,
        items: KEYWORDS.map(label => ({
          label,
          kind: 14,
          detail: 'NC UI plain-English keyword'
        }))
      });
      return;
    case 'textDocument/hover': {
      const uri = msg.params.textDocument.uri;
      const text = documents.get(uri) || '';
      const symbol = symbolEntry(text, msg.params.position);
      const fallbackLine = (text.split('\n')[msg.params.position.line] || '');
      const fallbackWord = fallbackLine.slice(0, msg.params.position.character + 1).match(/[A-Za-z-]+$/);
      const word = symbol ? symbol.symbol.name : (fallbackWord ? fallbackWord[0] : 'nc-ui');
      const kind = symbol ? symbol.symbol.kind : 'keyword';
      sendResponse(msg.id, {
        contents: {
          kind: 'markdown',
          value: `**${word}**\n\nNC UI ${kind} in the deterministic plain-English language.`
        }
      });
      return;
    }
    case 'textDocument/definition': {
      const uri = msg.params.textDocument.uri;
      const text = documents.get(uri) || '';
      const symbol = symbolEntry(text, msg.params.position);
      const location = symbol && symbol.entry.definition ? toLocation(uri, symbol.entry.definition) : null;
      sendResponse(msg.id, location);
      return;
    }
    case 'textDocument/prepareRename': {
      const uri = msg.params.textDocument.uri;
      const text = documents.get(uri) || '';
      const symbol = symbolEntry(text, msg.params.position);
      if (!symbol) {
        sendResponse(msg.id, null);
        return;
      }
      const target = symbolAtPosition(text, msg.params.position) || symbol.entry.definition || { range: makeRange(0, 0, 1) };
      sendResponse(msg.id, {
        range: target.range,
        placeholder: symbol.symbol.name
      });
      return;
    }
    case 'textDocument/rename': {
      const uri = msg.params.textDocument.uri;
      const text = documents.get(uri) || '';
      const rename = renameEdits(text, msg.params.position, msg.params.newName);
      sendResponse(msg.id, rename ? { changes: { [uri]: rename.edits } } : null);
      return;
    }
    case 'textDocument/formatting': {
      const uri = msg.params.textDocument.uri;
      const text = documents.get(uri) || '';
      const formatted = formatText(text);
      const lines = text.split('\n');
      const lastLine = Math.max(lines.length - 1, 0);
      const lastChar = (lines[lastLine] || '').length;
      sendResponse(msg.id, [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: lastLine, character: lastChar }
        },
        newText: formatted
      }]);
      return;
    }
    case 'workspace/symbol': {
      sendResponse(msg.id, workspaceSymbols(msg.params && msg.params.query));
      return;
    }
    default:
      if (Object.prototype.hasOwnProperty.call(msg, 'id')) {
        sendResponse(msg.id, null);
      }
  }
}

process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
    if (!lengthMatch) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = parseInt(lengthMatch[1], 10);
    const total = headerEnd + 4 + length;
    if (buffer.length < total) return;
    const body = buffer.slice(headerEnd + 4, total).toString('utf8');
    buffer = buffer.slice(total);
    try {
      handleMessage(JSON.parse(body));
    } catch (error) {
      sendNotification('window/logMessage', {
        type: 1,
        message: `NC UI LSP error: ${error.message}`
      });
    }
  }
});

process.stdin.resume();
