'use strict';

const vscode = require('vscode');
const path = require('path');
const cp = require('child_process');
const os = require('os');

class NCChatProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
    this._history = [];
    this._ncBinary = this._findNcBinary();
  }

  _findNcBinary() {
    // Look for nc binary relative to the extension (inside nc-main project)
    const candidates = [
      path.resolve(__dirname, '..', '..', 'nc-lang', 'engine', 'build', 'nc'),
      path.resolve(__dirname, '..', '..', 'nc-lang', 'engine', 'build', 'nc_ai'),
    ];
    const fs = require('fs');
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'run':
          this._runNcCode(message.code);
          break;
        case 'runFile':
          this._runCurrentFile();
          break;
        case 'clear':
          this._history = [];
          break;
        case 'getHistory':
          this._view.webview.postMessage({ type: 'history', data: this._history });
          break;
      }
    });
  }

  _runNcCode(code) {
    if (!this._ncBinary) {
      this._postOutput('error', 'NC engine not found. Build it first:\n  cd nc-lang/engine && make');
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `nc_run_${Date.now()}.nc`);
    const fs = require('fs');
    fs.writeFileSync(tmpFile, code, 'utf8');

    const startTime = Date.now();

    const proc = cp.spawn(this._ncBinary, [tmpFile], {
      timeout: 30000,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      this._postOutput('stdout', data.toString());
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const elapsed = Date.now() - startTime;
      if (stderr) {
        this._postOutput('error', stderr);
      }
      this._postOutput('info', `\nProcess exited with code ${code} (${elapsed}ms)`);

      // Save to history
      this._history.push({
        input: code,
        output: stdout,
        error: stderr,
        exitCode: code,
        time: elapsed,
        timestamp: new Date().toISOString(),
      });

      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });

    proc.on('error', (err) => {
      this._postOutput('error', `Failed to start NC engine: ${err.message}`);
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });
  }

  _runCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._postOutput('error', 'No active file open.');
      return;
    }

    const filePath = editor.document.fileName;
    if (!filePath.endsWith('.nc') && !filePath.endsWith('.ncui')) {
      this._postOutput('error', 'Active file is not an NC file (.nc or .ncui).');
      return;
    }

    if (!this._ncBinary) {
      this._postOutput('error', 'NC engine not found. Build it first:\n  cd nc-lang/engine && make');
      return;
    }

    // Save the file first
    editor.document.save().then(() => {
      this._postOutput('info', `Running ${path.basename(filePath)}...\n`);

      const startTime = Date.now();
      const proc = cp.spawn(this._ncBinary, [filePath], {
        timeout: 30000,
        cwd: path.dirname(filePath),
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        this._postOutput('stdout', data.toString());
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const elapsed = Date.now() - startTime;
        if (stderr) {
          this._postOutput('error', stderr);
        }
        this._postOutput('info', `\nProcess exited with code ${code} (${elapsed}ms)`);
      });

      proc.on('error', (err) => {
        this._postOutput('error', `Failed to start NC engine: ${err.message}`);
      });
    });
  }

  _postOutput(kind, text) {
    if (this._view) {
      this._view.webview.postMessage({ type: 'output', kind, text });
    }
  }

  _getHtml(webview) {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NC IDE</title>
  <style>
    :root {
      --nc-accent: #0f766e;
      --nc-accent-light: #14b8a6;
      --nc-bg: var(--vscode-sideBar-background, #1e1e1e);
      --nc-fg: var(--vscode-sideBar-foreground, #cccccc);
      --nc-input-bg: var(--vscode-input-background, #2d2d2d);
      --nc-input-fg: var(--vscode-input-foreground, #cccccc);
      --nc-input-border: var(--vscode-input-border, #3e3e3e);
      --nc-button-bg: var(--vscode-button-background, #0f766e);
      --nc-button-fg: var(--vscode-button-foreground, #ffffff);
      --nc-border: var(--vscode-panel-border, #2d2d2d);
      --nc-error: #ef4444;
      --nc-info: #6b7280;
      --nc-badge-bg: var(--vscode-badge-background, #0f766e);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

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

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--nc-border);
      flex-shrink: 0;
    }

    .header-logo {
      width: 22px;
      height: 22px;
      background: var(--nc-accent);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 9px;
      letter-spacing: -0.5px;
    }

    .header-title {
      font-weight: 600;
      font-size: 13px;
      flex: 1;
    }

    .header-status {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 8px;
      background: var(--nc-badge-bg);
      color: white;
    }

    .header-status.offline {
      background: #6b7280;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: 4px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--nc-border);
      flex-shrink: 0;
    }

    .toolbar button {
      background: transparent;
      border: 1px solid var(--nc-input-border);
      color: var(--nc-fg);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s;
    }

    .toolbar button:hover {
      background: var(--nc-input-bg);
    }

    .toolbar button.primary {
      background: var(--nc-accent);
      border-color: var(--nc-accent);
      color: white;
    }

    .toolbar button.primary:hover {
      background: var(--nc-accent-light);
    }

    /* Output Area */
    .output-area {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
      font-family: var(--vscode-editor-font-family, 'Fira Code', 'Cascadia Code', monospace);
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .output-area::-webkit-scrollbar {
      width: 6px;
    }

    .output-area::-webkit-scrollbar-thumb {
      background: var(--nc-input-border);
      border-radius: 3px;
    }

    .output-entry {
      margin-bottom: 12px;
      border-radius: 6px;
      overflow: hidden;
    }

    .output-entry .entry-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--nc-input-bg);
      font-size: 11px;
      opacity: 0.8;
    }

    .output-entry .entry-header .prompt-icon {
      color: var(--nc-accent-light);
      font-weight: 700;
    }

    .output-entry .entry-input {
      padding: 8px 10px;
      background: var(--nc-input-bg);
      border-bottom: 1px solid var(--nc-border);
      color: var(--nc-accent-light);
    }

    .output-entry .entry-output {
      padding: 8px 10px;
    }

    .output-line {
      min-height: 1em;
    }

    .output-line.stdout {
      color: var(--nc-fg);
    }

    .output-line.error {
      color: var(--nc-error);
    }

    .output-line.info {
      color: var(--nc-info);
      font-style: italic;
      font-size: 11px;
    }

    .welcome {
      text-align: center;
      padding: 24px 16px;
      opacity: 0.7;
    }

    .welcome h2 {
      font-size: 16px;
      margin-bottom: 8px;
      color: var(--nc-accent-light);
    }

    .welcome p {
      font-size: 12px;
      line-height: 1.6;
      font-family: var(--vscode-font-family, system-ui);
    }

    .welcome kbd {
      display: inline-block;
      padding: 1px 5px;
      background: var(--nc-input-bg);
      border: 1px solid var(--nc-input-border);
      border-radius: 3px;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
    }

    /* Input Area */
    .input-area {
      border-top: 1px solid var(--nc-border);
      padding: 8px 12px;
      flex-shrink: 0;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: 11px;
      opacity: 0.6;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .input-label .chevron {
      color: var(--nc-accent-light);
      font-weight: 700;
    }

    textarea {
      width: 100%;
      min-height: 60px;
      max-height: 200px;
      resize: vertical;
      background: var(--nc-input-bg);
      color: var(--nc-input-fg);
      border: 1px solid var(--nc-input-border);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: var(--vscode-editor-font-family, 'Fira Code', 'Cascadia Code', monospace);
      font-size: 12px;
      line-height: 1.5;
      outline: none;
      transition: border-color 0.15s;
    }

    textarea:focus {
      border-color: var(--nc-accent);
    }

    textarea::placeholder {
      color: var(--nc-info);
    }

    .input-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .input-hint {
      font-size: 10px;
      opacity: 0.5;
    }

    .run-btn {
      background: var(--nc-accent);
      color: white;
      border: none;
      padding: 5px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s;
    }

    .run-btn:hover {
      background: var(--nc-accent-light);
    }

    .run-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .run-btn .play-icon {
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">NC</div>
    <span class="header-title">NC IDE</span>
    <span class="header-status" id="statusBadge">ready</span>
  </div>

  <div class="toolbar">
    <button class="primary" id="btnRunFile" title="Run the current .nc / .ncui file">
      ▶ Run File
    </button>
    <button id="btnClear" title="Clear output">
      ✕ Clear
    </button>
  </div>

  <div class="output-area" id="outputArea">
    <div class="welcome">
      <h2>Welcome to NC IDE</h2>
      <p>
        Write NC code below and press <kbd>Shift+Enter</kbd> to run.<br>
        Or click <strong>▶ Run File</strong> to execute the active .nc file.
      </p>
    </div>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <div class="input-label">
        <span class="chevron">❯</span> NC Console
      </div>
      <textarea
        id="codeInput"
        placeholder='Write NC code here... e.g.&#10;set name to "world"&#10;print "hello " + name'
        spellcheck="false"
      ></textarea>
      <div class="input-actions">
        <span class="input-hint">Shift+Enter to run</span>
        <button class="run-btn" id="btnRun">
          <span class="play-icon">▶</span> Run
        </button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const outputArea = document.getElementById('outputArea');
    const codeInput = document.getElementById('codeInput');
    const btnRun = document.getElementById('btnRun');
    const btnRunFile = document.getElementById('btnRunFile');
    const btnClear = document.getElementById('btnClear');
    const statusBadge = document.getElementById('statusBadge');

    let currentEntry = null;
    let isRunning = false;
    let welcomeShown = true;

    function setRunning(running) {
      isRunning = running;
      btnRun.disabled = running;
      btnRunFile.disabled = running;
      statusBadge.textContent = running ? 'running...' : 'ready';
      statusBadge.className = 'header-status' + (running ? '' : '');
    }

    function clearWelcome() {
      if (welcomeShown) {
        const welcomeEl = outputArea.querySelector('.welcome');
        if (welcomeEl) welcomeEl.remove();
        welcomeShown = false;
      }
    }

    function createEntry(code) {
      clearWelcome();
      const entry = document.createElement('div');
      entry.className = 'output-entry';

      const header = document.createElement('div');
      header.className = 'entry-header';
      header.innerHTML = '<span class="prompt-icon">❯</span> <span>' + new Date().toLocaleTimeString() + '</span>';
      entry.appendChild(header);

      const inputDiv = document.createElement('div');
      inputDiv.className = 'entry-input';
      inputDiv.textContent = code;
      entry.appendChild(inputDiv);

      const outputDiv = document.createElement('div');
      outputDiv.className = 'entry-output';
      entry.appendChild(outputDiv);

      outputArea.appendChild(entry);
      outputArea.scrollTop = outputArea.scrollHeight;

      return outputDiv;
    }

    function appendOutput(container, kind, text) {
      const line = document.createElement('div');
      line.className = 'output-line ' + kind;
      line.textContent = text;
      container.appendChild(line);
      outputArea.scrollTop = outputArea.scrollHeight;
    }

    // Run inline code
    function runCode() {
      const code = codeInput.value.trim();
      if (!code || isRunning) return;

      currentEntry = createEntry(code);
      setRunning(true);
      vscode.postMessage({ type: 'run', code: code });
      codeInput.value = '';
      codeInput.style.height = '60px';
    }

    // Run active file
    function runFile() {
      if (isRunning) return;
      clearWelcome();

      const entry = document.createElement('div');
      entry.className = 'output-entry';

      const header = document.createElement('div');
      header.className = 'entry-header';
      header.innerHTML = '<span class="prompt-icon">▶</span> <span>Run File — ' + new Date().toLocaleTimeString() + '</span>';
      entry.appendChild(header);

      const outputDiv = document.createElement('div');
      outputDiv.className = 'entry-output';
      entry.appendChild(outputDiv);

      outputArea.appendChild(entry);
      outputArea.scrollTop = outputArea.scrollHeight;

      currentEntry = outputDiv;
      setRunning(true);
      vscode.postMessage({ type: 'runFile' });
    }

    // Clear
    function clearOutput() {
      outputArea.innerHTML = '';
      welcomeShown = false;
      currentEntry = null;
      vscode.postMessage({ type: 'clear' });
    }

    // Event listeners
    btnRun.addEventListener('click', runCode);
    btnRunFile.addEventListener('click', runFile);
    btnClear.addEventListener('click', clearOutput);

    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        runCode();
      }
      // Tab inserts 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        codeInput.value = codeInput.value.substring(0, start) + '  ' + codeInput.value.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + 2;
      }
    });

    // Auto-resize textarea
    codeInput.addEventListener('input', () => {
      codeInput.style.height = '60px';
      codeInput.style.height = Math.min(codeInput.scrollHeight, 200) + 'px';
    });

    // Messages from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'output':
          if (currentEntry) {
            appendOutput(currentEntry, msg.kind, msg.text);
          }
          if (msg.kind === 'info' && msg.text.includes('Process exited')) {
            setRunning(false);
          }
          break;
        case 'history':
          // Restore history on load
          if (msg.data && msg.data.length) {
            clearWelcome();
            msg.data.forEach((h) => {
              const entry = createEntry(h.input);
              if (h.output) appendOutput(entry, 'stdout', h.output);
              if (h.error) appendOutput(entry, 'error', h.error);
              appendOutput(entry, 'info', 'Exited ' + h.exitCode + ' (' + h.time + 'ms)');
            });
          }
          break;
      }
    });

    // Request history on load
    vscode.postMessage({ type: 'getHistory' });

    // Focus input
    codeInput.focus();
  </script>
</body>
</html>`;
  }
}

module.exports = { NCChatProvider };
