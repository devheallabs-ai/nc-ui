'use strict';

const path = require('path');
const cp = require('child_process');
const vscode = require('vscode');
const { NCChatProvider } = require('./chatProvider');
const { NCAIChatProvider } = require('./ncChatProvider');

function activate(context) {
  // ── NC IDE Sidebar Console (code runner) ─────────────────────────
  const chatProvider = new NCChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('nc-ide-chat', chatProvider)
  );

  // ── NC Chat (AI assistant) ───────────────────────────────────────
  const aiChatProvider = new NCAIChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('nc-ai-chat', aiChatProvider)
  );

  // ── Commands ─────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('nc.runFile', () => {
      // Focus the sidebar first, then tell the provider to run
      vscode.commands.executeCommand('nc-ide-chat.focus').then(() => {
        chatProvider._runCurrentFile();
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nc.openConsole', () => {
      vscode.commands.executeCommand('nc-ide-chat.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nc.openChat', () => {
      vscode.commands.executeCommand('nc-ai-chat.focus');
    })
  );

  // ── NC UI LSP (existing functionality) ───────────────────────────
  const serverPath = path.resolve(__dirname, '..', 'lsp', 'server.js');
  let client;

  try {
    client = cp.fork(serverPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
  } catch (_) {
    // LSP server not available — skip LSP features
    return;
  }

  const reader = client.stdout;
  const writer = client.stdin;
  let buffer = Buffer.alloc(0);
  let seq = 1;
  const pending = new Map();

  function send(message) {
    const json = JSON.stringify(message);
    writer.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`);
  }

  function sendRequest(method, params) {
    const id = seq++;
    send({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolve) => pending.set(id, resolve));
  }

  function sendNotification(method, params) {
    send({ jsonrpc: '2.0', method, params });
  }

  function ensureDocumentSynced(document) {
    if (document.languageId !== 'ncui') return;
    sendNotification('textDocument/didChange', {
      textDocument: {
        uri: document.uri.toString(),
        version: document.version,
      },
      contentChanges: [{ text: document.getText() }],
    });
  }

  function toPosition(position) {
    return { line: position.line, character: position.character };
  }

  function toVsRange(range) {
    return new vscode.Range(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character
    );
  }

  function handleMessage(message) {
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
      return;
    }
    if (message.method === 'textDocument/publishDiagnostics') {
      const uri = vscode.Uri.parse(message.params.uri);
      const diagnostics = (message.params.diagnostics || []).map((diag) => {
        const diagnostic = new vscode.Diagnostic(
          toVsRange(diag.range),
          diag.message,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = diag.source || 'nc-ui';
        return diagnostic;
      });
      collection.set(uri, diagnostics);
    }
  }

  reader.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (buffer.length < total) break;
      const body = buffer.slice(headerEnd + 4, total).toString('utf8');
      buffer = buffer.slice(total);
      handleMessage(JSON.parse(body));
    }
  });

  const collection = vscode.languages.createDiagnosticCollection('nc-ui');
  context.subscriptions.push(collection);
  context.subscriptions.push({ dispose: () => client.kill() });

  sendRequest('initialize', {
    processId: process.pid,
    rootUri:
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length
        ? vscode.workspace.workspaceFolders[0].uri.toString()
        : null,
    capabilities: {},
  }).then(() => {
    sendNotification('initialized', {});
    vscode.workspace.textDocuments.forEach(openDocument);
  });

  function openDocument(document) {
    if (document.languageId !== 'ncui') return;
    sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: document.uri.toString(),
        languageId: 'ncui',
        version: document.version,
        text: document.getText(),
      },
    });
  }

  const selector = { language: 'ncui', scheme: 'file' };

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(openDocument));
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId !== 'ncui') return;
      ensureDocumentSynced(event.document);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        async provideCompletionItems(document, position) {
          ensureDocumentSynced(document);
          const result = await sendRequest('textDocument/completion', {
            textDocument: { uri: document.uri.toString() },
            position: toPosition(position),
          });
          return (result && result.items ? result.items : []).map((item) => {
            const next = new vscode.CompletionItem(
              item.label,
              vscode.CompletionItemKind.Keyword
            );
            next.detail = item.detail;
            return next;
          });
        },
      },
      ' ',
      ':'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(selector, {
      async provideHover(document, position) {
        ensureDocumentSynced(document);
        const result = await sendRequest('textDocument/hover', {
          textDocument: { uri: document.uri.toString() },
          position: toPosition(position),
        });
        if (!result || !result.contents) return null;
        return new vscode.Hover(
          new vscode.MarkdownString(result.contents.value || 'NC UI')
        );
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(selector, {
      async provideDefinition(document, position) {
        ensureDocumentSynced(document);
        const result = await sendRequest('textDocument/definition', {
          textDocument: { uri: document.uri.toString() },
          position: toPosition(position),
        });
        if (!result || !result.range) return null;
        return new vscode.Location(
          vscode.Uri.parse(result.uri),
          toVsRange(result.range)
        );
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerRenameProvider(selector, {
      async prepareRename(document, position) {
        ensureDocumentSynced(document);
        const result = await sendRequest('textDocument/prepareRename', {
          textDocument: { uri: document.uri.toString() },
          position: toPosition(position),
        });
        if (!result || !result.range) return null;
        return {
          range: toVsRange(result.range),
          placeholder: result.placeholder,
        };
      },
      async provideRenameEdits(document, position, newName) {
        ensureDocumentSynced(document);
        const result = await sendRequest('textDocument/rename', {
          textDocument: { uri: document.uri.toString() },
          position: toPosition(position),
          newName,
        });
        if (!result || !result.changes) return null;
        const edit = new vscode.WorkspaceEdit();
        for (const [uriString, edits] of Object.entries(result.changes)) {
          const uri = vscode.Uri.parse(uriString);
          for (const entry of edits || []) {
            edit.replace(uri, toVsRange(entry.range), entry.newText);
          }
        }
        return edit;
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      async provideDocumentFormattingEdits(document) {
        ensureDocumentSynced(document);
        const result = await sendRequest('textDocument/formatting', {
          textDocument: { uri: document.uri.toString() },
          options: { tabSize: 2, insertSpaces: true },
        });
        return (result || []).map((edit) =>
          vscode.TextEdit.replace(toVsRange(edit.range), edit.newText)
        );
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider({
      async provideWorkspaceSymbols(query) {
        const result = await sendRequest('workspace/symbol', { query });
        return (result || []).map(
          (item) =>
            new vscode.SymbolInformation(
              item.name,
              item.kind || vscode.SymbolKind.Variable,
              item.containerName || 'nc-ui',
              new vscode.Location(
                vscode.Uri.parse(item.location.uri),
                toVsRange(item.location.range)
              )
            )
        );
      },
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
