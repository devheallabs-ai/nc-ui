'use strict';

const vscode = require('vscode');
const path = require('path');
const cp = require('child_process');
const http = require('http');
const os = require('os');
const fs = require('fs');

/**
 * NC Chat — AI-powered chat panel for VSCode
 * Connects to nc-ai/chat.nc server (port 8800) for AI conversations.
 * Falls back to running NC AI directly via CLI if server is down.
 */
class NCAIChatProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
    this._chatHistory = [];
    this._ncBinary = this._findNcBinary();
    this._chatNcPath = this._findChatNc();
    this._serverProcess = null;
    this._serverPort = 8800;
    this._serverReady = false;
  }

  _findNcBinary() {
    const candidates = [
      path.resolve(__dirname, '..', '..', 'nc-lang', 'engine', 'build', 'nc'),
      path.resolve(__dirname, '..', '..', 'nc-lang', 'engine', 'build', 'nc_ai'),
      '/usr/local/bin/nc',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  _findChatNc() {
    const candidates = [
      path.resolve(__dirname, '..', '..', 'nc-ai', 'chat.nc'),
      path.resolve(__dirname, '..', '..', 'nc-ai', 'nc', 'server.nc'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  // ── Server Management ──────────────────────────────────────

  async startServer() {
    if (this._serverReady) return true;
    if (!this._ncBinary || !this._chatNcPath) return false;

    // Check if server is already running
    const alive = await this._pingServer();
    if (alive) {
      this._serverReady = true;
      this._postMessage({ type: 'status', status: 'connected' });
      return true;
    }

    // Start the NC AI Chat server
    try {
      this._serverProcess = cp.spawn(
        this._ncBinary,
        ['serve', this._chatNcPath],
        {
          cwd: path.resolve(__dirname, '..', '..'),
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false,
        }
      );

      this._serverProcess.on('error', (err) => {
        console.error('NC Chat server error:', err.message);
        this._serverReady = false;
        this._postMessage({ type: 'status', status: 'offline' });
      });

      this._serverProcess.on('exit', (code) => {
        console.log('NC Chat server exited with code', code);
        this._serverReady = false;
        this._serverProcess = null;
        this._postMessage({ type: 'status', status: 'offline' });
      });

      // Wait for server to become ready (up to 5 seconds)
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const alive = await this._pingServer();
        if (alive) {
          this._serverReady = true;
          this._postMessage({ type: 'status', status: 'connected' });
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to start NC Chat server:', err.message);
    }

    // Fallback: use CLI mode
    this._postMessage({ type: 'status', status: 'local' });
    return false;
  }

  stopServer() {
    if (this._serverProcess) {
      this._serverProcess.kill();
      this._serverProcess = null;
    }
    this._serverReady = false;
  }

  _pingServer() {
    return new Promise((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${this._serverPort}/health`,
        { timeout: 2000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(res.statusCode === 200));
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  // ── Chat via HTTP ──────────────────────────────────────────

  _chatViaServer(message) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ question: message });
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: this._serverPort,
          path: '/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 30000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.reply || parsed.response || parsed.answer || data);
            } catch (_) {
              resolve(data);
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  // ── Chat via CLI (fallback) ────────────────────────────────

  _chatViaCli(message) {
    return new Promise((resolve, reject) => {
      if (!this._ncBinary || !this._chatNcPath) {
        reject(new Error('NC engine not found'));
        return;
      }

      const proc = cp.spawn(
        this._ncBinary,
        ['ai', 'reason', message],
        {
          timeout: 30000,
          cwd: path.resolve(__dirname, '..', '..'),
          env: { ...process.env },
        }
      );

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `NC exited with code ${code}`));
        }
      });

      proc.on('error', (err) => reject(err));
    });
  }

  // ── Send message (tries server first, falls back to CLI) ──

  async sendMessage(message) {
    this._postMessage({ type: 'thinking', active: true });

    const timestamp = new Date().toISOString();

    // Add user message to history
    this._chatHistory.push({ role: 'user', content: message, timestamp });

    let reply;
    try {
      if (this._serverReady) {
        reply = await this._chatViaServer(message);
      } else {
        reply = await this._chatViaCli(message);
      }
    } catch (err) {
      // If server failed, try CLI
      if (this._serverReady) {
        try {
          reply = await this._chatViaCli(message);
        } catch (cliErr) {
          reply = `Error: Could not reach NC AI.\n\nServer: ${err.message}\nCLI: ${cliErr.message}\n\nMake sure the NC engine is built:\n  cd nc-lang/engine && make`;
        }
      } else {
        reply = `Error: ${err.message}\n\nMake sure the NC engine is built:\n  cd nc-lang/engine && make`;
      }
    }

    // Add assistant reply to history
    this._chatHistory.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });

    this._postMessage({ type: 'thinking', active: false });
    this._postMessage({ type: 'reply', content: reply, timestamp: new Date().toISOString() });
  }

  // ── Run NC code from chat ──────────────────────────────────

  runCodeSnippet(code) {
    if (!this._ncBinary) {
      this._postMessage({
        type: 'codeResult',
        success: false,
        output: 'NC engine not found. Build it first:\n  cd nc-lang/engine && make',
      });
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `nc_chat_${Date.now()}.nc`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    const proc = cp.spawn(this._ncBinary, [tmpFile], {
      timeout: 15000,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (exitCode) => {
      this._postMessage({
        type: 'codeResult',
        success: exitCode === 0,
        output: stdout || stderr || `Exited with code ${exitCode}`,
      });
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });

    proc.on('error', (err) => {
      this._postMessage({
        type: 'codeResult',
        success: false,
        output: `Failed: ${err.message}`,
      });
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });
  }

  // ── Webview Setup ──────────────────────────────────────────

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'send':
          this.sendMessage(msg.text);
          break;
        case 'runCode':
          this.runCodeSnippet(msg.code);
          break;
        case 'clear':
          this._chatHistory = [];
          break;
        case 'connect':
          this.startServer();
          break;
        case 'getHistory':
          this._postMessage({ type: 'history', data: this._chatHistory });
          break;
      }
    });

    // Auto-connect on open
    this.startServer();
  }

  _postMessage(msg) {
    if (this._view) {
      this._view.webview.postMessage(msg);
    }
  }

  _getHtml() {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NC Chat</title>
  <style>
    :root {
      --nc-accent: #0f766e;
      --nc-accent-light: #14b8a6;
      --nc-bg: var(--vscode-sideBar-background, #1e1e1e);
      --nc-fg: var(--vscode-sideBar-foreground, #cccccc);
      --nc-input-bg: var(--vscode-input-background, #2d2d2d);
      --nc-input-fg: var(--vscode-input-foreground, #cccccc);
      --nc-input-border: var(--vscode-input-border, #3e3e3e);
      --nc-border: var(--vscode-panel-border, #2d2d2d);
      --nc-error: #ef4444;
      --nc-info: #6b7280;
      --nc-user-bg: #0f766e22;
      --nc-ai-bg: var(--vscode-editor-background, #1a1a1a);
      --nc-code-bg: #0d1117;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--nc-fg);
      background: var(--nc-bg);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Header ─── */
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--nc-border);
      flex-shrink: 0;
    }

    .header-logo {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, #0f766e, #14b8a6);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 9px;
    }

    .header-title { font-weight: 600; font-size: 13px; flex: 1; }

    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #6b7280;
      transition: background 0.3s;
    }
    .status-dot.connected { background: #22c55e; }
    .status-dot.local { background: #f59e0b; }

    .status-label { font-size: 10px; opacity: 0.7; }

    /* ── Messages ─── */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .messages::-webkit-scrollbar { width: 5px; }
    .messages::-webkit-scrollbar-thumb { background: var(--nc-input-border); border-radius: 3px; }

    .welcome-card {
      text-align: center;
      padding: 28px 16px;
      opacity: 0.8;
    }

    .welcome-card h2 {
      font-size: 16px;
      color: var(--nc-accent-light);
      margin-bottom: 6px;
    }

    .welcome-card p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 12px;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .quick-btn {
      background: var(--nc-input-bg);
      border: 1px solid var(--nc-input-border);
      color: var(--nc-fg);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .quick-btn:hover {
      border-color: var(--nc-accent);
      color: var(--nc-accent-light);
    }

    /* Message bubbles */
    .msg {
      max-width: 92%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
      position: relative;
    }

    .msg.user {
      align-self: flex-end;
      background: var(--nc-user-bg);
      border: 1px solid #0f766e44;
      border-bottom-right-radius: 4px;
    }

    .msg.assistant {
      align-self: flex-start;
      background: var(--nc-ai-bg);
      border: 1px solid var(--nc-border);
      border-bottom-left-radius: 4px;
    }

    .msg-label {
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 4px;
      opacity: 0.6;
    }

    .msg.user .msg-label { color: var(--nc-accent-light); }
    .msg.assistant .msg-label { color: #a78bfa; }

    /* Code blocks inside messages */
    .msg pre {
      background: var(--nc-code-bg);
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 10px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size: 12px;
      line-height: 1.45;
      position: relative;
    }

    .msg code {
      font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size: 12px;
      background: var(--nc-code-bg);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .msg pre code {
      background: none;
      padding: 0;
    }

    .run-code-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: var(--nc-accent);
      color: white;
      border: none;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 10px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.15s;
    }

    .run-code-btn:hover { opacity: 1; }

    .code-result {
      background: #111;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 8px;
      margin-top: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      color: #9ca3af;
    }

    .code-result.success { border-color: #22c55e44; color: #86efac; }
    .code-result.error { border-color: #ef444444; color: #fca5a5; }

    /* Thinking indicator */
    .thinking {
      display: none;
      align-self: flex-start;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--nc-info);
      font-style: italic;
    }

    .thinking.active { display: flex; align-items: center; gap: 8px; }

    .thinking-dots span {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--nc-accent);
      animation: bounce 1.4s infinite both;
    }

    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* ── Input ─── */
    .input-area {
      border-top: 1px solid var(--nc-border);
      padding: 10px 12px;
      flex-shrink: 0;
    }

    .input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .input-row textarea {
      flex: 1;
      min-height: 38px;
      max-height: 140px;
      resize: none;
      background: var(--nc-input-bg);
      color: var(--nc-input-fg);
      border: 1px solid var(--nc-input-border);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: var(--vscode-font-family, system-ui);
      font-size: 13px;
      line-height: 1.4;
      outline: none;
      transition: border-color 0.15s;
    }

    .input-row textarea:focus { border-color: var(--nc-accent); }
    .input-row textarea::placeholder { color: var(--nc-info); }

    .send-btn {
      width: 36px; height: 36px;
      background: var(--nc-accent);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .send-btn:hover { background: var(--nc-accent-light); }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .send-btn svg {
      width: 16px; height: 16px;
      fill: currentColor;
    }

    .input-hint {
      font-size: 10px;
      opacity: 0.4;
      margin-top: 4px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">NC</div>
    <span class="header-title">NC Chat</span>
    <div class="status-dot" id="statusDot"></div>
    <span class="status-label" id="statusLabel">connecting...</span>
  </div>

  <div class="messages" id="messages">
    <div class="welcome-card" id="welcome">
      <h2>NC Chat</h2>
      <p>AI-powered assistant for NC Language.<br>Ask anything — code, explain, generate, debug.</p>
      <div class="quick-actions">
        <button class="quick-btn" data-q="explain NC syntax">Explain NC</button>
        <button class="quick-btn" data-q="generate a CRUD API for tasks">Generate CRUD</button>
        <button class="quick-btn" data-q="write a chatbot in NC">Chatbot</button>
        <button class="quick-btn" data-q="what can NC do?">What is NC?</button>
        <button class="quick-btn" data-q="convert this Python to NC: print('hello')">Convert to NC</button>
      </div>
    </div>

    <div class="thinking" id="thinking">
      <div class="thinking-dots"><span></span><span></span><span></span></div>
      NC is thinking...
    </div>
  </div>

  <div class="input-area">
    <div class="input-row">
      <textarea id="chatInput" placeholder="Ask NC anything..." rows="1" spellcheck="false"></textarea>
      <button class="send-btn" id="sendBtn" title="Send (Enter)">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="input-hint">Enter to send &middot; Shift+Enter for new line</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const thinking = document.getElementById('thinking');
    const welcome = document.getElementById('welcome');
    const statusDot = document.getElementById('statusDot');
    const statusLabel = document.getElementById('statusLabel');

    let isSending = false;

    // ── Status ───
    function setStatus(status) {
      statusDot.className = 'status-dot ' + status;
      const labels = {
        connected: 'NC AI Server',
        local: 'Local Mode',
        offline: 'Offline',
      };
      statusLabel.textContent = labels[status] || 'connecting...';
    }

    // ── Format message content ───
    function formatContent(text) {
      // Escape HTML
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Code blocks (triple backtick)
      html = html.replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) => {
        const id = 'code_' + Math.random().toString(36).substr(2, 6);
        return '<pre id="' + id + '"><button class="run-code-btn" onclick="runCode(\\'' + id + '\\')">Run</button><code>' + code.trim() + '</code></pre>';
      });

      // Inline code
      html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');

      // Bold
      html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

      return html;
    }

    // ── Add message bubble ───
    function addMessage(role, content) {
      if (welcome) welcome.style.display = 'none';

      const div = document.createElement('div');
      div.className = 'msg ' + role;

      const label = document.createElement('div');
      label.className = 'msg-label';
      label.textContent = role === 'user' ? 'You' : 'NC AI';
      div.appendChild(label);

      const body = document.createElement('div');
      body.innerHTML = formatContent(content);
      div.appendChild(body);

      // Insert before thinking indicator
      messages.insertBefore(div, thinking);
      messages.scrollTop = messages.scrollHeight;

      return div;
    }

    // ── Send message ───
    function send() {
      const text = chatInput.value.trim();
      if (!text || isSending) return;

      isSending = true;
      sendBtn.disabled = true;
      addMessage('user', text);
      chatInput.value = '';
      chatInput.style.height = '38px';

      vscode.postMessage({ type: 'send', text });
    }

    // ── Run code snippet ───
    window.runCode = function(id) {
      const pre = document.getElementById(id);
      if (!pre) return;
      const code = pre.querySelector('code').textContent;

      // Remove existing result
      const existing = pre.nextElementSibling;
      if (existing && existing.classList.contains('code-result')) {
        existing.remove();
      }

      const result = document.createElement('div');
      result.className = 'code-result';
      result.textContent = 'Running...';
      pre.parentElement.insertBefore(result, pre.nextSibling);

      // Store reference for result
      window._pendingCodeResult = result;
      vscode.postMessage({ type: 'runCode', code });
    };

    // ── Event Listeners ───
    sendBtn.addEventListener('click', send);

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    chatInput.addEventListener('input', () => {
      chatInput.style.height = '38px';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
    });

    // Quick action buttons
    document.querySelectorAll('.quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.q;
        send();
      });
    });

    // ── Messages from extension ───
    window.addEventListener('message', (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'reply':
          addMessage('assistant', msg.content);
          isSending = false;
          sendBtn.disabled = false;
          chatInput.focus();
          break;

        case 'thinking':
          thinking.classList.toggle('active', msg.active);
          if (msg.active) messages.scrollTop = messages.scrollHeight;
          break;

        case 'status':
          setStatus(msg.status);
          break;

        case 'codeResult':
          if (window._pendingCodeResult) {
            window._pendingCodeResult.className = 'code-result ' + (msg.success ? 'success' : 'error');
            window._pendingCodeResult.textContent = msg.output;
            window._pendingCodeResult = null;
            messages.scrollTop = messages.scrollHeight;
          }
          break;

        case 'history':
          if (msg.data && msg.data.length) {
            welcome.style.display = 'none';
            msg.data.forEach((m) => addMessage(m.role, m.content));
          }
          break;
      }
    });

    // Request history & connect
    vscode.postMessage({ type: 'getHistory' });
    vscode.postMessage({ type: 'connect' });
    chatInput.focus();
  </script>
</body>
</html>`;
  }
}

module.exports = { NCAIChatProvider };
