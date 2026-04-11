/**
 * NC UI Compiler v1.1.0
 * A full-featured language compiler for NC UI markup.
 * Lexer → Parser → AST → Code Generator
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 * No external dependencies. Works in Node.js and browser.
 */

'use strict';

// ─── Icon SVGs ───────────────────────────────────────────────────────────────

const ICONS = {
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  design: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></svg>`,
  brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 4.5 17.5a2.5 2.5 0 0 1-.44-4.96A2.5 2.5 0 0 1 6.5 10a2.5 2.5 0 0 1 .44-4.96A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 19.5 17.5a2.5 2.5 0 0 0 .44-4.96A2.5 2.5 0 0 0 17.5 10a2.5 2.5 0 0 0-.44-4.96A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

// ─── Token Types ─────────────────────────────────────────────────────────────

const TT = {
  KEYWORD:    'KEYWORD',
  STRING:     'STRING',
  NUMBER:     'NUMBER',
  PERCENT:    'PERCENT',
  INDENT:     'INDENT',
  DEDENT:     'DEDENT',
  NEWLINE:    'NEWLINE',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR:   'OPERATOR',
  COLON:      'COLON',
  COMMA:      'COMMA',
  EOF:        'EOF',
};

const KEYWORDS = new Set([
  'app', 'page', 'version', 'description', 'theme', 'accent', 'font',
  'nav', 'section', 'footer', 'shell', 'sidebar', 'topbar', 'panel', 'banner',
  'heading', 'subheading', 'text', 'badge', 'stat', 'progress', 'alert', 'loading', 'markdown', 'external', 'stream', 'socket', 'graph', 'flow', 'drag', 'drop',
  'button', 'link', 'image', 'video',
  'row', 'column', 'spacer', 'divider',
  'grid', 'card', 'form', 'table', 'input', 'textarea', 'list', 'item',
  'modal', 'tab', 'tabs',
  'brand', 'links',
  'animate',
  'style', 'icon', 'to', 'required', 'type', 'action', 'method',
  'centered', 'fullscreen', 'with', 'on', 'columns',
  'state', 'computed', 'set', 'add', 'remove', 'toggle',
  'if', 'else', 'repeat', 'in',
  'component', 'use', 'slot',
  'routes', 'shows', 'guard', 'auth', 'public', 'publicly', 'require', 'requires', 'role', 'redirect', 'authenticated',
  'import', 'provider', 'service', 'endpoint', 'base', 'uses', 'from', 'lazy', 'channel', 'event', 'at', 'zone', 'title',
  'runs', 'click', 'change', 'submit', 'scroll', 'hover',
  'mount', 'load', 'server', 'fetch', 'get', 'post', 'put', 'patch', 'delete', 'reload', 'revalidate', 'save', 'response', 'as', 'validate', 'rows', 'pattern', 'message', 'run',
  'min-length', 'max-length', 'strong-password', 'url', 'email',
  'delay', 'duration', 'gap', 'dismissible', 'spinner', 'skeleton', 'error', 'unauthorized',
  'desktop', 'tablet', 'mobile',
  'bind', 'placeholder', 'onSubmit', 'onClick', 'linksTo',
  'login', 'logout', 'refresh', 'endpoint', 'navigate', 'store', 'success',
  'is', 'true', 'false',
]);

// ─── Lexer ───────────────────────────────────────────────────────────────────

class Lexer {
  constructor(source) {
    this._source = source;
    this._lines = source.split('\n');
    this._tokens = [];
    this._line = 0;
    this._col = 0;
    this._indentStack = [0];
  }

  tokenize() {
    for (let i = 0; i < this._lines.length; i++) {
      this._line = i + 1;
      const raw = this._lines[i];
      const stripped = raw.replace(/\t/g, '    ');

      // Skip empty lines and comments
      const trimmed = stripped.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        this._tokens.push(this._tok(TT.NEWLINE, '\n'));
        continue;
      }

      // Compute indent
      const indentLen = stripped.length - stripped.trimStart().length;
      const currentIndent = this._indentStack[this._indentStack.length - 1];

      if (indentLen > currentIndent) {
        this._indentStack.push(indentLen);
        this._tokens.push(this._tok(TT.INDENT, indentLen));
      } else if (indentLen < currentIndent) {
        while (this._indentStack.length > 1 &&
               this._indentStack[this._indentStack.length - 1] > indentLen) {
          this._indentStack.pop();
          this._tokens.push(this._tok(TT.DEDENT, indentLen));
        }
      }

      // Tokenize the line content
      this._tokenizeLine(trimmed);
      this._tokens.push(this._tok(TT.NEWLINE, '\n'));
    }

    // Emit remaining DEDENTs
    while (this._indentStack.length > 1) {
      this._indentStack.pop();
      this._tokens.push(this._tok(TT.DEDENT, 0));
    }

    this._tokens.push(this._tok(TT.EOF, ''));
    return this._tokens;
  }

  _tok(type, value) {
    return { type, value, line: this._line, col: this._col };
  }

  _tokenizeLine(line) {
    let pos = 0;
    while (pos < line.length) {
      // Skip whitespace within line
      if (line[pos] === ' ') { pos++; this._col++; continue; }

      // Colon at end of line (block opener)
      if (line[pos] === ':' && pos === line.length - 1) {
        this._tokens.push(this._tok(TT.COLON, ':'));
        pos++;
        continue;
      }

      // Colon followed by space (inline)
      if (line[pos] === ':' && pos < line.length - 1 && line[pos + 1] === ' ') {
        this._tokens.push(this._tok(TT.COLON, ':'));
        pos++;
        continue;
      }

      // Comma
      if (line[pos] === ',') {
        this._tokens.push(this._tok(TT.COMMA, ','));
        pos++;
        continue;
      }

      // String
      if (line[pos] === '"') {
        let str = '';
        pos++; // skip opening quote
        while (pos < line.length && line[pos] !== '"') {
          if (line[pos] === '\\' && pos + 1 < line.length) {
            str += line[pos + 1];
            pos += 2;
          } else {
            str += line[pos];
            pos++;
          }
        }
        pos++; // skip closing quote
        this._tokens.push(this._tok(TT.STRING, str));
        continue;
      }

      // Number with percent
      const pctMatch = line.slice(pos).match(/^(\d+)%/);
      if (pctMatch) {
        this._tokens.push(this._tok(TT.PERCENT, parseInt(pctMatch[1])));
        pos += pctMatch[0].length;
        continue;
      }

      // Number
      const numMatch = line.slice(pos).match(/^(\d+(\.\d+)?)/);
      if (numMatch && (pos === 0 || line[pos - 1] === ' ')) {
        // Only if not part of an identifier
        const after = line[pos + numMatch[0].length];
        if (!after || after === ' ' || after === ':' || after === ',' || after === '%') {
          this._tokens.push(this._tok(TT.NUMBER, parseFloat(numMatch[1])));
          pos += numMatch[0].length;
          continue;
        }
      }

      // Operators
      if ('+-*/=<>!'.includes(line[pos])) {
        this._tokens.push(this._tok(TT.OPERATOR, line[pos]));
        pos++;
        continue;
      }

      // Identifier / Keyword
      const idMatch = line.slice(pos).match(/^[a-zA-Z_][\w.-]*/);
      if (idMatch) {
        const word = idMatch[0];
        const type = KEYWORDS.has(word) ? TT.KEYWORD : TT.IDENTIFIER;
        this._tokens.push(this._tok(type, word));
        pos += word.length;
        continue;
      }

      // Skip unrecognized characters
      pos++;
    }
  }
}

// ─── AST Node Types ──────────────────────────────────────────────────────────

function Node(type, props) {
  const node = { type: type };
  if (props) {
    for (const k in props) node[k] = props[k];
  }
  if (!node.children) node.children = [];
  return node;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

class Parser {
  constructor(tokens) {
    this._tokens = tokens;
    this._pos = 0;
    this._ast = Node('Document', {
      meta: {},
      components: [],
      routes: [],
      states: [],
      stores: [],
      computeds: [],
      guards: [],
      providers: [],
      services: [],
      auth: null,
      lifecycle: { mount: [], server: [] },
      actions: [],
      imports: [],
      children: []
    });
  }

  parse() {
    while (!this._isEOF()) {
      this._skipNewlines();
      if (this._isEOF()) break;
      this._parseTopLevel();
    }
    return this._ast;
  }

  // ─── Token helpers ────────────────────────────────────────────────────────

  _current() { return this._tokens[this._pos] || { type: TT.EOF, value: '' }; }
  _peek(offset) { return this._tokens[this._pos + (offset || 1)] || { type: TT.EOF, value: '' }; }
  _isEOF() { return this._current().type === TT.EOF; }

  _advance() {
    const t = this._current();
    this._pos++;
    return t;
  }

  _expect(type, value) {
    const t = this._current();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SyntaxError(
        `NC UI: Expected ${type}${value !== undefined ? ' "' + value + '"' : ''} but got ${t.type} "${t.value}" at line ${t.line}`
      );
    }
    return this._advance();
  }

  _match(type, value) {
    const t = this._current();
    if (t.type === type && (value === undefined || t.value === value)) {
      this._advance();
      return t;
    }
    return null;
  }

  _check(type, value) {
    const t = this._current();
    return t.type === type && (value === undefined || t.value === value);
  }

  _skipNewlines() {
    while (this._check(TT.NEWLINE)) this._advance();
  }

  _matchKeyword(val) { return this._match(TT.KEYWORD, val); }
  _checkKeyword(val) { return this._check(TT.KEYWORD, val); }

  _expectString() {
    const t = this._current();
    if (t.type === TT.STRING) return this._advance().value;
    // Allow unquoted identifiers as fallback
    if (t.type === TT.IDENTIFIER || t.type === TT.KEYWORD) return this._advance().value;
    throw new SyntaxError(`NC UI: Expected string at line ${t.line}, got ${t.type} "${t.value}"`);
  }

  _collectRestAsText() {
    // Collect remaining tokens on this line as text (for backward compat with unquoted text)
    let text = '';
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF()) {
      const t = this._advance();
      text += (text ? ' ' : '') + String(t.value);
    }
    return text;
  }

  _collectUntilKeywords(stopKeywords) {
    const parts = [];
    while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
      const cur = this._current();
      if (cur.type === TT.KEYWORD && stopKeywords.includes(cur.value)) break;
      parts.push(String(this._advance().value));
    }
    return parts.join(' ').trim();
  }

  // ─── Top-level parsing ────────────────────────────────────────────────────

  _parseTopLevel() {
    const t = this._current();

    if (t.type === TT.KEYWORD) {
      switch (t.value) {
        case 'app':     return this._parseMetaProp('appName');
        case 'page':    return this._parsePage();
        case 'version': return this._parseMetaProp('version');
        case 'description': return this._parseMetaProp('description');
        case 'theme':   return this._parseMetaProp('theme');
        case 'accent':  return this._parseMetaProp('accent');
        case 'font':    return this._parseMetaProp('font');
        case 'shell':   return this._parseShell();
        case 'nav':     return this._parseNav();
        case 'section': return this._parseSection();
        case 'footer':  return this._parseFooter();
        case 'state':   return this._parseState();
        case 'store':   return this._parseStore();
        case 'computed': return this._parseComputed();
        case 'guard':   return this._parseGuard();
        case 'provider': return this._parseProvider();
        case 'service': return this._parseService();
        case 'auth':    return this._parseAuth();
        case 'on':      return this._parseLifecycle();
        case 'action':  return this._parseAction();
        case 'routes':  return this._parseRoutes();
        case 'component': return this._parseComponent();
        case 'import':  return this._parseImport();
        default:
          // Try parsing as a generic node
          this._ast.children.push(this._parseNode());
          return;
      }
    }

    // Skip unrecognized tokens
    this._advance();
  }

  // ─── Meta parsing ─────────────────────────────────────────────────────────

  _parsePage() {
    this._advance(); // 'page'
    this._ast.meta.title = this._expectString();
    if (!this._ast.meta.appName) this._ast.meta.appName = this._ast.meta.title;
    this._consumeToNewline();
  }

  _parseMetaProp(name) {
    this._advance(); // keyword
    this._ast.meta[name] = this._expectString();
    this._consumeToNewline();
  }

  _consumeToNewline() {
    while (!this._check(TT.NEWLINE) && !this._isEOF()) this._advance();
    this._skipNewlines();
  }

  // ─── Nav ──────────────────────────────────────────────────────────────────

  _parseNav() {
    this._advance(); // 'nav'
    const node = Node('Nav', { style: null });

    // Check for style
    if (this._matchKeyword('style')) {
      node.style = this._expectString();
    }

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }

    this._ast.children.push(node);
  }

  _parseShell() {
    this._advance(); // 'shell'
    const node = Node('Shell');
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    this._ast.children.push(node);
  }

  // ─── Section ──────────────────────────────────────────────────────────────

  _parseSection() {
    this._advance(); // 'section'
    const node = Node('Section', { id: null, modifiers: [], props: {}, animations: [] });

    // Parse section name/id and modifiers
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
      node.id = this._advance().value;
    }

    // Parse modifiers (centered, fullscreen, etc.)
    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      if (this._checkKeyword('centered') || this._checkKeyword('fullscreen')) {
        node.modifiers.push(this._advance().value);
      } else if (this._matchKeyword('with')) {
        // with image "..."
        if (this._matchKeyword('image')) {
          node.props.backgroundImage = this._expectString();
        }
      } else {
        // Unknown modifier, treat as modifier
        const mod = this._advance();
        if (mod.type === TT.IDENTIFIER || mod.type === TT.KEYWORD) {
          node.modifiers.push(mod.value);
        }
      }
    }

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }

    this._ast.children.push(node);
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  _parseFooter() {
    this._advance(); // 'footer'
    const node = Node('Footer');
    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }

    this._ast.children.push(node);
  }

  // ─── State ────────────────────────────────────────────────────────────────

  _parseState() {
    this._advance(); // 'state'
    const name = this._advance().value; // identifier
    this._matchKeyword('is');
    const value = this._parseValue();
    this._ast.states.push(Node('State', { name, initial: value, children: undefined }));
    this._consumeToNewline();
  }

  _parseStore() {
    this._advance(); // 'store'
    const name = this._advance().value; // identifier
    this._matchKeyword('is');
    const value = this._parseValue();
    this._ast.stores.push(Node('Store', { name, initial: value, children: undefined }));
    this._consumeToNewline();
  }

  _parseComputed() {
    this._advance(); // 'computed'

    if (this._check(TT.COLON)) {
      this._advance();
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        while (!this._check(TT.DEDENT) && !this._isEOF()) {
          this._skipNewlines();
          if (this._check(TT.DEDENT) || this._isEOF()) break;
          const nameTok = this._advance();
          const name = nameTok.value;
          this._matchKeyword('is');
          const expr = this._collectRestAsText();
          this._ast.computeds.push(Node('Computed', { name, expr, children: undefined }));
          this._skipNewlines();
        }
        this._match(TT.DEDENT);
      }
      return;
    }

    const name = this._advance().value;
    this._matchKeyword('is');
    const expr = this._collectRestAsText();
    this._ast.computeds.push(Node('Computed', { name, expr, children: undefined }));
    this._skipNewlines();
  }

  _parseGuard() {
    this._advance(); // 'guard'
    const name = this._expectString();
    const guard = Node('Guard', {
      name,
      requireAuth: false,
      requireRole: null,
      redirect: null,
      children: undefined
    });

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;

        if (this._matchKeyword('require')) {
          if (this._matchKeyword('authenticated') || this._matchKeyword('auth')) {
            guard.requireAuth = true;
          } else if (this._matchKeyword('role')) {
            guard.requireRole = this._expectString();
          }
          this._consumeToNewline();
          continue;
        }

        if (this._matchKeyword('redirect')) {
          this._matchKeyword('to');
          guard.redirect = this._expectString();
          this._consumeToNewline();
          continue;
        }

        this._consumeToNewline();
      }
      this._match(TT.DEDENT);
    }

    this._ast.guards.push(guard);
  }

  _parseProvider() {
    this._advance(); // 'provider'
    const provider = Node('Provider', {
      name: this._expectString(),
      config: {},
      children: undefined
    });

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;
        const parts = [];
        while (!this._checkKeyword('is') && !this._check(TT.NEWLINE) && !this._isEOF()) {
          parts.push(String(this._advance().value));
        }
        this._matchKeyword('is');
        const key = parts.join(' ').trim();
        provider.config[key] = this._parseValue();
        this._consumeToNewline();
      }
      this._match(TT.DEDENT);
    }

    this._ast.providers.push(provider);
  }

  _parseService() {
    this._advance(); // 'service'
    const service = Node('Service', {
      name: this._expectString(),
      base: '',
      timeout: 15000,
      endpoints: [],
      children: undefined
    });

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;

        if (this._matchKeyword('base')) {
          this._matchKeyword('is');
          service.base = this._parseValue();
          this._consumeToNewline();
          continue;
        }

        if (this._matchKeyword('timeout')) {
          this._matchKeyword('is');
          service.timeout = this._parseValue();
          this._consumeToNewline();
          continue;
        }

        if (this._matchKeyword('endpoint')) {
          const endpoint = { name: this._expectString(), method: 'GET', path: '/' };
          this._matchKeyword('uses');
          endpoint.method = String(this._advance().value).toUpperCase();
          endpoint.path = this._expectString();
          service.endpoints.push(endpoint);
          this._consumeToNewline();
          continue;
        }

        this._consumeToNewline();
      }
      this._match(TT.DEDENT);
    }

    this._ast.services.push(service);
  }

  _parseAuth() {
    this._advance(); // 'auth'
    const auth = this._ast.auth || {};

    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;

        const parts = [];
        while (!this._checkKeyword('is') && !this._check(TT.NEWLINE) && !this._isEOF()) {
          parts.push(String(this._advance().value));
        }
        this._matchKeyword('is');
        const key = parts.join(' ').trim();
        auth[key] = this._parseValue();
        this._consumeToNewline();
      }
      this._match(TT.DEDENT);
    }

    this._ast.auth = auth;
  }

  _parseValue() {
    const t = this._current();
    if (t.type === TT.STRING) { this._advance(); return t.value; }
    if (t.type === TT.NUMBER) { this._advance(); return t.value; }
    if (t.type === TT.KEYWORD && t.value === 'true') { this._advance(); return true; }
    if (t.type === TT.KEYWORD && t.value === 'false') { this._advance(); return false; }
    // Array literal []
    if (t.type === TT.OPERATOR && t.value === '[') {
      this._advance(); // skip [
      // For now, only support empty arrays — will be skipped until ]
      // Could extend for simple literals
      const items = [];
      // Skip to closing ]
      // Very simplified — handles [] only for now
      while (!this._isEOF()) {
        const cur = this._current();
        if (cur.type === TT.OPERATOR && cur.value === ']') { this._advance(); break; }
        // Skip anything else
        this._advance();
      }
      return items;
    }
    if (t.type === TT.OPERATOR && t.value === '{') {
      this._advance(); // skip {
      while (!this._isEOF()) {
        const cur = this._current();
        if (cur.type === TT.OPERATOR && cur.value === '}') { this._advance(); break; }
        this._advance();
      }
      return {};
    }
    // Fallback — read as identifier
    if (t.type === TT.IDENTIFIER || t.type === TT.KEYWORD) { this._advance(); return t.value; }
    return null;
  }

  _parseLifecycle() {
    this._advance(); // 'on'
    let hook = null;
    if (this._matchKeyword('server')) {
      this._matchKeyword('load');
      hook = 'server';
    } else if (this._matchKeyword('mount') || this._matchKeyword('load')) {
      hook = 'mount';
    }
    if (!hook) {
      this._consumeToNewline();
      return;
    }

    const body = [];
    if (this._matchKeyword('runs')) {
      body.push({ type: 'run', action: this._advance().value });
      this._consumeToNewline();
    } else {
      this._match(TT.COLON);
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        while (!this._check(TT.DEDENT) && !this._isEOF()) {
          this._skipNewlines();
          if (this._check(TT.DEDENT) || this._isEOF()) break;
          body.push(this._parseStatement());
        }
        this._match(TT.DEDENT);
      }
    }

    this._ast.lifecycle[hook].push(...body);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  _parseAction() {
    this._advance(); // 'action'
    const name = this._advance().value;
    let param = null;

    if (this._matchKeyword('with')) {
      param = this._advance().value;
    }

    this._match(TT.COLON);
    this._skipNewlines();

    // Parse action body as a list of statements
    const body = [];
    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;
        body.push(this._parseStatement());
      }
      this._match(TT.DEDENT);
    }

    this._ast.actions.push(Node('Action', { name, param, body, children: undefined }));
  }

  _parseStatement() {
    const t = this._current();

    if (t.type === TT.KEYWORD && t.value === 'set') {
      this._advance();
      const target = this._advance().value;
      this._matchKeyword('to');
      // Collect expression as text
      const expr = this._collectRestAsText();
      this._skipNewlines();
      return { type: 'set', target, expr };
    }

    if (t.type === TT.KEYWORD && t.value === 'add') {
      this._advance();
      const item = this._advance().value;
      this._matchKeyword('to');
      const target = this._advance().value;
      this._skipNewlines();
      return { type: 'add', item, target };
    }

    if (t.type === TT.KEYWORD && t.value === 'remove') {
      this._advance();
      const item = this._advance().value;
      this._advance(); // skip "from"
      const target = this._advance().value;
      this._skipNewlines();
      return { type: 'remove', item, target };
    }

    if (t.type === TT.KEYWORD && t.value === 'toggle') {
      this._advance();
      const target = this._advance().value;
      this._skipNewlines();
      return { type: 'toggle', target };
    }

    if (t.type === TT.KEYWORD && t.value === 'run') {
      this._advance();
      const action = this._advance().value;
      this._skipNewlines();
      return { type: 'run', action };
    }

    if (t.type === TT.KEYWORD && t.value === 'redirect') {
      this._advance();
      this._matchKeyword('to');
      const path = this._expectString();
      this._skipNewlines();
      return { type: 'redirect', path };
    }

    if (t.type === TT.KEYWORD && t.value === 'fetch') {
      this._advance();
      const url = this._expectString();
      const stmt = { type: 'fetch', url, method: 'GET', withAuth: false, saveAs: null, redirect: null };
      while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
        if (this._matchKeyword('method')) {
          stmt.method = this._expectString().toUpperCase();
        } else if (this._matchKeyword('with')) {
          if (this._matchKeyword('auth') || this._matchKeyword('authenticated')) {
            stmt.withAuth = true;
          }
        } else if (this._matchKeyword('save')) {
          this._matchKeyword('response');
          this._matchKeyword('as');
          stmt.saveAs = this._advance().value;
        } else if (this._matchKeyword('redirect')) {
          this._matchKeyword('to');
          stmt.redirect = this._expectString();
        } else {
          this._advance();
        }
      }
      this._skipNewlines();
      return stmt;
    }

    if (t.type === TT.KEYWORD && ['get', 'post', 'put', 'patch', 'delete'].includes(t.value)) {
      const method = String(this._advance().value).toUpperCase();
      const url = this._expectString();
      const stmt = {
        type: 'request',
        method,
        url,
        withAuth: false,
        bodyExpr: null,
        saveAs: null,
        redirect: null
      };
      while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
        if (this._matchKeyword('with')) {
          if (this._matchKeyword('auth') || this._matchKeyword('authenticated')) {
            stmt.withAuth = true;
          } else {
            stmt.bodyExpr = this._collectUntilKeywords(['save', 'redirect']);
          }
        } else if (this._matchKeyword('save')) {
          this._matchKeyword('response');
          this._matchKeyword('as');
          stmt.saveAs = this._advance().value;
        } else if (this._matchKeyword('redirect')) {
          this._matchKeyword('to');
          stmt.redirect = this._expectString();
        } else {
          this._advance();
        }
      }
      this._skipNewlines();
      return stmt;
    }

    if (t.type === TT.KEYWORD && t.value === 'reload') {
      this._advance();
      const target = this._advance().value;
      this._skipNewlines();
      return { type: 'reload', target };
    }

    if (t.type === TT.KEYWORD && t.value === 'revalidate') {
      this._advance();
      const path = this._expectString();
      this._skipNewlines();
      return { type: 'revalidate', path };
    }

    // Skip unknown
    this._advance();
    this._skipNewlines();
    return { type: 'unknown' };
  }

  // ─── Routes ───────────────────────────────────────────────────────────────

  _parseRoutes() {
    this._advance(); // 'routes'
    this._match(TT.COLON);
    this._skipNewlines();

    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;
        // "path" shows componentName
        const path = this._expectString();
        this._matchKeyword('shows');
        const comp = this._advance().value;
        const route = Node('Route', {
          path,
          component: comp,
          public: false,
          requireAuth: false,
          requireRole: null,
          guard: null,
          redirect: null,
          lazy: false,
          errorComponent: null,
          unauthorizedComponent: null,
          loadingComponent: null,
          children: undefined
        });
        while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
          if (this._matchKeyword('public') || this._matchKeyword('publicly')) {
            route.public = true;
          } else if (this._matchKeyword('require') || this._matchKeyword('requires')) {
            if (this._matchKeyword('auth') || this._matchKeyword('authenticated')) {
              route.requireAuth = true;
            } else if (this._matchKeyword('role')) {
              route.requireRole = this._expectString();
            }
          } else if (this._matchKeyword('guard')) {
            route.guard = this._expectString();
          } else if (this._matchKeyword('redirect')) {
            this._matchKeyword('to');
            route.redirect = this._expectString();
          } else if (this._matchKeyword('lazy')) {
            route.lazy = true;
          } else if (this._matchKeyword('error')) {
            this._matchKeyword('shows');
            route.errorComponent = this._advance().value;
          } else if (this._matchKeyword('unauthorized')) {
            this._matchKeyword('shows');
            route.unauthorizedComponent = this._advance().value;
          } else if (this._matchKeyword('loading')) {
            this._matchKeyword('shows');
            route.loadingComponent = this._advance().value;
          } else {
            this._advance();
          }
        }
        this._ast.routes.push(route);
        this._skipNewlines();
      }
      this._match(TT.DEDENT);
    }
  }

  // ─── Components ───────────────────────────────────────────────────────────

  _parseComponent() {
    this._advance(); // 'component'
    const name = this._advance().value;
    let props = [];

    if (this._matchKeyword('with')) {
      while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
        if (this._match(TT.COMMA)) continue;
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          props.push(this._advance().value);
          continue;
        }
        this._advance();
      }
    }

    this._match(TT.COLON);
    this._skipNewlines();

    const children = [];
    if (this._match(TT.INDENT)) {
      children.push(...this._parseBlock());
    }

    this._ast.components.push(Node('Component', { name, props, children }));
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  _parseImport() {
    this._advance(); // 'import'
    const file = this._expectString();
    this._ast.imports.push(Node('Import', { file, children: undefined }));
    this._consumeToNewline();
  }

  // ─── Block parsing (indented children) ─────────────────────────────────────

  _parseBlock() {
    const children = [];
    while (!this._check(TT.DEDENT) && !this._isEOF()) {
      this._skipNewlines();
      if (this._check(TT.DEDENT) || this._isEOF()) break;
      children.push(this._parseNode());
    }
    this._match(TT.DEDENT);
    return children;
  }

  // ─── Node parsing ─────────────────────────────────────────────────────────

  _parseNode() {
    const t = this._current();

    if (t.type === TT.KEYWORD) {
      switch (t.value) {
        case 'heading':    return this._parseHeading();
        case 'subheading': return this._parseTextNode('Subheading');
        case 'text':       return this._parseTextNode('Text');
        case 'badge':      return this._parseTextNode('Badge');
        case 'shell':      return this._parseShellInline();
        case 'sidebar':    return this._parseSimpleBlock('Sidebar');
        case 'topbar':     return this._parseSimpleBlock('Topbar');
        case 'panel':      return this._parsePanel();
        case 'banner':     return this._parseBanner();
        case 'alert':      return this._parseAlert();
        case 'loading':    return this._parseLoading();
        case 'markdown':   return this._parseMarkdown();
        case 'external':   return this._parseExternal();
        case 'stream':     return this._parseStream();
        case 'socket':     return this._parseSocket();
        case 'graph':      return this._parseGraph();
        case 'flow':       return this._parseFlow();
        case 'drag':       return this._parseDrag();
        case 'drop':       return this._parseDrop();
        case 'button':     return this._parseButton();
        case 'link':       return this._parseLink();
        case 'image':      return this._parseImage();
        case 'video':      return this._parseVideo();
        case 'row':        return this._parseContainer('Row');
        case 'column':     return this._parseContainer('Column');
        case 'spacer':     return this._parseSpacer();
        case 'divider':    return this._parseDivider();
        case 'grid':       return this._parseGrid();
        case 'card':       return this._parseCard();
        case 'form':       return this._parseForm();
        case 'table':      return this._parseTable();
        case 'input':      return this._parseInput();
        case 'textarea':   return this._parseTextarea();
        case 'list':       return this._parseContainer('List');
        case 'item':       return this._parseItem();
        case 'brand':      return this._parseBrand();
        case 'links':      return this._parseContainer('Links');
        case 'stat':       return this._parseStat();
        case 'progress':   return this._parseProgress();
        case 'animate':    return this._parseAnimate();
        case 'modal':      return this._parseModal();
        case 'tab':        return this._parseTab();
        case 'tabs':       return this._parseTabs();
        case 'if':         return this._parseIf();
        case 'repeat':     return this._parseRepeat();
        case 'use':        return this._parseUse();
        case 'slot':       return this._parseSlot();
        case 'section':    return this._parseSectionInline();
        case 'nav':        return this._parseNavInline();
        case 'footer':     return this._parseFooterInline();
        case 'state':      { this._parseState(); return Node('Noop', { children: undefined }); }
        case 'store':      { this._parseStore(); return Node('Noop', { children: undefined }); }
        case 'computed':   { this._parseComputed(); return Node('Noop', { children: undefined }); }
        case 'action':     { this._parseAction(); return Node('Noop', { children: undefined }); }
        default: break;
      }
    }

    // Fallback: skip
    this._advance();
    while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
      this._advance();
    }
    this._skipNewlines();
    return Node('Unknown', { raw: t.value, children: undefined });
  }

  // ─── Individual node parsers ──────────────────────────────────────────────

  _parseHeading() {
    this._advance(); // 'heading'
    const node = Node('Heading', { text: null, style: null });
    if (this._check(TT.STRING)) node.text = this._advance().value;
    if (this._matchKeyword('style')) {
      node.style = this._expectString();
    }
    this._consumeToNewline();
    return node;
  }

  _parseTextNode(type) {
    this._advance(); // keyword
    const node = Node(type, { text: null });
    if (this._check(TT.STRING)) node.text = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseButton() {
    this._advance(); // 'button'
    const node = Node('Button', { text: null, style: null, href: null, onClick: null });

    if (this._check(TT.STRING)) node.text = this._advance().value;

    // Parse remaining modifiers
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() &&
           !this._check(TT.INDENT) && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('links') || this._matchKeyword('linksTo')) {
        this._matchKeyword('to'); // optional
        if (this._check(TT.STRING)) node.href = this._advance().value;
      } else if (this._matchKeyword('style')) {
        if (this._check(TT.STRING)) node.style = this._advance().value;
      } else if (this._matchKeyword('on')) {
        this._matchKeyword('click');
        this._matchKeyword('runs');
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onClick = this._advance().value;
        }
      } else if (this._matchKeyword('onClick')) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onClick = this._advance().value;
        }
      } else {
        this._advance();
      }
    }

    this._consumeToNewline();
    return node;
  }

  _parseAlert() {
    this._advance(); // 'alert'
    const node = Node('Alert', {
      text: null,
      variant: 'info',
      dismissible: false,
      children: undefined
    });

    if (this._check(TT.STRING)) node.text = this._advance().value;

    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('type')) {
        node.variant = this._expectString();
      } else if (this._matchKeyword('dismissible')) {
        node.dismissible = true;
      } else {
        this._advance();
      }
    }

    if (this._match(TT.COLON)) {
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.children = this._parseBlock();
      }
      return node;
    }

    this._consumeToNewline();
    return node;
  }

  _parseLoading() {
    this._advance(); // 'loading'
    const node = Node('Loading', {
      kind: 'spinner',
      size: 'medium',
      rows: 3,
      text: null,
      children: undefined
    });

    if (this._matchKeyword('spinner')) {
      node.kind = 'spinner';
    } else if (this._matchKeyword('skeleton')) {
      node.kind = 'skeleton';
      if (this._matchKeyword('rows') && this._check(TT.NUMBER)) {
        node.rows = this._advance().value;
      }
    }

    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('size')) {
        node.size = this._expectString();
      } else if (this._check(TT.STRING) && !node.text) {
        node.text = this._advance().value;
      } else {
        this._advance();
      }
    }

    if (this._match(TT.COLON)) {
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.children = this._parseBlock();
      }
      return node;
    }

    this._consumeToNewline();
    return node;
  }

  _parseMarkdown() {
    this._advance(); // 'markdown'
    const node = Node('Markdown', { source: null, children: undefined });
    if (this._check(TT.STRING)) node.source = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseExternal() {
    this._advance(); // 'external'
    const node = Node('External', { name: null, props: {}, children: undefined });
    node.name = this._expectString();
    if (this._matchKeyword('with')) {
      while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          const key = this._advance().value;
          if (this._check(TT.OPERATOR) && this._current().value === '=') this._advance();
          if (this._check(TT.STRING) || this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.NUMBER)) {
            node.props[key] = this._advance().value;
          }
        } else {
          this._advance();
        }
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseStream() {
    this._advance(); // 'stream'
    const node = Node('Stream', { url: this._expectString(), saveAs: null, withAuth: false, event: 'message', children: undefined });
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('save')) {
        this._matchKeyword('as');
        node.saveAs = this._advance().value;
      } else if (this._matchKeyword('with')) {
        if (this._matchKeyword('auth') || this._matchKeyword('authenticated')) node.withAuth = true;
      } else if (this._matchKeyword('event')) {
        node.event = this._expectString();
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseSocket() {
    this._advance(); // 'socket'
    const node = Node('Socket', { url: this._expectString(), saveAs: null, channel: null, children: undefined });
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('save')) {
        this._matchKeyword('as');
        node.saveAs = this._advance().value;
      } else if (this._matchKeyword('channel')) {
        node.channel = this._expectString();
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseGraph() {
    this._advance(); // 'graph'
    const node = Node('Graph', { kind: this._expectString(), source: null, children: undefined });
    if (this._matchKeyword('from')) {
      if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.STRING)) {
        node.source = this._advance().value;
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseFlow() {
    this._advance(); // 'flow'
    const node = Node('Flow', { kind: this._expectString(), source: null, children: undefined });
    if (this._matchKeyword('from')) {
      if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.STRING)) {
        node.source = this._advance().value;
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseDrag() {
    this._advance(); // 'drag'
    const node = Node('DragList', { source: null, title: null, children: undefined });
    if (this._matchKeyword('list')) {
      // optional syntax sugar
    }
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.STRING)) {
      node.source = this._advance().value;
    }
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('title')) {
        node.title = this._expectString();
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseDrop() {
    this._advance(); // 'drop'
    const node = Node('DropZone', { target: null, title: null, children: undefined });
    this._matchKeyword('zone');
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.STRING)) {
      node.target = this._advance().value;
    }
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('title')) {
        node.title = this._expectString();
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseLink() {
    this._advance(); // 'link'
    const node = Node('Link', { text: null, href: null, children: undefined });
    if (this._check(TT.STRING)) node.text = this._advance().value;

    while (!this._check(TT.NEWLINE) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('to')) {
        if (this._check(TT.STRING)) node.href = this._advance().value;
      } else {
        this._advance();
      }
    }

    this._consumeToNewline();
    return node;
  }

  _parseImage() {
    this._advance(); // 'image'
    const node = Node('Image', { src: null, style: null, alt: null, children: undefined });
    if (this._check(TT.STRING)) node.src = this._advance().value;
    while (!this._check(TT.NEWLINE) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('style')) {
        if (this._check(TT.STRING)) node.style = this._advance().value;
      } else if (this._matchKeyword('alt')) {
        if (this._check(TT.STRING)) node.alt = this._advance().value;
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    return node;
  }

  _parseVideo() {
    this._advance(); // 'video'
    const node = Node('Video', { src: null, children: undefined });
    if (this._check(TT.STRING)) node.src = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseContainer(type) {
    this._advance(); // keyword
    const node = Node(type);
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseSpacer() {
    this._advance(); // 'spacer'
    this._consumeToNewline();
    return Node('Spacer', { children: undefined });
  }

  _parseDivider() {
    this._advance(); // 'divider'
    this._consumeToNewline();
    return Node('Divider', { children: undefined });
  }

  _parseGrid() {
    this._advance(); // 'grid'
    const node = Node('Grid', { columns: 3, responsive: null });

    // Parse columns count
    if (this._check(TT.NUMBER)) {
      node.columns = this._advance().value;
    }
    this._matchKeyword('columns');

    // Parse responsive modifiers: "on desktop, 2 on tablet, 1 on mobile"
    if (this._matchKeyword('on')) {
      const responsive = {};
      responsive.desktop = node.columns;
      const firstDevice = this._advance().value; // desktop/tablet/mobile
      responsive[firstDevice] = node.columns;

      while (this._match(TT.COMMA)) {
        if (this._check(TT.NUMBER)) {
          const cols = this._advance().value;
          this._matchKeyword('on');
          if (this._check(TT.KEYWORD) || this._check(TT.IDENTIFIER)) {
            responsive[this._advance().value] = cols;
          }
        }
      }
      node.responsive = responsive;
    }

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseCard() {
    this._advance(); // 'card'
    const node = Node('Card', { icon: null, clickable: false });

    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      if (this._matchKeyword('icon')) {
        if (this._check(TT.STRING)) node.icon = this._advance().value;
      } else if (this._matchKeyword('clickable')) {
        node.clickable = true;
      } else {
        this._advance();
      }
    }

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseForm() {
    this._advance(); // 'form'
    const node = Node('Form', {
      action: '#',
      method: 'POST',
      onSubmit: null,
      validation: null,
      withAuth: false,
      saveResponseAs: null,
      redirectTo: null
    });

    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      if (this._matchKeyword('action')) {
        if (this._check(TT.STRING)) node.action = this._advance().value;
      } else if (this._matchKeyword('method')) {
        if (this._check(TT.STRING)) node.method = this._advance().value;
      } else if (this._matchKeyword('with')) {
        if (this._matchKeyword('auth') || this._matchKeyword('authenticated')) {
          node.withAuth = true;
        }
      } else if (this._matchKeyword('save')) {
        this._matchKeyword('response');
        this._matchKeyword('as');
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.saveResponseAs = this._advance().value;
        }
      } else if (this._matchKeyword('redirect')) {
        this._matchKeyword('to');
        node.redirectTo = this._expectString();
      } else if (this._matchKeyword('onSubmit')) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onSubmit = this._advance().value;
        }
      } else if (this._matchKeyword('on')) {
        this._matchKeyword('submit');
        this._matchKeyword('runs');
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onSubmit = this._advance().value;
        }
      } else {
        this._advance();
      }
    }

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseTable() {
    this._advance(); // 'table'
    const node = Node('Table', { source: null, columns: [], emptyText: 'No data available' });

    let source = '';
    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      const tok = this._advance();
      source += (source ? ' ' : '') + String(tok.value);
    }
    node.source = source.trim() || null;

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      while (!this._check(TT.DEDENT) && !this._isEOF()) {
        this._skipNewlines();
        if (this._check(TT.DEDENT) || this._isEOF()) break;
        if (this._checkKeyword('column')) {
          node.columns.push(this._parseTableColumn());
        } else {
          this._consumeToNewline();
        }
      }
      this._match(TT.DEDENT);
    }
    return node;
  }

  _parseTableColumn() {
    this._advance(); // 'column'
    const node = Node('TableColumn', { label: '', expr: '' });
    node.label = this._expectString();
    if (this._matchKeyword('shows')) {
      node.expr = this._collectRestAsText().trim();
    } else {
      node.expr = node.label;
      this._consumeToNewline();
    }
    return node;
  }

  _parseInput() {
    this._advance(); // 'input'
    const node = Node('Input', {
      label: null, inputType: 'text', required: false,
      placeholder: null, bind: null, onChange: null, validations: [], children: undefined
    });

    if (this._check(TT.STRING)) node.label = this._advance().value;

    while (!this._check(TT.NEWLINE) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('type')) {
        if (this._check(TT.STRING)) node.inputType = this._advance().value;
      } else if (this._matchKeyword('required')) {
        node.required = true;
      } else if (this._matchKeyword('placeholder')) {
        if (this._check(TT.STRING)) node.placeholder = this._advance().value;
      } else if (this._matchKeyword('bind')) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.bind = this._advance().value;
        }
      } else if (this._matchKeyword('on')) {
        this._matchKeyword('change');
        this._matchKeyword('runs');
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onChange = this._advance().value;
        }
      } else {
        this._advance();
      }
    }

    this._consumeToNewline();
    this._parseFieldDirectives(node);
    return node;
  }

  _parseTextarea() {
    this._advance(); // 'textarea'
    const node = Node('Textarea', {
      label: null,
      required: false,
      placeholder: null,
      bind: null,
      rows: 4,
      onChange: null,
      validations: [],
      children: undefined
    });
    if (this._check(TT.STRING)) node.label = this._advance().value;
    while (!this._check(TT.NEWLINE) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('required')) {
        node.required = true;
      } else if (this._matchKeyword('placeholder')) {
        node.placeholder = this._expectString();
      } else if (this._matchKeyword('bind')) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.bind = this._advance().value;
        }
      } else if (this._matchKeyword('rows')) {
        if (this._check(TT.NUMBER)) node.rows = this._advance().value;
      } else if (this._matchKeyword('on')) {
        this._matchKeyword('change');
        this._matchKeyword('runs');
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          node.onChange = this._advance().value;
        }
      } else {
        this._advance();
      }
    }
    this._consumeToNewline();
    this._parseFieldDirectives(node);
    return node;
  }

  _parseFieldDirectives(node) {
    this._skipNewlines();
    if (!this._match(TT.INDENT)) return;
    while (!this._check(TT.DEDENT) && !this._isEOF()) {
      this._skipNewlines();
      if (this._check(TT.DEDENT) || this._isEOF()) break;
      if (this._matchKeyword('validate')) {
        this._parseValidationRule(node);
      } else {
        this._consumeToNewline();
      }
    }
    this._match(TT.DEDENT);
  }

  _parseValidationRule(node) {
    while (!this._check(TT.NEWLINE) && !this._check(TT.DEDENT) && !this._isEOF()) {
      const current = this._current();
      if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'required') {
        node.required = true;
        node.validations.push({ rule: 'required' });
        this._advance();
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'email') {
        node.validations.push({ rule: 'email' });
        this._advance();
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'url') {
        node.validations.push({ rule: 'url' });
        this._advance();
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'strong-password') {
        node.validations.push({ rule: 'strongPassword' });
        this._advance();
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'min-length') {
        this._advance();
        const value = this._check(TT.NUMBER) ? this._advance().value : parseInt(this._expectString(), 10);
        node.validations.push({ rule: 'minLength', value });
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'max-length') {
        this._advance();
        const value = this._check(TT.NUMBER) ? this._advance().value : parseInt(this._expectString(), 10);
        node.validations.push({ rule: 'maxLength', value });
      } else if ((current.type === TT.KEYWORD || current.type === TT.IDENTIFIER) && current.value === 'pattern') {
        this._advance();
        node.validations.push({ rule: 'pattern', value: this._expectString() });
      } else {
        this._advance();
      }
    }
    this._skipNewlines();
  }

  _parseItem() {
    this._advance(); // 'item'
    const node = Node('Item', { text: null, children: undefined });
    if (this._check(TT.STRING)) node.text = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseBrand() {
    this._advance(); // 'brand'
    const node = Node('Brand', { text: null, children: undefined });
    if (this._check(TT.STRING)) node.text = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseStat() {
    this._advance(); // 'stat'
    const node = Node('Stat', { value: null, label: null, children: undefined });
    if (this._check(TT.STRING)) node.value = this._advance().value;
    if (this._check(TT.STRING)) node.label = this._advance().value;
    this._consumeToNewline();
    return node;
  }

  _parseProgress() {
    this._advance(); // 'progress'
    const node = Node('Progress', { label: null, value: 50, children: undefined });
    if (this._check(TT.STRING)) node.label = this._advance().value;
    if (this._check(TT.PERCENT)) node.value = this._advance().value;
    if (this._check(TT.NUMBER)) {
      node.value = this._advance().value;
      // skip trailing %
    }
    this._consumeToNewline();
    return node;
  }

  _parseAnimate() {
    this._advance(); // 'animate'
    const node = Node('Animate', { value: null, trigger: 'scroll', delay: null, duration: null, gap: null, children: undefined });
    if (this._check(TT.STRING)) node.value = this._advance().value;

    while (!this._check(TT.NEWLINE) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('on')) {
        if (this._check(TT.KEYWORD) || this._check(TT.IDENTIFIER)) {
          node.trigger = this._advance().value;
        }
      } else if (this._matchKeyword('delay')) {
        if (this._check(TT.STRING)) node.delay = this._advance().value;
      } else if (this._matchKeyword('duration')) {
        if (this._check(TT.STRING)) node.duration = this._advance().value;
      } else if (this._matchKeyword('gap')) {
        if (this._check(TT.STRING)) node.gap = this._advance().value;
      } else {
        this._advance();
      }
    }

    this._consumeToNewline();
    return node;
  }

  _parseModal() {
    this._advance(); // 'modal'
    const node = Node('Modal', { trigger: null });

    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      if (this._check(TT.STRING)) node.trigger = this._advance().value;
      else this._advance();
    }

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseTab() {
    this._advance(); // 'tab'
    const node = Node('Tab', { label: null });
    if (this._check(TT.STRING)) node.label = this._advance().value;

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseTabs() {
    this._advance(); // 'tabs'
    const node = Node('Tabs');
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseIf() {
    this._advance(); // 'if'
    const node = Node('Condition', { condition: null, elseChildren: [] });
    // Collect condition expression
    let cond = '';
    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      cond += (cond ? ' ' : '') + this._advance().value;
    }
    node.condition = cond.trim();

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }

    // Check for else
    this._skipNewlines();
    if (this._matchKeyword('else')) {
      this._match(TT.COLON);
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.elseChildren = this._parseBlock();
      }
    }

    return node;
  }

  _parseRepeat() {
    this._advance(); // 'repeat'
    const node = Node('Repeat', { itemName: null, collection: null });
    // repeat item in items
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
      node.itemName = this._advance().value;
    }
    this._matchKeyword('in');
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
      node.collection = this._advance().value;
    }

    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseUse() {
    this._advance(); // 'use'
    const node = Node('Use', { componentName: null, props: {}, children: [] });
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
      node.componentName = this._advance().value;
    }

    if (this._matchKeyword('with')) {
      while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
        if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
          const key = this._advance().value;
          if (this._check(TT.OPERATOR) && this._current().value === '=') {
            this._advance();
          }
          if (this._check(TT.STRING) || this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.NUMBER)) {
            node.props[key] = this._advance().value;
          }
        } else {
          this._advance();
        }
      }
    }

    if (this._match(TT.COLON)) {
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.children = this._parseBlock();
      }
      return node;
    }

    this._consumeToNewline();
    return node;
  }

  _parseSlot() {
    this._advance(); // 'slot'
    const node = Node('Slot', { name: 'default' });

    if ((this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD) || this._check(TT.STRING)) &&
        !this._check(TT.COLON) && !this._check(TT.NEWLINE)) {
      node.name = this._advance().value;
    }

    if (this._match(TT.COLON)) {
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.children = this._parseBlock();
      }
      return node;
    }

    this._consumeToNewline();
    return node;
  }

  // Inline section/nav/footer (nested inside components or other blocks)
  _parseSectionInline() {
    this._advance(); // 'section'
    const node = Node('Section', { id: null, modifiers: [], props: {}, animations: [] });
    if (this._check(TT.IDENTIFIER) || this._check(TT.KEYWORD)) {
      node.id = this._advance().value;
    }
    while (!this._check(TT.COLON) && !this._check(TT.NEWLINE) && !this._isEOF()) {
      if (this._checkKeyword('centered') || this._checkKeyword('fullscreen')) {
        node.modifiers.push(this._advance().value);
      } else if (this._matchKeyword('with')) {
        if (this._matchKeyword('image')) {
          node.props.backgroundImage = this._expectString();
        }
      } else {
        const mod = this._advance();
        if (mod.type === TT.IDENTIFIER || mod.type === TT.KEYWORD) {
          node.modifiers.push(mod.value);
        }
      }
    }
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseNavInline() {
    this._advance(); // 'nav'
    const node = Node('Nav', { style: null });
    if (this._matchKeyword('style')) {
      node.style = this._expectString();
    }
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseFooterInline() {
    this._advance(); // 'footer'
    const node = Node('Footer');
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseShellInline() {
    this._advance(); // 'shell'
    const node = Node('Shell');
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseSimpleBlock(type) {
    this._advance();
    const node = Node(type);
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parsePanel() {
    this._advance(); // 'panel'
    const node = Node('Panel', { title: null });
    if (this._check(TT.STRING)) node.title = this._advance().value;
    this._match(TT.COLON);
    this._skipNewlines();
    if (this._match(TT.INDENT)) {
      node.children = this._parseBlock();
    }
    return node;
  }

  _parseBanner() {
    this._advance(); // 'banner'
    const node = Node('Banner', { text: null, variant: 'info', children: undefined });
    if (this._check(TT.STRING)) node.text = this._advance().value;
    while (!this._check(TT.NEWLINE) && !this._check(TT.COLON) && !this._isEOF() && !this._check(TT.DEDENT)) {
      if (this._matchKeyword('type')) {
        node.variant = this._expectString();
      } else {
        this._advance();
      }
    }
    if (this._match(TT.COLON)) {
      this._skipNewlines();
      if (this._match(TT.INDENT)) {
        node.children = this._parseBlock();
      }
      return node;
    }
    this._consumeToNewline();
    return node;
  }
}

// ─── Code Generator ──────────────────────────────────────────────────────────

class CodeGenerator {
  constructor(ast, options) {
    options = options || {};
    this.ast = ast;
    this.options = options;
    this.theme = ast.meta.theme || 'dark';
    this.accent = ast.meta.accent || '#00d4ff';
    this.title = ast.meta.title || ast.meta.appName || 'NC UI Page';
    this.font = ast.meta.font || 'Inter';
    this._release = !!options.release;
    this._externalizeScripts = !!options.externalizeScripts;
    this._externalizeStyles = !!options.externalizeStyles;
    this._includeExternalFonts = options.includeExternalFonts !== undefined ? !!options.includeExternalFonts : !this._release;
    this._assetBaseName = options.assetBaseName || 'app';
    this._securityHeadersOverride = options.securityHeaders || null;
    this._noRuntime = !!options.noRuntime;
    this._hasState = ast.states && ast.states.length > 0;
    this._hasStores = ast.stores && ast.stores.length > 0;
    this._hasComputed = ast.computeds && ast.computeds.length > 0;
    this._hasRoutes = ast.routes && ast.routes.length > 0;
    this._hasGuards = ast.guards && ast.guards.length > 0;
    this._hasProviders = ast.providers && ast.providers.length > 0;
    this._hasServices = ast.services && ast.services.length > 0;
    this._hasAuth = !!ast.auth;
    this._hasActions = ast.actions && ast.actions.length > 0;
    this._hasComponents = ast.components && ast.components.length > 0;
    this._hasTables = this._containsNodeType(ast.children || [], 'Table');
    this._hasStreams = this._containsNodeType(ast.children || [], 'Stream');
    this._hasSockets = this._containsNodeType(ast.children || [], 'Socket');
    this._hasGraphs = this._containsNodeType(ast.children || [], 'Graph');
    this._hasFlows = this._containsNodeType(ast.children || [], 'Flow');
    this._hasDragDrop = this._containsNodeType(ast.children || [], 'DragList') || this._containsNodeType(ast.children || [], 'DropZone');
    this._hasLifecycle = !!(ast.lifecycle && (((ast.lifecycle.mount && ast.lifecycle.mount.length) || 0) + ((ast.lifecycle.server && ast.lifecycle.server.length) || 0)));
    this._packageStyles = ast.packageAssets && Array.isArray(ast.packageAssets.styles) ? ast.packageAssets.styles.slice() : [];
    this._packageScripts = ast.packageAssets && Array.isArray(ast.packageAssets.scripts) ? ast.packageAssets.scripts.slice() : [];
    this._modalCount = 0;
    this._tabGroupCount = 0;
    this._backgroundCount = 0;
    this._backgroundRules = [];
  }

  generate() {
    const body = this._renderChildren(this.ast.children || [], {});
    return this._wrapHTML(body, this._prerenderedOutletHTML('/'));
  }

  buildArtifacts() {
    const body = this._renderChildren(this.ast.children || [], {});
    const html = this._wrapHTML(body, this._prerenderedOutletHTML('/'));
    const prerenderedRoutes = [];

    for (const route of this.ast.routes || []) {
      if (!this._isStaticRoute(route.path) || route.path === '/') continue;
      const outlet = this._prerenderedOutletHTML(route.path);
      const routeHtml = this._wrapHTML(body, outlet);
      prerenderedRoutes.push({
        path: route.path,
        component: route.component,
        html: routeHtml,
        outputPath: this._routeOutputPath(route.path),
        protected: !!(route.requireAuth || route.requireRole || route.guard)
      });
    }

    return {
      html,
      assets: {
        css: this._externalizeStyles ? this._styleBundle() : null,
        js: (this._externalizeScripts && !this._noRuntime) ? this._scriptBundle() : null
      },
      prerenderedRoutes,
      ssrManifest: {
        serverLoad: (this.ast.lifecycle && this.ast.lifecycle.server ? this.ast.lifecycle.server : [])
          .filter(stmt => stmt && stmt.type === 'fetch')
          .map(stmt => ({
            type: stmt.type,
            url: stmt.url,
            method: stmt.method || 'GET',
            withAuth: !!stmt.withAuth,
            saveAs: stmt.saveAs || null,
            redirect: stmt.redirect || null
          })),
        staticRoutes: prerenderedRoutes.map(route => ({
          path: route.path,
          component: route.component,
          outputPath: route.outputPath,
          protected: route.protected,
          routePattern: this._routeRegexSource(route.path)
        })),
        dynamicRoutes: (this.ast.routes || [])
          .filter(route => !this._isStaticRoute(route.path))
          .map(route => ({
            path: route.path,
            component: route.component,
            protected: !!(route.requireAuth || route.requireRole || route.guard),
            routePattern: this._routeRegexSource(route.path),
            templateHtml: this._componentTemplateByName(route.component)
          }))
      }
    };
  }

  // ─── Node dispatch ────────────────────────────────────────────────────────

  _node(n, ctx) {
    const scope = ctx || {};
    if (!n) return '';
    switch (n.type) {
      case 'Shell':      return this._shell(n, scope);
      case 'Nav':        return this._nav(n, scope);
      case 'Sidebar':    return this._sidebar(n, scope);
      case 'Topbar':     return this._topbar(n, scope);
      case 'Panel':      return this._panel(n, scope);
      case 'Banner':     return this._banner(n, scope);
      case 'Section':    return this._section(n, scope);
      case 'Footer':     return this._footer(n, scope);
      case 'Heading':    return this._heading(n, scope);
      case 'Subheading': return `<p class="ncui-sub">${this._interpolateHTML(n.text, scope)}</p>`;
      case 'Text':       return `<p class="ncui-text">${this._interpolateHTML(n.text, scope)}</p>`;
      case 'Badge':      return `<span class="ncui-badge">${this._interpolateHTML(n.text, scope)}</span>`;
      case 'Alert':      return this._alert(n, scope);
      case 'Loading':    return this._loading(n, scope);
      case 'Markdown':   return this._markdown(n, scope);
      case 'External':   return this._external(n, scope);
      case 'Stream':     return this._stream(n);
      case 'Socket':     return this._socket(n);
      case 'Graph':      return this._graph(n);
      case 'Flow':       return this._flow(n);
      case 'DragList':   return this._dragList(n);
      case 'DropZone':   return this._dropZone(n);
      case 'Button':     return this._button(n, scope);
      case 'Link':       return `<a href="${this._esc(n.href || '#')}" class="ncui-link">${this._interpolateHTML(n.text, scope)}</a>`;
      case 'Image':      return this._image(n);
      case 'Video':      return `<video src="${this._esc(n.src)}" controls class="ncui-video"></video>`;
      case 'Row':        return `<div class="ncui-row">${this._renderChildren(n.children || [], scope)}</div>`;
      case 'Column':     return `<div class="ncui-col">${this._renderChildren(n.children || [], scope)}</div>`;
      case 'Spacer':     return `<div class="ncui-spacer"></div>`;
      case 'Divider':    return `<hr class="ncui-divider">`;
      case 'Grid':       return this._grid(n, scope);
      case 'Card':       return this._card(n, scope);
      case 'Form':       return this._form(n, scope);
      case 'Table':      return this._table(n);
      case 'Input':      return this._input(n);
      case 'Textarea':   return this._textarea(n);
      case 'List':       return `<ul class="ncui-list">${this._renderChildren(n.children || [], scope)}</ul>`;
      case 'Item':       return `<li class="ncui-list-item"><span class="ncui-check">${ICONS.check}</span>${this._interpolateHTML(n.text, scope)}</li>`;
      case 'Stat':       return this._stat(n);
      case 'Progress':   return this._progress(n);
      case 'Brand':      return `<a href="#" class="ncui-brand">${this._interpolateHTML(n.text, scope)}</a>`;
      case 'Links':      return `<div class="ncui-nav-links">${this._renderChildren(n.children || [], scope)}</div>`;
      case 'Animate':    return '';  // handled at section level
      case 'Modal':      return this._modal(n, scope);
      case 'Tabs':       return this._tabs(n, scope);
      case 'Tab':        return this._tab(n);
      case 'Condition':  return this._condition(n, scope);
      case 'Repeat':     return this._repeat(n, scope);
      case 'Use':        return this._use(n, scope);
      case 'Slot':       return this._slot(n, scope);
      case 'Noop':       return '';
      default:           return '';
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _renderChildren(nodes, ctx) {
    return (nodes || []).map(c => this._node(c, ctx)).join('');
  }

  _interpolateHTML(s, ctx) {
    if (!s) return '';
    const scope = ctx || {};
    return this._esc(s).replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
      const raw = expr.trim();
      if (scope.props && Object.prototype.hasOwnProperty.call(scope.props, raw)) {
        const propValue = String(scope.props[raw]);
        if (propValue.includes('{{')) {
          return this._interpolateHTML(propValue, {});
        }
        return this._esc(propValue);
      }
      // Convert {{expr}} to runtime-renderable spans
      if (this._hasState || this._hasStores || this._hasComputed) {
        return `<span data-ncui-text="{{${raw}}}">\${${raw}}</span>`;
      }
      return `{{${raw}}}`;
    });
  }

  _markdownHTML(source) {
    const escaped = this._esc(source || '');
    const blocks = escaped.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    return blocks.map(block => {
      if (/^###\s+/.test(block)) return `<h4>${block.replace(/^###\s+/, '')}</h4>`;
      if (/^##\s+/.test(block)) return `<h3>${block.replace(/^##\s+/, '')}</h3>`;
      if (/^#\s+/.test(block)) return `<h2>${block.replace(/^#\s+/, '')}</h2>`;
      if (/^[-*]\s+/m.test(block)) {
        const items = block.split(/\n/).map(line => line.trim()).filter(Boolean).map(line => line.replace(/^[-*]\s+/, ''));
        return `<ul>${items.map(item => `<li>${this._markdownInline(item)}</li>`).join('')}</ul>`;
      }
      return `<p>${this._markdownInline(block.replace(/\n/g, '<br>'))}</p>`;
    }).join('');
  }

  _markdownInline(text) {
    return String(text || '')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  _containsNodeType(nodes, type) {
    for (const node of nodes || []) {
      if (!node) continue;
      if (node.type === type) return true;
      if (this._containsNodeType(node.children || [], type)) return true;
      if (this._containsNodeType(node.elseChildren || [], type)) return true;
    }
    return false;
  }

  _normalizedAuthConfig() {
    const auth = this.ast.auth || {};
    return {
      type: auth.type || 'bearer',
      sessionMode: auth['session mode'] || auth.sessionMode || 'backend',
      loginEndpoint: auth['login endpoint'] || auth.loginEndpoint || '/api/auth/login',
      logoutEndpoint: auth['logout endpoint'] || auth.logoutEndpoint || '/api/auth/logout',
      refreshEndpoint: auth['refresh endpoint'] || auth.refreshEndpoint || '/api/auth/refresh',
      verifyEndpoint: auth['verify endpoint'] || auth.verifyEndpoint || '/api/auth/verify',
      callbackEndpoint: auth['callback endpoint'] || auth.callbackEndpoint || auth['token endpoint'] || auth.tokenEndpoint || '/api/auth/callback',
      tokenStore: auth['token store'] || auth.tokenStore || 'session',
      tokenHeader: auth['token header'] || auth.tokenHeader || 'Authorization',
      tokenPrefix: auth['token prefix'] || auth.tokenPrefix || 'Bearer',
      onLoginNavigateTo: auth['on login success navigate to'] || auth.onLoginNavigateTo || '/dashboard',
      onLogoutNavigateTo: auth['on logout navigate to'] || auth.onLogoutNavigateTo || '/login',
      authEndpoint: auth['auth endpoint'] || auth.authEndpoint || null,
      tokenEndpoint: auth['token endpoint'] || auth.tokenEndpoint || null,
      clientId: auth['client id'] || auth.clientId || null,
      redirectUri: auth['redirect uri'] || auth.redirectUri || null,
      scope: auth.scope || 'openid profile email',
      audience: auth.audience || null,
      allowDirectProviderTokens: !!(auth['allow direct provider tokens'] || auth.allowDirectProviderTokens)
    };
  }

  _fieldName(node) {
    if (node.bind) return node.bind;
    return String(node.label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  }

  _fieldValidationMeta(node) {
    const validators = Array.isArray(node.validations) ? node.validations.slice() : [];
    if (node.required && !validators.some(rule => rule.rule === 'required')) {
      validators.unshift({ rule: 'required' });
    }
    return validators;
  }

  _backgroundClass(url) {
    if (!url) return '';
    const existing = this._backgroundRules.find(entry => entry.url === url);
    if (existing) return existing.className;
    const className = `ncui-section-bg-${this._backgroundCount++}`;
    this._backgroundRules.push({
      url,
      className,
      css: `.${className}::before{background:url('${this._esc(url)}') center/cover no-repeat;}`
    });
    return className;
  }

  _securityHeadersConfig() {
    if (this._securityHeadersOverride) {
      return this._securityHeadersOverride;
    }
    return {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this._includeExternalFonts
        ? "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https:"
        : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https:",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Permitted-Cross-Domain-Policies': 'none'
    };
  }

  // ─── Individual generators ────────────────────────────────────────────────

  _heading(n, ctx) {
    const cls = n.style === 'gradient' ? 'ncui-heading ncui-gradient-text' : 'ncui-heading';
    return `<h2 class="${cls}">${this._interpolateHTML(n.text, ctx)}</h2>`;
  }

  _button(n, ctx) {
    const cls = `ncui-btn ncui-btn-${n.style || 'primary'}`;
    const attrs = [];
    if (n.onClick) attrs.push(`data-ncui-click="${this._esc(n.onClick)}"`);
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    const label = this._interpolateHTML(n.text, ctx);
    if (n.href) {
      if (this._hasRoutes && n.href.startsWith('/')) {
        return `<a href="${this._esc(n.href)}" class="${cls}" data-ncui-link="${this._esc(n.href)}"${attrStr}>${label}</a>`;
      }
      return `<a href="${this._esc(n.href)}" class="${cls}"${attrStr}>${label}</a>`;
    }
    return `<button class="${cls}"${attrStr}>${label}</button>`;
  }

  _shell(n, ctx) {
    const children = n.children || [];
    const sidebar = children.find(child => child && child.type === 'Sidebar');
    const topbar = children.find(child => child && child.type === 'Topbar');
    const banner = children.find(child => child && child.type === 'Banner');
    const content = children.filter(child => child && child.type !== 'Sidebar' && child.type !== 'Topbar' && child.type !== 'Banner');
    return `<div class="ncui-shell">${sidebar ? this._sidebar(sidebar, ctx) : ''}<div class="ncui-shell-main">${topbar ? this._topbar(topbar, ctx) : ''}${banner ? this._banner(banner, ctx) : ''}<div class="ncui-shell-content">${this._renderChildren(content, ctx)}</div></div></div>`;
  }

  _sidebar(n, ctx) {
    return `<aside class="ncui-sidebar">${this._renderChildren(n.children || [], ctx)}</aside>`;
  }

  _topbar(n, ctx) {
    return `<header class="ncui-topbar">${this._renderChildren(n.children || [], ctx)}</header>`;
  }

  _panel(n, ctx) {
    const title = n.title ? `<div class="ncui-panel-title">${this._interpolateHTML(n.title, ctx)}</div>` : '';
    return `<section class="ncui-panel">${title}<div class="ncui-panel-body">${this._renderChildren(n.children || [], ctx)}</div></section>`;
  }

  _banner(n, ctx) {
    const body = n.children && n.children.length
      ? this._renderChildren(n.children, ctx)
      : `<p class="ncui-banner-text">${this._interpolateHTML(n.text, ctx)}</p>`;
    return `<div class="ncui-banner ncui-banner-${this._esc((n.variant || 'info').toLowerCase())}">${body}</div>`;
  }

  _alert(n, ctx) {
    const variant = this._esc((n.variant || 'info').toLowerCase());
    const dismissible = n.dismissible ? ' data-ncui-dismissible="true"' : '';
    const closeButton = n.dismissible
      ? '<button type="button" class="ncui-alert-close" aria-label="Dismiss alert">&times;</button>'
      : '';
    const body = n.children && n.children.length
      ? this._renderChildren(n.children, ctx)
      : `<p class="ncui-alert-text">${this._interpolateHTML(n.text, ctx)}</p>`;
    return `<div class="ncui-alert ncui-alert-${variant}" role="alert"${dismissible}>${closeButton}<div class="ncui-alert-body">${body}</div></div>`;
  }

  _loading(n, ctx) {
    const size = this._esc(n.size || 'medium');
    if (n.kind === 'skeleton') {
      const rows = Math.max(1, parseInt(n.rows, 10) || 3);
      const skeletonRows = Array.from({ length: rows }, (_, index) =>
        `<div class="ncui-skeleton-line ncui-skeleton-line-${(index % 3) + 1}"></div>`
      ).join('');
      return `<div class="ncui-loading ncui-loading-skeleton" aria-live="polite">${skeletonRows}</div>`;
    }
    const text = n.text ? `<p class="ncui-loading-text">${this._interpolateHTML(n.text, ctx)}</p>` : '';
    return `<div class="ncui-loading ncui-loading-spinner ncui-loading-${size}" aria-live="polite"><div class="ncui-spinner" aria-hidden="true"></div>${text}</div>`;
  }

  _markdown(n, ctx) {
    const source = n.source || '';
    if (/\{\{[^}]+\}\}/.test(source)) {
      return `<div class="ncui-markdown" data-ncui-markdown="${this._esc(source)}"></div>`;
    }
    return `<div class="ncui-markdown">${this._markdownHTML(source)}</div>`;
  }

  _external(n) {
    return `<div class="ncui-external" data-ncui-external="${this._esc(n.name || '')}" data-ncui-external-props="${this._esc(JSON.stringify(n.props || {}))}"><div class="ncui-external-fallback">External widget "${this._esc(n.name || 'unknown')}" is ready for host mounting.</div></div>`;
  }

  _stream(n) {
    const saveAs = n.saveAs ? ` data-ncui-stream-save="${this._esc(n.saveAs)}"` : '';
    const auth = n.withAuth ? ' data-ncui-stream-auth="true"' : '';
    const event = n.event ? ` data-ncui-stream-event="${this._esc(n.event)}"` : '';
    return `<div class="ncui-live ncui-stream" data-ncui-stream-url="${this._esc(n.url)}"${saveAs}${auth}${event}><div class="ncui-live-status">Connecting to stream...</div><div class="ncui-live-body"></div></div>`;
  }

  _socket(n) {
    const saveAs = n.saveAs ? ` data-ncui-socket-save="${this._esc(n.saveAs)}"` : '';
    const channel = n.channel ? ` data-ncui-socket-channel="${this._esc(n.channel)}"` : '';
    return `<div class="ncui-live ncui-socket" data-ncui-socket-url="${this._esc(n.url)}"${saveAs}${channel}><div class="ncui-live-status">Opening realtime socket...</div><div class="ncui-live-body"></div></div>`;
  }

  _graph(n) {
    const source = n.source ? ` data-ncui-graph-source="${this._esc(n.source)}"` : '';
    return `<div class="ncui-graph" data-ncui-graph-kind="${this._esc(n.kind || 'graph')}"${source}><div class="ncui-graph-canvas"></div></div>`;
  }

  _flow(n) {
    const source = n.source ? ` data-ncui-flow-source="${this._esc(n.source)}"` : '';
    return `<div class="ncui-flow" data-ncui-flow-kind="${this._esc(n.kind || 'flow')}"${source}><svg class="ncui-flow-edges"></svg><div class="ncui-flow-canvas"></div></div>`;
  }

  _dragList(n) {
    const title = n.title ? `<div class="ncui-drag-title">${this._esc(n.title)}</div>` : '';
    return `<div class="ncui-drag-list" data-ncui-drag-source="${this._esc(n.source || '')}">${title}<div class="ncui-drag-items"></div></div>`;
  }

  _dropZone(n) {
    const title = n.title ? `<div class="ncui-drop-title">${this._esc(n.title)}</div>` : '';
    return `<div class="ncui-drop-zone" data-ncui-drop-target="${this._esc(n.target || '')}">${title}<div class="ncui-drop-items"></div></div>`;
  }

  _image(n) {
    const cls = ['ncui-img'];
    if (n.style === 'rounded') cls.push('ncui-img-rounded');
    return `<img src="${this._esc(n.src)}" alt="${this._esc(n.alt || '')}" class="${cls.join(' ')}" loading="lazy">`;
  }

  _card(n, ctx) {
    let iconHtml = '';
    if (n.icon && ICONS[n.icon]) {
      iconHtml = `<div class="ncui-card-icon">${ICONS[n.icon]}</div>`;
    }
    const inner = this._renderChildren(n.children || [], ctx);
    const cls = n.clickable ? 'ncui-card ncui-card-clickable' : 'ncui-card';
    return `<div class="${cls}">${iconHtml}${inner}</div>`;
  }

  _grid(n, ctx) {
    let cls = `ncui-grid ncui-grid-${n.columns}`;
    if (n.responsive) {
      cls += ' ncui-grid-responsive';
      if (n.responsive.tablet) cls += ` ncui-grid-tablet-${n.responsive.tablet}`;
      if (n.responsive.mobile) cls += ` ncui-grid-mobile-${n.responsive.mobile}`;
    }
    return `<div class="${cls}">${this._renderChildren(n.children || [], ctx)}</div>`;
  }

  _form(n, ctx) {
    const inner = this._renderChildren(n.children || [], ctx);
    const submitAttr = n.onSubmit ? ` data-ncui-submit="${this._esc(n.onSubmit)}"` : '';
    const authAttr = n.withAuth ? ' data-ncui-auth="true"' : '';
    const saveAttr = n.saveResponseAs ? ` data-ncui-save-response="${this._esc(n.saveResponseAs)}"` : '';
    const redirectAttr = n.redirectTo ? ` data-ncui-redirect="${this._esc(n.redirectTo)}"` : '';
    const actionAttr = n.action ? ` data-ncui-action-url="${this._esc(n.action)}"` : '';
    return `<form class="ncui-form" action="${this._esc(n.action)}" method="${this._esc(n.method)}"${submitAttr}${authAttr}${saveAttr}${redirectAttr}${actionAttr}><div class="ncui-form-status" data-ncui-form-status></div>${inner}</form>`;
  }

  _table(n) {
    const columns = n.columns || [];
    const headers = columns.map(col => `<th class="ncui-table-head">${this._esc(col.label)}</th>`).join('');
    const empty = `<tr class="ncui-table-empty"><td class="ncui-table-cell" colspan="${Math.max(columns.length, 1)}">${this._esc(n.emptyText || 'No data available')}</td></tr>`;
    const meta = this._esc(JSON.stringify(columns.map(col => ({ label: col.label, expr: col.expr }))));
    const sourceAttr = n.source ? ` data-ncui-table="${this._esc(n.source)}"` : '';
    return `<div class="ncui-table-wrap"><table class="ncui-table"${sourceAttr} data-ncui-columns="${meta}"><thead><tr>${headers}</tr></thead><tbody>${empty}</tbody></table></div>`;
  }

  _input(n) {
    const id = 'f-' + (n.label || '').toLowerCase().replace(/\s+/g, '-');
    const req = n.required ? ' required' : '';
    const ph = n.placeholder || n.label || '';
    const fieldName = this._fieldName(n);
    const validators = this._fieldValidationMeta(n);
    const bindAttr = n.bind ? ` data-ncui-bind="${this._esc(n.bind)}"` : '';
    const changeAttr = n.onChange ? ` data-ncui-change="${this._esc(n.onChange)}"` : '';
    const validationAttr = validators.length ? ` data-ncui-validators="${this._esc(JSON.stringify(validators))}"` : '';
    return `<div class="ncui-field"><label for="${id}">${this._esc(n.label)}</label><input id="${id}" name="${this._esc(fieldName)}" data-ncui-field="${this._esc(fieldName)}" type="${n.inputType || 'text'}" placeholder="${this._esc(ph)}"${req}${bindAttr}${changeAttr}${validationAttr} aria-describedby="${id}-error"><div id="${id}-error" class="ncui-field-error" data-ncui-error-for="${this._esc(fieldName)}"></div></div>`;
  }

  _textarea(n) {
    const id = 'f-' + (n.label || '').toLowerCase().replace(/\s+/g, '-');
    const req = n.required ? ' required' : '';
    const ph = n.placeholder || n.label || '';
    const fieldName = this._fieldName(n);
    const validators = this._fieldValidationMeta(n);
    const bindAttr = n.bind ? ` data-ncui-bind="${this._esc(n.bind)}"` : '';
    const changeAttr = n.onChange ? ` data-ncui-change="${this._esc(n.onChange)}"` : '';
    const validationAttr = validators.length ? ` data-ncui-validators="${this._esc(JSON.stringify(validators))}"` : '';
    return `<div class="ncui-field"><label for="${id}">${this._esc(n.label)}</label><textarea id="${id}" name="${this._esc(fieldName)}" data-ncui-field="${this._esc(fieldName)}" placeholder="${this._esc(ph)}" rows="${n.rows || 4}"${req}${bindAttr}${changeAttr}${validationAttr} aria-describedby="${id}-error"></textarea><div id="${id}-error" class="ncui-field-error" data-ncui-error-for="${this._esc(fieldName)}"></div></div>`;
  }

  _stat(n) {
    return `<div class="ncui-stat"><span class="ncui-stat-val">${this._esc(n.value)}</span><span class="ncui-stat-label">${this._esc(n.label)}</span></div>`;
  }

  _progress(n) {
    const value = Math.max(0, Math.min(100, parseInt(n.value, 10) || 0));
    return `<div class="ncui-progress"><span class="ncui-progress-label">${this._esc(n.label)}</span><div class="ncui-progress-bar"><div class="ncui-progress-fill ncui-progress-fill-${value}" data-ncui-progress="${value}"></div></div></div>`;
  }

  _modal(n, ctx) {
    const id = `ncui-modal-${this._modalCount++}`;
    const inner = this._renderChildren(n.children || [], ctx);
    const trigger = n.trigger || 'Open';
    return `<button class="ncui-btn ncui-btn-primary" data-ncui-modal-open="${id}">${this._esc(trigger)}</button>
<div id="${id}" class="ncui-modal" data-ncui-modal>
  <div class="ncui-modal-content">
    <button class="ncui-modal-close" data-ncui-modal-close="true">&times;</button>
    ${inner}
  </div>
</div>`;
  }

  _tabs(n, ctx) {
    const groupId = `ncui-tabs-${this._tabGroupCount++}`;
    const tabs = (n.children || []).filter(c => c.type === 'Tab');
    let headerHtml = `<div class="ncui-tabs-header">`;
    let bodyHtml = '';
    tabs.forEach((tab, i) => {
      const active = i === 0 ? ' ncui-tab-active' : '';
      const panelClass = i === 0 ? 'ncui-tab-panel' : 'ncui-tab-panel ncui-tab-panel-hidden';
      headerHtml += `<button class="ncui-tab-btn${active}" data-ncui-tab-btn="${groupId}" data-ncui-tab-index="${i}">${this._esc(tab.label)}</button>`;
      bodyHtml += `<div class="${panelClass}" data-tab-group="${groupId}" data-tab-index="${i}">${this._renderChildren(tab.children || [], ctx)}</div>`;
    });
    headerHtml += `</div>`;
    return `<div class="ncui-tabs" id="${groupId}">${headerHtml}${bodyHtml}</div>`;
  }

  _tab() {
    // Standalone tab (inside tabs container) — rendered by _tabs
    return '';
  }

  _condition(n, ctx) {
    const condHtml = this._renderChildren(n.children || [], ctx);
    const elseHtml = this._renderChildren(n.elseChildren || [], ctx);

    if (this._hasState) {
      let html = `<div data-ncui-if="${this._esc(n.condition)}">${condHtml}</div>`;
      if (elseHtml) {
        html += `<div data-ncui-if="!${this._esc(n.condition)}">${elseHtml}</div>`;
      }
      return html;
    }
    // Static: just show the true branch
    return condHtml;
  }

  _repeat(n, ctx) {
    if (this._hasState) {
      const tplId = `ncui-tpl-${n.collection}`;
      const innerHtml = this._renderChildren(n.children || [], ctx);
      return `<template id="${tplId}">${innerHtml}</template><div data-ncui-repeat="${this._esc(n.collection)}" data-ncui-repeat-tpl="${tplId}"></div>`;
    }
    return this._renderChildren(n.children || [], ctx);
  }

  _use(n, ctx) {
    const comp = (this.ast.components || []).find(c => c.name === n.componentName);
    if (!comp) return `<!-- Unknown component: ${this._esc(n.componentName)} -->`;
    const slots = {};
    const defaultChildren = [];
    for (const child of (n.children || [])) {
      if (child && child.type === 'Slot') {
        slots[child.name || 'default'] = this._renderChildren(child.children || [], ctx);
      } else {
        defaultChildren.push(child);
      }
    }
    if (defaultChildren.length && !Object.prototype.hasOwnProperty.call(slots, 'default')) {
      slots.default = this._renderChildren(defaultChildren, ctx);
    }
    return this._renderChildren(comp.children || [], { props: n.props || {}, slots });
  }

  _slot(n, ctx) {
    const scope = ctx || {};
    const name = n.name || 'default';
    if (scope.slots && Object.prototype.hasOwnProperty.call(scope.slots, name)) {
      return scope.slots[name];
    }
    return this._renderChildren(n.children || [], scope);
  }

  _section(n, ctx) {
    const classes = ['ncui-section'];
    if (n.modifiers && n.modifiers.includes('centered')) classes.push('ncui-centered');
    if (n.modifiers && n.modifiers.includes('fullscreen')) classes.push('ncui-fullscreen');
    if (n.id === 'hero') classes.push('ncui-hero');

    // Find animations in children
    let anim = null;
    const contentChildren = [];
    for (const c of (n.children || [])) {
      if (c.type === 'Animate') {
        anim = c;
      } else {
        contentChildren.push(c);
      }
    }

    if (anim && anim.value) classes.push(`ncui-anim-${anim.value}`);

    if (n.props && n.props.backgroundImage) {
      classes.push('ncui-section-img');
      classes.push(this._backgroundClass(n.props.backgroundImage));
    }

    // Animation data attrs
    let animAttrs = '';
    if (anim) {
      if (anim.delay) animAttrs += ` data-ncui-anim-delay="${this._esc(anim.delay)}"`;
      if (anim.duration) animAttrs += ` data-ncui-anim-duration="${this._esc(anim.duration)}"`;
      if (anim.trigger === 'hover') animAttrs += ` data-ncui-anim-hover="${this._esc(anim.value)}"`;
    }

    const inner = this._renderChildren(contentChildren, ctx);
    const idAttr = n.id ? ` id="${this._esc(n.id)}"` : '';
    return `<section${idAttr} class="${classes.join(' ')}"${animAttrs}>\n<div class="ncui-container">\n${inner}\n</div>\n</section>`;
  }

  _nav(n, ctx) {
    const inner = this._renderChildren(n.children || [], ctx);
    return `<nav class="ncui-nav"><div class="ncui-container ncui-nav-inner">${inner}<button class="ncui-nav-toggle" data-ncui-nav-toggle="true">${ICONS.menu}</button></div></nav>`;
  }

  _footer(n, ctx) {
    const inner = this._renderChildren(n.children || [], ctx);
    return `<footer class="ncui-footer"><div class="ncui-container">\n${inner}\n</div></footer>`;
  }

  // ─── Router outlet ────────────────────────────────────────────────────────

  _routerOutlet(content) {
    if (!this._hasRoutes) return '';
    return `<div id="ncui-router-outlet">${content || ''}</div>`;
  }

  _securityMeta() {
    const headers = this._securityHeadersConfig();
    return [
      `<meta name="referrer" content="${this._esc(headers['Referrer-Policy'])}">`,
      `<meta http-equiv="Content-Security-Policy" content="${this._esc(headers['Content-Security-Policy'])}">`,
      `<meta http-equiv="X-Frame-Options" content="${this._esc(headers['X-Frame-Options'])}">`,
      `<meta http-equiv="X-Content-Type-Options" content="${this._esc(headers['X-Content-Type-Options'])}">`,
      `<meta http-equiv="X-XSS-Protection" content="${this._esc(headers['X-XSS-Protection'])}">`,
      `<meta http-equiv="Permissions-Policy" content="${this._esc(headers['Permissions-Policy'])}">`,
      `<meta http-equiv="Cross-Origin-Embedder-Policy" content="${this._esc(headers['Cross-Origin-Embedder-Policy'])}">`,
      `<meta http-equiv="Cross-Origin-Opener-Policy" content="${this._esc(headers['Cross-Origin-Opener-Policy'])}">`,
      `<meta http-equiv="Cross-Origin-Resource-Policy" content="${this._esc(headers['Cross-Origin-Resource-Policy'])}">`,
      `<meta http-equiv="X-Permitted-Cross-Domain-Policies" content="${this._esc(headers['X-Permitted-Cross-Domain-Policies'])}">`
    ].join('\n');
  }

  // ─── Full HTML ────────────────────────────────────────────────────────────

  _packageStyleTag() {
    if (this._externalizeStyles || !this._packageStyles.length) return '';
    return `<style data-ncui-package-styles>\n${this._packageStyles.join('\n\n')}\n</style>`;
  }

  _packageScriptTag() {
    if (this._externalizeScripts || !this._packageScripts.length || this._noRuntime) return '';
    return `<script data-ncui-package-scripts>\n${this._packageScripts.join('\n\n')}\n</script>`;
  }

  _ssrBootstrapTag() {
    return `<script id="ncui-ssr-data" type="application/json">null</script>`;
  }

  _styleBundle() {
    return `${this._css()}\n\n${this._packageStyles.join('\n\n')}`.trim() + '\n';
  }

  _scriptBundle() {
    const parts = [];
    if (!this._noRuntime) {
      parts.push(this._runtimeJS());
      if (this._packageScripts.length) parts.push(this._packageScripts.join('\n\n'));
      parts.push(this._appJS());
    }
    return parts.filter(Boolean).join('\n\n');
  }

  _styleTag() {
    if (this._externalizeStyles) {
      return `<link rel="stylesheet" href="./${this._assetBaseName}.css">`;
    }
    return `<style>${this._css()}</style>\n${this._packageStyleTag()}`;
  }

  _scriptTag() {
    if (this._noRuntime) return '';
    if (this._externalizeScripts) {
      return `<script src="./${this._assetBaseName}.js" defer></script>`;
    }
    return `<script>${this._runtimeJS()}</script>\n${this._packageScriptTag()}\n<script>${this._appJS()}</script>`;
  }

  _fontTags() {
    if (!this._includeExternalFonts) return '';
    return `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(this.font)}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;
  }

  _wrapHTML(body, routeContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this._esc(this.title)}</title>
${this._securityMeta()}
${this._fontTags()}
${this._styleTag()}
</head>
<body>
${body}
${this._routerOutlet(routeContent)}
${this._ssrBootstrapTag()}
${this._scriptTag()}
</body>
</html>`;
  }

  _routeOutputPath(routePath) {
    if (!routePath || routePath === '/') return 'index.html';
    const cleaned = String(routePath).replace(/^\/+/, '').replace(/\/+$/, '');
    return cleaned ? `${cleaned}/index.html` : 'index.html';
  }

  _isStaticRoute(routePath) {
    return !!routePath && !/:([A-Za-z_][\w-]*)/.test(routePath) && !/\{\{[^}]+\}\}/.test(routePath);
  }

  _routeRegexSource(routePath) {
    return '^' + String(routePath || '')
      .replace(/:([A-Za-z_][\w-]*)/g, '(?<$1>[^/]+)')
      .replace(/\{\{(\w+)\}\}/g, '(?<$1>[^/]+)') + '$';
  }

  _componentTemplateByName(name) {
    const comp = (this.ast.components || []).find(entry => entry.name === name);
    if (!comp) return '';
    return this._renderChildren(comp.children || [], {});
  }

  _guardByNameStatic(name) {
    return (this.ast.guards || []).find(guard => guard.name === name) || null;
  }

  _staticRouteAccess(route) {
    if (!route) return { ok: false, reason: 'not-found', redirect: null };
    if (route.guard) {
      const guard = this._guardByNameStatic(route.guard);
      if (guard && (guard.requireAuth || guard.requireRole)) {
        return {
          ok: false,
          reason: guard.requireRole ? 'role' : 'auth',
          redirect: guard.redirect || route.redirect || (this.ast.auth && this._normalizedAuthConfig().onLogoutNavigateTo) || '/login'
        };
      }
    }
    if (route.requireAuth || route.requireRole) {
      return {
        ok: false,
        reason: route.requireRole ? 'role' : 'auth',
        redirect: route.redirect || (this.ast.auth && this._normalizedAuthConfig().onLogoutNavigateTo) || '/login'
      };
    }
    return { ok: true, reason: null, redirect: null };
  }

  _renderProtectedRouteShell(access) {
    if (access.componentHtml) return access.componentHtml;
    const heading = access.reason === 'role' ? 'Access Restricted' : 'Sign In Required';
    const message = access.reason === 'role'
      ? 'This enterprise route requires a role your current session has not yet proven.'
      : 'This enterprise route requires authentication before the secure content can render.';
    const redirectHtml = access.redirect
      ? `<p class="ncui-text"><a class="ncui-link" href="${this._esc(access.redirect)}">Continue to ${this._esc(access.redirect)}</a></p>`
      : '';
    return `<div class="ncui-section ncui-centered"><div class="ncui-container"><h2 class="ncui-heading">${heading}</h2><p class="ncui-text">${message}</p>${redirectHtml}</div></div>`;
  }

  _renderRouteComponent(routePath) {
    for (const route of this.ast.routes || []) {
      if (!this._isStaticRoute(route.path)) continue;
      if (route.path !== routePath) continue;
      const access = this._staticRouteAccess(route);
      if (!access.ok) {
        if (route.unauthorizedComponent) {
          access.componentHtml = this._componentTemplateByName(route.unauthorizedComponent);
        }
        return this._renderProtectedRouteShell(access);
      }
      try {
        const html = this._componentTemplateByName(route.component);
        if (!html) throw new Error(`Component "${route.component}" was not found.`);
        return html;
      } catch (err) {
        if (route.errorComponent) {
          const fallback = this._componentTemplateByName(route.errorComponent);
          if (fallback) return fallback;
        }
        return `<div class="ncui-section ncui-centered"><div class="ncui-container"><h2 class="ncui-heading">Route Error</h2><p class="ncui-text">${this._esc(err && err.message ? err.message : 'This route failed to render.')}</p></div></div>`;
      }
    }
    return '';
  }

  _prerenderedOutletHTML(routePath) {
    if (!this._hasRoutes) return '';
    return this._renderRouteComponent(routePath) || '';
  }

  // ─── CSS ──────────────────────────────────────────────────────────────────

  _css() {
    const isDark = this.theme === 'dark';
    const bg = isDark ? '#0a0a0f' : '#fafafa';
    const bgCard = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const bgCardHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const textMain = isDark ? '#f0f0f5' : '#1a1a2e';
    const textSub = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)';
    const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const accent = this.accent;

    return `
:root{--ncui-accent:${accent};--ncui-accent-shift:${this._shiftHue(accent,60)};--ncui-bg:${bg};--ncui-bg-card:${bgCard};--ncui-bg-card-hover:${bgCardHover};--ncui-border:${border};--ncui-text:${textMain};--ncui-text-sub:${textSub};--ncui-text-muted:${textMuted};--ncui-input-bg:${inputBg};--ncui-font:'${this.font}',system-ui,sans-serif}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
body{font-family:var(--ncui-font);background:var(--ncui-bg);color:var(--ncui-text);line-height:1.7;overflow-x:hidden}

/* Container */
.ncui-container{max-width:1200px;margin:0 auto;padding:0 24px}

/* Shell */
.ncui-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.ncui-shell-main{display:flex;flex-direction:column;min-width:0}
.ncui-shell-content{padding:24px}
.ncui-sidebar{position:sticky;top:0;align-self:start;min-height:100vh;padding:24px 18px;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.86)'};border-right:1px solid var(--ncui-border);backdrop-filter:blur(20px)}
.ncui-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;border-bottom:1px solid var(--ncui-border);background:${isDark ? 'rgba(10,10,15,0.72)' : 'rgba(255,255,255,0.86)'};backdrop-filter:blur(20px);position:sticky;top:0;z-index:20}
.ncui-panel{border:1px solid var(--ncui-border);border-radius:20px;padding:18px;margin:18px 0;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.82)'}}
.ncui-panel-title{font-weight:700;color:var(--ncui-text);margin-bottom:12px}
.ncui-panel-body{display:block}
.ncui-banner{padding:12px 18px;border-bottom:1px solid var(--ncui-border)}
.ncui-banner-info{background:${accent}14}
.ncui-banner-warning{background:rgba(251,191,36,0.12)}
.ncui-banner-error{background:rgba(248,113,113,0.12)}
.ncui-banner-text{margin:0;color:var(--ncui-text-sub)}
@media(max-width:960px){
  .ncui-shell{grid-template-columns:1fr}
  .ncui-sidebar{position:relative;min-height:auto;border-right:none;border-bottom:1px solid var(--ncui-border)}
}

/* Navigation */
.ncui-nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:16px 0;transition:all .3s;backdrop-filter:blur(20px);background:${isDark ? 'rgba(10,10,15,0.8)' : 'rgba(250,250,250,0.85)'};border-bottom:1px solid var(--ncui-border)}
.ncui-nav.ncui-nav-compact{padding:10px 0}
.ncui-nav-inner{display:flex;align-items:center;justify-content:space-between}
.ncui-brand{font-weight:700;font-size:1.25rem;color:var(--ncui-text);text-decoration:none;letter-spacing:-0.02em}
.ncui-nav-links{display:flex;gap:32px;align-items:center}
.ncui-nav-links .ncui-link{font-size:.9rem;font-weight:500}
.ncui-nav-toggle{display:none;background:none;border:none;color:var(--ncui-text);cursor:pointer;width:28px;height:28px}
.ncui-nav-toggle svg{width:24px;height:24px}
@media(max-width:768px){
  .ncui-nav-links{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;padding:24px;gap:16px;background:${isDark ? 'rgba(10,10,15,0.95)' : 'rgba(250,250,250,0.95)'};border-bottom:1px solid var(--ncui-border);backdrop-filter:blur(20px)}
  .ncui-nav-inner.open .ncui-nav-links{display:flex}
  .ncui-nav-toggle{display:block}
}

/* Sections */
.ncui-section{padding:100px 0;position:relative}
.ncui-hero{min-height:100vh;display:flex;align-items:center;padding-top:80px}
.ncui-hero .ncui-container{width:100%}
.ncui-centered{text-align:center}
.ncui-centered .ncui-row{justify-content:center}
.ncui-fullscreen{min-height:100vh;display:flex;align-items:center}
.ncui-section-img{position:relative}
.ncui-section-img::before{content:'';position:absolute;inset:0;opacity:0.15;z-index:0}
.ncui-section-img .ncui-container{position:relative;z-index:1}

/* Typography */
.ncui-heading{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:16px}
.ncui-gradient-text{background:linear-gradient(135deg,var(--ncui-accent),var(--ncui-accent-shift));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ncui-sub{font-size:clamp(1.1rem,2.5vw,1.5rem);color:var(--ncui-text-sub);font-weight:400;margin-bottom:12px}
.ncui-text{color:var(--ncui-text-sub);font-size:1.05rem;max-width:640px;margin-bottom:16px;line-height:1.8}
.ncui-centered .ncui-text{margin-left:auto;margin-right:auto}

/* Buttons */
.ncui-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border-radius:12px;font-size:.95rem;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);font-family:inherit}
.ncui-btn-primary{background:linear-gradient(135deg,var(--ncui-accent),${this._shiftHue(accent,40)});color:#fff;box-shadow:0 4px 24px ${accent}44}
.ncui-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px ${accent}66}
.ncui-btn-outline{background:transparent;color:var(--ncui-accent);border:1.5px solid var(--ncui-accent);backdrop-filter:blur(8px)}
.ncui-btn-outline:hover{background:${accent}18;transform:translateY(-2px)}
.ncui-btn-glass{background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};color:var(--ncui-text);border:1px solid var(--ncui-border);backdrop-filter:blur(12px)}
.ncui-btn-glass:hover{background:${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'};transform:translateY(-2px)}
.ncui-btn-gradient{background:linear-gradient(135deg,var(--ncui-accent),${this._shiftHue(accent,120)});color:#fff;box-shadow:0 4px 24px ${accent}44}
.ncui-btn-gradient:hover{transform:translateY(-2px);box-shadow:0 8px 32px ${accent}66}
.ncui-btn-busy{pointer-events:none;opacity:.8}

/* Row */
.ncui-row{display:flex;flex-wrap:wrap;gap:16px;margin:24px 0;align-items:center}

/* Grid */
.ncui-grid{display:grid;gap:24px;margin:40px 0}
.ncui-grid-2{grid-template-columns:repeat(2,1fr)}
.ncui-grid-3{grid-template-columns:repeat(3,1fr)}
.ncui-grid-4{grid-template-columns:repeat(4,1fr)}
@media(max-width:900px){
  .ncui-grid-3,.ncui-grid-4{grid-template-columns:repeat(2,1fr)}
  .ncui-grid-responsive{grid-template-columns:repeat(2,1fr)}
  .ncui-grid-tablet-1{grid-template-columns:repeat(1,1fr)}
  .ncui-grid-tablet-2{grid-template-columns:repeat(2,1fr)}
  .ncui-grid-tablet-3{grid-template-columns:repeat(3,1fr)}
  .ncui-grid-tablet-4{grid-template-columns:repeat(4,1fr)}
}
@media(max-width:600px){
  .ncui-grid{grid-template-columns:1fr !important}
  .ncui-grid-responsive{grid-template-columns:repeat(1,1fr) !important}
  .ncui-grid-mobile-1{grid-template-columns:repeat(1,1fr) !important}
  .ncui-grid-mobile-2{grid-template-columns:repeat(2,1fr) !important}
  .ncui-grid-mobile-3{grid-template-columns:repeat(3,1fr) !important}
  .ncui-grid-mobile-4{grid-template-columns:repeat(4,1fr) !important}
}

/* Cards */
.ncui-card{background:var(--ncui-bg-card);border:1px solid var(--ncui-border);border-radius:20px;padding:36px 28px;transition:all .4s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
.ncui-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--ncui-accent),transparent);opacity:0;transition:opacity .4s}
.ncui-card:hover{transform:translateY(-6px);background:var(--ncui-bg-card-hover);border-color:${accent}33;box-shadow:0 20px 60px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}}
.ncui-card:hover::before{opacity:1}
.ncui-card-clickable{cursor:pointer}
.ncui-card-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,${accent}22,${accent}08);display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:var(--ncui-accent)}
.ncui-card-icon svg{width:26px;height:26px}
.ncui-card .ncui-heading{font-size:1.25rem;margin-bottom:8px}
.ncui-card .ncui-text{font-size:.95rem;margin-bottom:0}

/* Links */
.ncui-link{color:var(--ncui-text-sub);text-decoration:none;transition:color .2s;font-weight:500}
.ncui-link:hover{color:var(--ncui-accent)}

/* Lists */
.ncui-list{list-style:none;margin:20px 0}
.ncui-list-item{display:flex;align-items:center;gap:12px;padding:10px 0;color:var(--ncui-text-sub);font-size:1.05rem}
.ncui-check{width:22px;height:22px;border-radius:50%;background:${accent}18;color:var(--ncui-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ncui-check svg{width:14px;height:14px}

/* Images */
.ncui-img{width:100%;border-radius:16px;margin:20px 0}
.ncui-img-rounded{border-radius:50%}

/* Video */
.ncui-video{width:100%;border-radius:16px;margin:20px 0}

/* Forms */
.ncui-form{max-width:520px;margin:32px 0;display:flex;flex-direction:column;gap:20px}
.ncui-centered .ncui-form{margin-left:auto;margin-right:auto}
.ncui-form-status{min-height:20px;font-size:.92rem;color:var(--ncui-text-sub)}
.ncui-form[data-ncui-status="error"] .ncui-form-status{color:#f87171}
.ncui-form[data-ncui-status="success"] .ncui-form-status{color:#4ade80}
.ncui-field{display:flex;flex-direction:column;gap:6px}
.ncui-field label{font-size:.85rem;font-weight:600;color:var(--ncui-text-sub);text-transform:uppercase;letter-spacing:0.05em}
.ncui-field input,.ncui-field textarea{background:var(--ncui-input-bg);border:1.5px solid var(--ncui-border);border-radius:12px;padding:14px 18px;color:var(--ncui-text);font-size:1rem;font-family:inherit;transition:all .3s;outline:none}
.ncui-field input:focus,.ncui-field textarea:focus{border-color:var(--ncui-accent);box-shadow:0 0 0 3px ${accent}22}
.ncui-field [data-invalid="true"]{border-color:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,0.18)}
.ncui-field input::placeholder,.ncui-field textarea::placeholder{color:var(--ncui-text-muted)}
.ncui-field-error{min-height:18px;font-size:.82rem;color:#f87171}
.ncui-form .ncui-btn{align-self:flex-start;margin-top:8px}
.ncui-table-wrap{margin:28px 0;overflow:auto;border:1px solid var(--ncui-border);border-radius:18px;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)'};backdrop-filter:blur(12px)}
.ncui-table{width:100%;border-collapse:collapse;min-width:420px}
.ncui-table-head{text-align:left;padding:14px 16px;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ncui-text-muted);border-bottom:1px solid var(--ncui-border)}
.ncui-table-cell{padding:14px 16px;border-bottom:1px solid var(--ncui-border);color:var(--ncui-text)}
.ncui-table tbody tr:last-child .ncui-table-cell{border-bottom:none}
.ncui-table-empty .ncui-table-cell{text-align:center;color:var(--ncui-text-muted)}

/* Stats */
.ncui-stat{text-align:center;padding:20px}
.ncui-stat-val{display:block;font-size:2.5rem;font-weight:800;letter-spacing:-0.03em;background:linear-gradient(135deg,var(--ncui-accent),var(--ncui-accent-shift));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ncui-stat-label{display:block;font-size:.9rem;color:var(--ncui-text-muted);margin-top:4px;font-weight:500}

/* Badge */
.ncui-badge{display:inline-block;padding:6px 16px;border-radius:100px;font-size:.8rem;font-weight:600;background:${accent}18;color:var(--ncui-accent);letter-spacing:0.03em}

/* Alerts */
.ncui-alert{display:flex;align-items:flex-start;gap:12px;padding:16px 18px;border-radius:16px;border:1px solid var(--ncui-border);margin:18px 0;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)'};position:relative}
.ncui-alert-info{border-color:${accent}44;background:${accent}14}
.ncui-alert-success{border-color:rgba(74,222,128,0.42);background:rgba(74,222,128,0.12)}
.ncui-alert-warning{border-color:rgba(251,191,36,0.42);background:rgba(251,191,36,0.12)}
.ncui-alert-error{border-color:rgba(248,113,113,0.42);background:rgba(248,113,113,0.12)}
.ncui-alert-body{flex:1}
.ncui-alert-text{margin:0;color:var(--ncui-text-sub);max-width:none}
.ncui-alert-close{background:none;border:none;color:var(--ncui-text-muted);font-size:1.25rem;cursor:pointer;line-height:1;padding:0}

/* Loading */
.ncui-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px 0}
.ncui-loading-spinner{min-height:80px}
.ncui-loading-small .ncui-spinner{width:22px;height:22px}
.ncui-loading-medium .ncui-spinner{width:32px;height:32px}
.ncui-loading-large .ncui-spinner{width:44px;height:44px}
.ncui-spinner{border-radius:50%;border:3px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'};border-top-color:var(--ncui-accent);animation:ncui-spin .85s linear infinite}
.ncui-loading-text{margin:0;color:var(--ncui-text-sub);font-size:.95rem}
.ncui-loading-skeleton{align-items:stretch}
.ncui-skeleton-line{height:14px;border-radius:999px;background:linear-gradient(90deg,${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'},${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'},${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'});background-size:200% 100%;animation:ncui-shimmer 1.4s ease-in-out infinite}
.ncui-skeleton-line-1{width:100%}
.ncui-skeleton-line-2{width:82%}
.ncui-skeleton-line-3{width:66%}

/* Markdown */
.ncui-markdown{color:var(--ncui-text-sub);line-height:1.8}
.ncui-markdown h2,.ncui-markdown h3,.ncui-markdown h4{color:var(--ncui-text);margin:18px 0 10px;font-weight:700}
.ncui-markdown p{margin:0 0 14px}
.ncui-markdown ul{padding-left:20px;margin:0 0 14px}
.ncui-markdown li{margin:6px 0}
.ncui-markdown code{background:${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};padding:2px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}
.ncui-markdown a{color:var(--ncui-accent);text-decoration:none}

/* External */
.ncui-external{border:1px dashed var(--ncui-border);border-radius:18px;padding:16px;margin:18px 0;min-height:120px;background:${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)'}}
.ncui-external-fallback{color:var(--ncui-text-muted);font-size:.92rem}

/* Live + Graph */
.ncui-live{border:1px solid var(--ncui-border);border-radius:18px;padding:16px;margin:18px 0;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.76)'}}
.ncui-live-status{font-size:.85rem;color:var(--ncui-text-muted);margin-bottom:10px}
.ncui-live-body{display:flex;flex-direction:column;gap:8px;color:var(--ncui-text-sub);font-size:.95rem}
.ncui-live-event{padding:10px 12px;border-radius:12px;background:${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
.ncui-graph{border:1px solid var(--ncui-border);border-radius:20px;padding:18px;margin:18px 0;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)'}}
.ncui-graph-canvas{display:grid;gap:14px}
.ncui-graph-node{padding:14px 16px;border-radius:14px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};border:1px solid var(--ncui-border)}
.ncui-graph-node-title{font-weight:700;color:var(--ncui-text);margin-bottom:4px}
.ncui-graph-node-meta{font-size:.84rem;color:var(--ncui-text-muted)}

/* Drag + Drop */
.ncui-drag-list,.ncui-drop-zone{border:1px solid var(--ncui-border);border-radius:18px;padding:16px;margin:18px 0;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)'}}
.ncui-drag-title,.ncui-drop-title{font-weight:700;color:var(--ncui-text);margin-bottom:10px}
.ncui-drag-items,.ncui-drop-items{display:flex;flex-direction:column;gap:10px;min-height:72px}
.ncui-drag-item{padding:12px 14px;border-radius:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};border:1px solid var(--ncui-border);cursor:grab}
.ncui-drag-item:active{cursor:grabbing}
.ncui-drop-zone.ncui-drop-hover{border-color:var(--ncui-accent);box-shadow:0 0 0 3px ${accent}22}

/* Flow */
.ncui-flow{position:relative;border:1px solid var(--ncui-border);border-radius:20px;padding:0;margin:18px 0;min-height:360px;background:${isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' : 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.75))'};overflow:hidden}
.ncui-flow-edges{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ncui-flow-canvas{position:relative;min-height:360px}
.ncui-flow-edge{stroke:${accent};stroke-width:2;fill:none;opacity:.75}
.ncui-flow-node{position:absolute;min-width:160px;max-width:220px;padding:12px 14px;border-radius:14px;background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.96)'};border:1px solid var(--ncui-border);box-shadow:0 10px 30px ${isDark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.08)'};cursor:grab;user-select:none}
.ncui-flow-node:active{cursor:grabbing}
.ncui-flow-node-title{font-weight:700;color:var(--ncui-text);margin-bottom:4px}
.ncui-flow-node-meta{font-size:.84rem;color:var(--ncui-text-muted)}

/* Progress */
.ncui-progress{margin:12px 0}
.ncui-progress-label{font-size:.85rem;font-weight:600;color:var(--ncui-text-sub);margin-bottom:6px;display:block}
.ncui-progress-bar{height:8px;border-radius:4px;background:var(--ncui-input-bg);overflow:hidden}
.ncui-progress-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ncui-accent),var(--ncui-accent-shift));transition:width 1s cubic-bezier(.4,0,.2,1)}
${Array.from({ length: 101 }, (_, i) => `.ncui-progress-fill-${i}{width:${i}%}`).join('\n')}
@keyframes ncui-spin{to{transform:rotate(360deg)}}
@keyframes ncui-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* Divider */
.ncui-divider{border:none;height:1px;background:var(--ncui-border);margin:40px 0}

/* Spacer */
.ncui-spacer{height:60px}
.ncui-hidden{display:none !important}

/* Footer */
.ncui-footer{padding:60px 0;border-top:1px solid var(--ncui-border);text-align:center}
.ncui-footer .ncui-text{color:var(--ncui-text-muted);font-size:.9rem}
.ncui-footer .ncui-row{justify-content:center}
.ncui-footer .ncui-link{font-size:.9rem}

/* Modal */
.ncui-modal{display:none;position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);justify-content:center;align-items:center}
.ncui-modal.ncui-modal-open{display:flex}
.ncui-modal-content{background:var(--ncui-bg);border:1px solid var(--ncui-border);border-radius:20px;padding:40px;max-width:560px;width:90%;position:relative;max-height:80vh;overflow-y:auto}
.ncui-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--ncui-text-sub);font-size:1.5rem;cursor:pointer;line-height:1}

/* Tabs */
.ncui-tabs{margin:24px 0}
.ncui-tabs-header{display:flex;gap:4px;border-bottom:1px solid var(--ncui-border);margin-bottom:20px}
.ncui-tab-btn{background:none;border:none;padding:12px 24px;color:var(--ncui-text-sub);font-size:.95rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;font-family:inherit}
.ncui-tab-btn.ncui-tab-active{color:var(--ncui-accent);border-bottom-color:var(--ncui-accent)}
.ncui-tab-btn:hover{color:var(--ncui-text)}
.ncui-tab-panel-hidden{display:none}

/* Animations */
.ncui-anim-fade-up .ncui-container>*{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-fade-up .ncui-container>.ncui-visible{opacity:1;transform:translateY(0)}

.ncui-anim-fade-in .ncui-container>*{opacity:0;transition:opacity .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-fade-in .ncui-container>.ncui-visible{opacity:1}

.ncui-anim-slide-left .ncui-container>*{opacity:0;transform:translateX(-40px);transition:all .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-slide-left .ncui-container>.ncui-visible{opacity:1;transform:translateX(0)}

.ncui-anim-slide-right .ncui-container>*{opacity:0;transform:translateX(40px);transition:all .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-slide-right .ncui-container>.ncui-visible{opacity:1;transform:translateX(0)}

.ncui-anim-zoom .ncui-container>*{opacity:0;transform:scale(0.9);transition:all .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-zoom .ncui-container>.ncui-visible{opacity:1;transform:scale(1)}

.ncui-anim-stagger .ncui-container>*{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.4,0,.2,1)}
.ncui-anim-stagger .ncui-container>.ncui-visible{opacity:1;transform:translateY(0)}
.ncui-anim-stagger .ncui-container>*:nth-child(1){transition-delay:.1s}
.ncui-anim-stagger .ncui-container>*:nth-child(2){transition-delay:.2s}
.ncui-anim-stagger .ncui-container>*:nth-child(3){transition-delay:.3s}
.ncui-anim-stagger .ncui-container>*:nth-child(4){transition-delay:.4s}
.ncui-anim-stagger .ncui-container>*:nth-child(5){transition-delay:.5s}
.ncui-anim-stagger .ncui-container>*:nth-child(6){transition-delay:.6s}

.ncui-anim-stagger .ncui-grid>.ncui-card{opacity:0;transform:translateY(30px);transition:all .6s cubic-bezier(.4,0,.2,1)}
.ncui-anim-stagger .ncui-grid>.ncui-card.ncui-visible{opacity:1;transform:translateY(0)}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(1){transition-delay:.1s}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(2){transition-delay:.2s}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(3){transition-delay:.3s}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(4){transition-delay:.4s}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(5){transition-delay:.5s}
.ncui-anim-stagger .ncui-grid>.ncui-card:nth-child(6){transition-delay:.6s}

.ncui-anim-bounce{animation:ncuiBounce .6s ease}
@keyframes ncuiBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}

.ncui-anim-slide-left-el{animation:ncuiSlideLeft .5s ease forwards}
@keyframes ncuiSlideLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}

/* Background glow */
body::before{content:'';position:fixed;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 20%,${accent}08 0%,transparent 50%),radial-gradient(circle at 70% 80%,${this._shiftHue(accent, 120)}06 0%,transparent 50%);pointer-events:none;z-index:-1}

/* Scrollbar */
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--ncui-border);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:${accent}44}

/* Selection */
::selection{background:${accent}33;color:var(--ncui-text)}
${this._backgroundRules.map(rule => rule.css).join('\n')}
`;
  }

  // ─── Runtime JS (inlined) ─────────────────────────────────────────────────

  _runtimeJS() {
    return `
(function(){
  // Scroll-driven animations
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('ncui-visible');
      }
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});

  document.querySelectorAll('[class*=ncui-anim-] .ncui-container>*,[class*=ncui-anim-] .ncui-grid>.ncui-card').forEach(function(el){
    obs.observe(el);
  });

  // Nav scroll effect
  var nav=document.querySelector('.ncui-nav');
  if(nav){
    window.addEventListener('scroll',function(){
      nav.classList.toggle('ncui-nav-compact',window.scrollY>50);
    },{passive:true});
  }

  // Form handler
  document.querySelectorAll('.ncui-form').forEach(function(form){
    if(form.hasAttribute('data-ncui-submit') || form.hasAttribute('data-ncui-action-url'))return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('.ncui-btn');
      if(btn){var orig=btn.textContent;btn.textContent='Sent!';btn.classList.add('ncui-btn-busy');setTimeout(function(){btn.textContent=orig;btn.classList.remove('ncui-btn-busy')},2000);}
    });
  });

  document.addEventListener('click',function(e){
    var navToggle=e.target.closest('[data-ncui-nav-toggle]');
    if(navToggle){
      var navInner=navToggle.closest('.ncui-nav-inner');
      if(navInner)navInner.classList.toggle('open');
      return;
    }

    var modalOpen=e.target.closest('[data-ncui-modal-open]');
    if(modalOpen){
      var modalId=modalOpen.getAttribute('data-ncui-modal-open');
      var modal=document.getElementById(modalId);
      if(modal)modal.classList.add('ncui-modal-open');
      return;
    }

    var modalClose=e.target.closest('[data-ncui-modal-close]');
    if(modalClose){
      var modalRoot=modalClose.closest('[data-ncui-modal]');
      if(modalRoot)modalRoot.classList.remove('ncui-modal-open');
      return;
    }

    var modalBackdrop=e.target.matches('[data-ncui-modal]') ? e.target : null;
    if(modalBackdrop){
      modalBackdrop.classList.remove('ncui-modal-open');
      return;
    }

    var tabButton=e.target.closest('[data-ncui-tab-btn]');
    if(tabButton){
      var groupId=tabButton.getAttribute('data-ncui-tab-btn');
      var idx=tabButton.getAttribute('data-ncui-tab-index');
      var panels=document.querySelectorAll('[data-tab-group="'+groupId+'"]');
      var tabsEl=document.getElementById(groupId);
      if(!tabsEl)return;
      var btns=tabsEl.querySelectorAll('.ncui-tab-btn');
      for(var i=0;i<panels.length;i++){
        panels[i].classList.toggle('ncui-tab-panel-hidden',String(i)!==String(idx));
      }
      for(var j=0;j<btns.length;j++){
        btns[j].classList.toggle('ncui-tab-active',String(j)===String(idx));
      }
    }
  });
})();
`;
  }

  // ─── App-level JS (state, actions, routing) ───────────────────────────────

  _storePath(target) {
    return String(target || '').replace(/^stores?\./, '');
  }

  _isStoreTarget(target) {
    return /^stores?\./.test(String(target || ''));
  }

  _compileStatementJS(stmt, actionParam) {
    if (!stmt) return '';

    if (stmt.type === 'set') {
      if (this._isStoreTarget(stmt.target)) {
        return `  _setStorePath(${JSON.stringify(this._storePath(stmt.target))},${this._compileExpr(stmt.expr)});\n`;
      }
      return `  _set(${JSON.stringify(stmt.target)},${this._compileExpr(stmt.expr)});\n`;
    }
    if (stmt.type === 'add') {
      const itemExpr = stmt.item === actionParam ? stmt.item : JSON.stringify(stmt.item);
      if (this._isStoreTarget(stmt.target)) {
        return `  _addToStorePath(${JSON.stringify(this._storePath(stmt.target))},${itemExpr});\n`;
      }
      return `  _addTo(${JSON.stringify(stmt.target)},${itemExpr});\n`;
    }
    if (stmt.type === 'toggle') {
      if (this._isStoreTarget(stmt.target)) {
        return `  _toggleStorePath(${JSON.stringify(this._storePath(stmt.target))});\n`;
      }
      return `  _toggle(${JSON.stringify(stmt.target)});\n`;
    }
    if (stmt.type === 'run') {
      return `  if (typeof window.action_${stmt.action} === 'function') { await window.action_${stmt.action}(); }\n`;
    }
    if (stmt.type === 'redirect') {
      return `  history.pushState(null,'',${JSON.stringify(stmt.path)});\n  if(typeof _resolve==='function')_resolve();\n`;
    }
    if (stmt.type === 'fetch') {
      const requester = stmt.withAuth ? '_auth.fetch' : '_requestWithTimeout';
      const method = JSON.stringify((stmt.method || 'GET').toUpperCase());
      let code = `  {\n`;
      code += `    var _fetchRes = await ${requester}(${JSON.stringify(stmt.url)},{method:${method},headers:{'Accept':'application/json'}});\n`;
      code += `    var _fetchType = _fetchRes.headers&&_fetchRes.headers.get?_fetchRes.headers.get('content-type')||'':'';\n`;
      code += `    var _fetchData = _fetchType.indexOf('application/json')!==-1 ? await _fetchRes.json() : await _fetchRes.text();\n`;
      code += `    if(!_fetchRes.ok){ throw new Error((_fetchData&&_fetchData.message)||('Request failed ('+_fetchRes.status+')')); }\n`;
      if (stmt.saveAs) {
        code += `    _set(${JSON.stringify(stmt.saveAs)}, _fetchData);\n`;
      }
      if (stmt.redirect) {
        code += `    history.pushState(null,'',${JSON.stringify(stmt.redirect)});\n    if(typeof _resolve==='function')_resolve();\n`;
      }
      code += `  }\n`;
      return code;
    }
    if (stmt.type === 'request') {
      const requester = stmt.withAuth ? '_auth.fetch' : '_requestWithTimeout';
      const method = JSON.stringify((stmt.method || 'POST').toUpperCase());
      const bodyExpr = stmt.bodyExpr ? this._compileExpr(stmt.bodyExpr) : 'null';
      let code = `  {\n`;
      code += `    var _requestBody = ${bodyExpr};\n`;
      code += `    var _requestOptions = {method:${method},headers:{'Accept':'application/json'}};\n`;
      code += `    if(_requestBody!==null&&_requestBody!==undefined&&${method}!=="GET"&&${method}!=="DELETE"){\n`;
      code += `      _requestOptions.headers['Content-Type']='application/json';\n`;
      code += `      _requestOptions.body=JSON.stringify(_requestBody);\n`;
      code += `    }\n`;
      code += `    var _requestRes = await ${requester}(${JSON.stringify(stmt.url)}, _requestOptions);\n`;
      code += `    var _requestType = _requestRes.headers&&_requestRes.headers.get?_requestRes.headers.get('content-type')||'':'';\n`;
      code += `    var _requestData = _requestType.indexOf('application/json')!==-1 ? await _requestRes.json() : await _requestRes.text();\n`;
      code += `    if(!_requestRes.ok){ throw new Error((_requestData&&_requestData.message)||('Request failed ('+_requestRes.status+')')); }\n`;
      if (stmt.saveAs) {
        code += `    _set(${JSON.stringify(stmt.saveAs)}, _requestData);\n`;
      }
      if (stmt.redirect) {
        code += `    history.pushState(null,'',${JSON.stringify(stmt.redirect)});\n    if(typeof _resolve==='function')_resolve();\n`;
      }
      code += `  }\n`;
      return code;
    }
    if (stmt.type === 'reload') {
      return `  _notify();\n`;
    }
    if (stmt.type === 'revalidate') {
      return `  if(window.NCUISSR&&typeof window.NCUISSR.revalidate==='function'){window.NCUISSR.revalidate(${JSON.stringify(stmt.path)});}\n`;
    }
    return '';
  }

  _mountTasksJS() {
    if (!this._hasLifecycle) return '';
    let js = 'async function _runMountTasks(){\n';
    for (const stmt of this.ast.lifecycle.mount || []) {
      js += this._compileStatementJS(stmt, null);
    }
    js += '}\n';
    return js;
  }

  _appJS() {
    if (!this._hasState && !this._hasStores && !this._hasComputed && !this._hasActions && !this._hasRoutes && !this._hasTables && !this._hasAuth && !this._hasGuards && !this._hasLifecycle && !this._hasComponents && !this._hasProviders && !this._hasServices && !this._hasStreams && !this._hasSockets && !this._hasGraphs && !this._hasFlows && !this._hasDragDrop) return '';

    let js = '(function(){\n';
    js += 'var _state={};\n';
    js += 'var _stores={};\n';
    for (const s of this.ast.states || []) {
      js += `_state[${JSON.stringify(s.name)}]=${JSON.stringify(s.initial)};\n`;
    }
    for (const s of this.ast.stores || []) {
      js += `_stores[${JSON.stringify(s.name)}]=${JSON.stringify(s.initial)};\n`;
    }
    js += `var _ssrPayload=(function(){var el=document.getElementById('ncui-ssr-data');if(!el)return null;try{return JSON.parse(el.textContent||'null');}catch(_){return null;}})();\n`;
    js += `if(_ssrPayload&&_ssrPayload.state&&typeof _ssrPayload.state==='object'){for(var _ssrKey in _ssrPayload.state){_state[_ssrKey]=_ssrPayload.state[_ssrKey];}}\n`;
    js += `if(_ssrPayload&&_ssrPayload.stores&&typeof _ssrPayload.stores==='object'){for(var _ssrStoreKey in _ssrPayload.stores){_stores[_ssrStoreKey]=_ssrPayload.stores[_ssrStoreKey];}}\n`;
    js += `var _listeners=[];\n`;
    js += `var _computed={};\n`;
    js += `var _routes=[];\n`;
    if (this._hasComputed) {
      for (const c of this.ast.computeds) {
        js += `_computed[${JSON.stringify(c.name)}]=function(){return ${this._compileExpr(c.expr)}};\n`;
      }
    }
    js += `var _authConfig=${JSON.stringify(this._normalizedAuthConfig())};\n`;
    js += `var _securityHeaders=${JSON.stringify(this._securityHeadersConfig())};\n`;
    js += `var _guards=${JSON.stringify((this.ast.guards || []).map(g => ({
      name: g.name,
      requireAuth: !!g.requireAuth,
      requireRole: g.requireRole || null,
      redirect: g.redirect || null
    })))};\n`;
    js += `var _security=window.NCUISecurity||null;\n`;
    js += `window.NCUISecurityHeaders=_securityHeaders;\n`;
    js += `function _get(k){return _state[k]}\n`;
    js += `function _set(k,v){_state[k]=v;_notify()}\n`;
    js += `function _toggle(k){_state[k]=!_state[k];_notify()}\n`;
    js += `function _addTo(k,v){if(Array.isArray(_state[k]))_state[k].push(v);_notify()}\n`;
    js += `function _readPath(obj,path){
  if(path==null||path==='')return obj;
  var cur=obj;
  var parts=String(path).split('.');
  for(var i=0;i<parts.length;i++){
    if(cur==null)return undefined;
    cur=cur[parts[i]];
  }
  return cur;
}
function _writePath(obj,path,value){
  if(path==null||path==='')return value;
  var parts=String(path).split('.');
  var cur=obj;
  for(var i=0;i<parts.length-1;i++){
    var part=parts[i];
    if(cur[part]==null||typeof cur[part]!=='object')cur[part]={};
    cur=cur[part];
  }
  cur[parts[parts.length-1]]=value;
  return value;
}
function _storeGet(path){
  return _readPath(_stores,path);
}
function _setStorePath(path,value){
  _writePath(_stores,path,value);
  _notify();
}
function _toggleStorePath(path){
  _writePath(_stores,path,!_readPath(_stores,path));
  _notify();
}
function _addToStorePath(path,value){
  var current=_readPath(_stores,path);
  if(!Array.isArray(current)){
    current=[];
    _writePath(_stores,path,current);
  }
  current.push(value);
  _notify();
}
function _exprValue(expr,row){
  if(expr==null)return '';
  var raw=String(expr).trim();
  if(raw==='')return '';
  if(raw==='true')return true;
  if(raw==='false')return false;
  if(/^[-]?\\d+(\\.\\d+)?$/.test(raw))return Number(raw);
  if((raw[0]==='\"'&&raw[raw.length-1]==='\"')||(raw[0]===\"'\"&&raw[raw.length-1]===\"'\"))return raw.slice(1,-1);
  if(row && raw.indexOf('item.')===0)return _readPath(row, raw.slice(5));
  if(row && Object.prototype.hasOwnProperty.call(row, raw))return row[raw];
  if(raw.indexOf('store.')===0)return _readPath(_stores, raw.slice(6));
  if(raw.indexOf('stores.')===0)return _readPath(_stores, raw.slice(7));
  if(raw.indexOf('state.')===0)return _readPath(_state, raw.slice(6));
  if(Object.prototype.hasOwnProperty.call(_computed, raw))return _computed[raw]();
  var fromStores=_readPath(_stores, raw);
  if(fromStores!==undefined)return fromStores;
  var fromState=_readPath(_state, raw);
  if(fromState!==undefined)return fromState;
  return '';
}
function _hasRole(role){
  var user=_state.user||{};
  var roles=user.roles||_state.roles||[];
  if(typeof roles==='string')roles=[roles];
  return Array.isArray(roles)&&roles.indexOf(role)!==-1;
}
function _audit(event,details){
  if(_security&&_security.audit&&typeof _security.audit.log==='function'){
    try{_security.audit.log(event,details||{});}catch(_){}
  }
}
function _mergeState(snapshot){
  if(!snapshot||typeof snapshot!=='object')return;
  for(var key in snapshot){_state[key]=snapshot[key];}
}
function _routeContext(path,params,route){
  _state.currentRoute=path||window.location.pathname||'/';
  _state.routeParams=params||{};
  _state.currentRouteName=route&&route.component?route.component:null;
  if(_ssrPayload&&_ssrPayload.path===_state.currentRoute&&_ssrPayload.state){
    _mergeState(_ssrPayload.state);
  }
}
function _csrfToken(){
  if(_security&&_security.csrf&&typeof _security.csrf.getToken==='function'){
    return _security.csrf.getToken()||'';
  }
  var meta=document.querySelector('meta[name="csrf-token"]');
  return meta?meta.getAttribute('content')||'':'';
}
function _usesBackendSession(){
  return String(_authConfig.sessionMode||'backend').toLowerCase()==='backend';
}
function _isSameOriginEndpoint(url){
  if(!url)return false;
  if(url.charAt(0)==='/')return true;
  try{
    var parsed=new URL(url, window.location.origin);
    return parsed.origin===window.location.origin;
  }catch(_){
    return false;
  }
}
function _assertBackendEndpoint(url,name){
  if(!_usesBackendSession())return;
  if(!_isSameOriginEndpoint(url)){
    var message=(name||'Auth endpoint')+' must be same-origin when auth session mode is "backend".';
    _audit('auth.backend_endpoint_rejected',{endpoint:url,name:name||null});
    throw new Error(message);
  }
}
function _applyAuthResult(data){
  data=data||{};
  var token=null;
  var refresh=null;
  if(_usesBackendSession()){
    token=data.session_token||data.app_token||data.token||null;
    refresh=data.session_refresh_token||null;
  } else {
    token=data.token||data.access_token||data.session_token||data.app_token||null;
    refresh=data.refresh_token||data.session_refresh_token||null;
  }
  if(token)_authStore.setToken(token);
  if(refresh)_authStore.setRefresh(refresh);
  if(data.user)_state.user=data.user;
  _state.authenticated=!!token||!!_state.user||!!data.authenticated||!!data.sessionEstablished;
  _state.roles=_state.user&&Array.isArray(_state.user.roles)?_state.user.roles:[];
  return { token: token, refresh: refresh };
}
function _authStorage(){
  var mode=(_authConfig.tokenStore||'session').toLowerCase();
  if(mode==='memory'){
    var memToken=null;
    var memRefresh=null;
    return {
      getToken:function(){return memToken;},
      setToken:function(v){memToken=v;},
      getRefresh:function(){return memRefresh;},
      setRefresh:function(v){memRefresh=v;},
      clear:function(){memToken=null;memRefresh=null;}
    };
  }
  if(mode==='local'){
    return {
      getToken:function(){try{return localStorage.getItem('ncui_auth_token');}catch(_){return null;}},
      setToken:function(v){try{if(v==null)localStorage.removeItem('ncui_auth_token');else localStorage.setItem('ncui_auth_token',v);}catch(_){}},
      getRefresh:function(){try{return localStorage.getItem('ncui_refresh_token');}catch(_){return null;}},
      setRefresh:function(v){try{if(v==null)localStorage.removeItem('ncui_refresh_token');else localStorage.setItem('ncui_refresh_token',v);}catch(_){}},
      clear:function(){try{localStorage.removeItem('ncui_auth_token');localStorage.removeItem('ncui_refresh_token');}catch(_){}}
    };
  }
  if(mode==='cookie'){
    return {
      getToken:function(){var m=document.cookie.match(/(?:^|; )ncui_auth_token=([^;]+)/);return m?decodeURIComponent(m[1]):null;},
      setToken:function(v){document.cookie='ncui_auth_token='+(v?encodeURIComponent(v):'')+'; path=/; SameSite=Strict; Secure';},
      getRefresh:function(){var m=document.cookie.match(/(?:^|; )ncui_refresh_token=([^;]+)/);return m?decodeURIComponent(m[1]):null;},
      setRefresh:function(v){document.cookie='ncui_refresh_token='+(v?encodeURIComponent(v):'')+'; path=/; SameSite=Strict; Secure';},
      clear:function(){document.cookie='ncui_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';document.cookie='ncui_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';}
    };
  }
  return {
    getToken:function(){try{return sessionStorage.getItem('ncui_auth_token');}catch(_){return null;}},
    setToken:function(v){try{if(v==null)sessionStorage.removeItem('ncui_auth_token');else sessionStorage.setItem('ncui_auth_token',v);}catch(_){}},
    getRefresh:function(){try{return sessionStorage.getItem('ncui_refresh_token');}catch(_){return null;}},
    setRefresh:function(v){try{if(v==null)sessionStorage.removeItem('ncui_refresh_token');else sessionStorage.setItem('ncui_refresh_token',v);}catch(_){}},
    clear:function(){try{sessionStorage.removeItem('ncui_auth_token');sessionStorage.removeItem('ncui_refresh_token');}catch(_){}}
  };
}
var _authStore=_authStorage();
var _refreshTimer=null;
function _decodeJwt(token){
  if(!token)return null;
  if(_security&&_security.jwt&&typeof _security.jwt.decode==='function')return _security.jwt.decode(token);
  try{
    var parts=token.split('.');
    if(parts.length!==3)return null;
    var payload=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    while(payload.length%4!==0)payload+='=';
    return JSON.parse(atob(payload));
  }catch(_){return null;}
}
function _isJwtExpired(token){
  if(!token)return true;
  if(_security&&_security.jwt&&typeof _security.jwt.isExpired==='function')return _security.jwt.isExpired(token);
  var payload=_decodeJwt(token);
  return !payload||!payload.exp||Date.now()>=payload.exp*1000;
}
function _scheduleRefresh(){
  if(_refreshTimer){clearTimeout(_refreshTimer);_refreshTimer=null;}
  var token=_authStore.getToken();
  var payload=_decodeJwt(token);
  if(!payload||!payload.exp)return;
  var delay=(payload.exp*1000)-Date.now()-60000;
  if(delay<=0)return;
  _refreshTimer=setTimeout(function(){
    _auth.refresh().catch(function(err){_audit('auth.refresh_failed',{message:err&&err.message?err.message:String(err)})});
  }, delay);
}
async function _requestWithTimeout(url, options){
  options=options||{};
  var timeoutMs=options.timeoutMs||15000;
  var controller=typeof AbortController!=='undefined'?new AbortController():null;
  var timer=null;
  if(controller){
    options.signal=controller.signal;
    timer=setTimeout(function(){controller.abort();}, timeoutMs);
  }
  try{
    return await fetch(url, options);
  } finally {
    if(timer)clearTimeout(timer);
  }
}
function _collectFormData(form){
  var data={};
  Array.prototype.forEach.call(form.querySelectorAll('[data-ncui-bind]'), function(field){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    if(field.type==='checkbox'){
      data[key]=!!field.checked;
      return;
    }
    data[key]=field.value;
  });
  if(typeof FormData!=='undefined'){
    var formData=new FormData(form);
    formData.forEach(function(value,key){
      if(!(key in data))data[key]=value;
    });
  }
  return data;
}
function _syncBoundInputs(){
  document.querySelectorAll('[data-ncui-bind]').forEach(function(field){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    var value=_exprValue(key);
    if(field.type==='checkbox'){
      field.checked=!!value;
      return;
    }
    if(document.activeElement===field)return;
    field.value=value==null?'':value;
  });
}
function _validatorMessage(rule){
  if(rule.rule==='required')return 'This field is required.';
  if(rule.rule==='email')return 'Enter a valid email address.';
  if(rule.rule==='url')return 'Enter a valid URL.';
  if(rule.rule==='minLength')return 'Use at least '+rule.value+' characters.';
  if(rule.rule==='maxLength')return 'Use no more than '+rule.value+' characters.';
  if(rule.rule==='strongPassword')return 'Use upper, lower, number, and symbol characters.';
  if(rule.rule==='pattern')return 'Use the expected format.';
  return 'Invalid value.';
}
function _validateValue(value, rules){
  var text=value==null?'':String(value);
  for(var i=0;i<rules.length;i++){
    var rule=rules[i];
    if(rule.rule==='required' && !text.trim())return _validatorMessage(rule);
    if(!text.trim())continue;
    if(rule.rule==='email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(text))return _validatorMessage(rule);
    if(rule.rule==='url'){try{new URL(text);}catch(_){return _validatorMessage(rule);}}
    if(rule.rule==='minLength' && text.length<Number(rule.value||0))return _validatorMessage(rule);
    if(rule.rule==='maxLength' && text.length>Number(rule.value||0))return _validatorMessage(rule);
    if(rule.rule==='strongPassword' && !(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$/.test(text)))return _validatorMessage(rule);
    if(rule.rule==='pattern'){try{if(!(new RegExp(rule.value)).test(text))return _validatorMessage(rule);}catch(_){}}
  }
  return '';
}
function _showFieldError(field,message){
  var key=field.getAttribute('data-ncui-field')||field.name||field.id;
  var target=document.querySelector('[data-ncui-error-for="'+key+'"]');
  field.setAttribute('data-invalid', message ? 'true' : 'false');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if(target)target.textContent=message||'';
}
function _validateFieldElement(field){
  var raw=field.getAttribute('data-ncui-validators');
  if(!raw){_showFieldError(field,'');return '';}
  var rules=[];
  try{rules=JSON.parse(raw)||[];}catch(_){}
  var value=field.type==='checkbox' ? (field.checked ? 'true' : '') : field.value;
  var message=_validateValue(value,rules);
  _showFieldError(field,message);
  return message;
}
function _validateForm(form){
  var fields=form.querySelectorAll('[data-ncui-field]');
  var messages=[];
  for(var i=0;i<fields.length;i++){
    var message=_validateFieldElement(fields[i]);
    if(message)messages.push(message);
  }
  var status=form.querySelector('[data-ncui-form-status]');
  if(status)status.textContent=messages[0]||'';
  return messages.length===0;
}
`;
    js += this._mountTasksJS();
    js += `var _auth={
  config:_authConfig,
  token:function(){return _authStore.getToken();},
  refreshToken:function(){return _authStore.getRefresh();},
  isAuthenticated:function(){
    if(_usesBackendSession())return !!_state.authenticated||!!_state.user;
    var token=_authStore.getToken();
    return !!token&&!_isJwtExpired(token);
  },
  getUser:function(){
    if(_state.user)return _state.user;
    var token=_authStore.getToken();
    if(!token)return _state.user||null;
    var claims=_decodeJwt(token);
    if(!claims)return _state.user||null;
    var roles=claims.roles||claims.role||[];
    if(typeof roles==='string')roles=[roles];
    return {id:claims.sub||claims.id||null,name:claims.name||claims.preferred_username||null,email:claims.email||null,roles:roles,claims:claims};
  },
  hasRole:function(role){return _hasRole(role);},
  headers:function(extra){
    var headers=Object.assign({'Accept':'application/json'}, extra||{});
    var csrf=_csrfToken();
    if(csrf)headers['X-CSRF-Token']=csrf;
    var token=_authStore.getToken();
    if(token)headers[_authConfig.tokenHeader||'Authorization']=((_authConfig.tokenPrefix||'Bearer')+' '+token).trim();
    return headers;
  },
  syncState:function(){
    var user=this.getUser();
    _state.user=user;
    _state.authenticated=this.isAuthenticated();
    _state.roles=user&&Array.isArray(user.roles)?user.roles:[];
    _scheduleRefresh();
    _notify();
  },
  async login:function(credentials){
    if((_authConfig.type||'').toLowerCase()==='oauth'||(_authConfig.type||'').toLowerCase()==='pkce'){
      if(!credentials||Object.keys(credentials).length===0)return this.startLogin();
    }
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.loginEndpoint,'login endpoint');
    _state.authPending=true;
    _state.authError=null;
    _notify();
    var body=JSON.stringify(credentials||{});
    var res=await _requestWithTimeout(_authConfig.loginEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:body});
    if(!res.ok){
      var err={message:'Login failed'};
      try{err=await res.json();}catch(_){}
      _state.authPending=false;
      _state.authError=err.message||('Login failed ('+res.status+')');
      _audit('auth.login_failed',{status:res.status,message:_state.authError});
      _notify();
      throw new Error(err.message||('Login failed ('+res.status+')'));
    }
    var data=await res.json();
    _applyAuthResult(data);
    if(_usesBackendSession()){
      try{await this.verify();}catch(_){}
    } else {
      _state.user=data.user||this.getUser();
      _state.authenticated=this.isAuthenticated();
      _state.roles=_state.user&&Array.isArray(_state.user.roles)?_state.user.roles:[];
    }
    _state.authPending=false;
    _state.authError=null;
    _scheduleRefresh();
    _audit('auth.login_success',{user:_state.user&&(_state.user.id||_state.user.email||_state.user.name||null)});
    _notify();
    if(_authConfig.onLoginNavigateTo&&window.location.pathname!==_authConfig.onLoginNavigateTo){
      history.pushState(null,'',_authConfig.onLoginNavigateTo);
      if(typeof _resolve==='function')_resolve();
    }
    return data;
  },
  async logout:function(){
    _state.authPending=true;
    _notify();
    try{
      if(_usesBackendSession())_assertBackendEndpoint(_authConfig.logoutEndpoint,'logout endpoint');
      await _requestWithTimeout(_authConfig.logoutEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'})});
    }catch(_){}
    _authStore.clear();
    if(_refreshTimer){clearTimeout(_refreshTimer);_refreshTimer=null;}
    _state.user=null;
    _state.roles=[];
    _state.authenticated=false;
    _state.authPending=false;
    _state.authError=null;
    _audit('auth.logout',{});
    _notify();
    if(_authConfig.onLogoutNavigateTo&&window.location.pathname!==_authConfig.onLogoutNavigateTo){
      history.pushState(null,'',_authConfig.onLogoutNavigateTo);
      if(typeof _resolve==='function')_resolve();
    }
    return true;
  },
  async refresh:function(){
    _state.authPending=true;
    _notify();
    var payload={};
    var refreshToken=_authStore.getRefresh();
    if(refreshToken&&!_usesBackendSession())payload.refresh_token=refreshToken;
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.refreshEndpoint,'refresh endpoint');
    var res=await _requestWithTimeout(_authConfig.refreshEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
    if(!res.ok){
      _state.authPending=false;
      _state.authError='Refresh failed';
      _audit('auth.refresh_failed',{status:res.status});
      _notify();
      throw new Error('Refresh failed');
    }
    var data=await res.json();
    _applyAuthResult(data);
    _state.authPending=false;
    _state.authError=null;
    _audit('auth.refresh_success',{});
    if(_usesBackendSession()) await this.verify();
    else this.syncState();
    return data;
  },
  async fetch:function(url,options){
    options=options||{};
    var headers=this.headers(options.headers||{});
    var req=Object.assign({}, options, {headers:headers, credentials:options.credentials||'same-origin'});
    var res=await _requestWithTimeout(url, req);
    if(res.status===401&&(this.refreshToken()||_usesBackendSession())){
      try{
        await this.refresh();
        req.headers=this.headers(options.headers||{});
        res=await _requestWithTimeout(url, req);
      }catch(_){}
    }
    return res;
  },
  async startLogin:function(){
    if((_authConfig.type||'').toLowerCase()!=='oauth'&&(_authConfig.type||'').toLowerCase()!=='pkce')return false;
    if(!_authConfig.authEndpoint||!_authConfig.clientId||!_authConfig.redirectUri)throw new Error('OAuth auth config missing authEndpoint/clientId/redirectUri');
    var oauthSecurity=_security&&_security.oauth?_security.oauth:null;
    var state='ncui_'+Math.random().toString(36).slice(2);
    sessionStorage.setItem('ncui_oauth_state',state);
    var verifier=oauthSecurity&&oauthSecurity.generateCodeVerifier?oauthSecurity.generateCodeVerifier(64):state+state;
    sessionStorage.setItem('ncui_oauth_verifier',verifier);
    var challenge=oauthSecurity&&oauthSecurity.generateCodeChallenge?await oauthSecurity.generateCodeChallenge(verifier):verifier;
    var params=new URLSearchParams({response_type:'code',client_id:_authConfig.clientId,redirect_uri:_authConfig.redirectUri,scope:_authConfig.scope||'openid profile email',state:state,code_challenge:challenge,code_challenge_method:'S256'});
    if(_authConfig.audience)params.set('audience',_authConfig.audience);
    window.location.href=_authConfig.authEndpoint+'?'+params.toString();
    return true;
  },
  async exchangeCode:function(code,state){
    var expectedState=sessionStorage.getItem('ncui_oauth_state');
    if(expectedState&&state&&state!==expectedState){
      _audit('auth.oauth_state_mismatch',{expected:expectedState,received:state});
      throw new Error('OAuth state mismatch');
    }
    var exchangeEndpoint=_usesBackendSession()?(_authConfig.callbackEndpoint||''):(_authConfig.tokenEndpoint||'');
    if(_usesBackendSession()){
      _assertBackendEndpoint(exchangeEndpoint,'callback endpoint');
    } else if(!_authConfig.allowDirectProviderTokens&&(!_isSameOriginEndpoint(exchangeEndpoint))){
      _audit('auth.direct_provider_exchange_blocked',{endpoint:exchangeEndpoint});
      throw new Error('Direct provider token exchange in the browser is disabled. Exchange the code through your backend and issue an app session.');
    }
    if(!exchangeEndpoint)throw new Error('OAuth callback endpoint is required for code exchange');
    var verifier=sessionStorage.getItem('ncui_oauth_verifier')||'';
    var body={
      grant_type:'authorization_code',
      code:code,
      redirect_uri:_authConfig.redirectUri,
      client_id:_authConfig.clientId,
      code_verifier:verifier
    };
    var res=await _requestWithTimeout(exchangeEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify(body)});
    if(!res.ok)throw new Error('OAuth code exchange failed');
    var data=await res.json();
    _applyAuthResult(data);
    sessionStorage.removeItem('ncui_oauth_state');
    sessionStorage.removeItem('ncui_oauth_verifier');
    if(_usesBackendSession()) await this.verify();
    else this.syncState();
    _audit('auth.oauth_exchange_success',{});
    return data;
  },
  async verify:function(){
    var token=_authStore.getToken();
    if((!token&&!_usesBackendSession())||!_authConfig.verifyEndpoint)return false;
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.verifyEndpoint,'verify endpoint');
    var res=await _requestWithTimeout(_authConfig.verifyEndpoint,{method:'GET',credentials:'same-origin',headers:this.headers()});
    if(!res.ok){
      _authStore.clear();
      _state.user=null;
      _state.roles=[];
      _state.authenticated=false;
      _audit('auth.verify_failed',{status:res.status});
      _notify();
      return false;
    }
    var data=await res.json();
    if(data.user)_state.user=data.user;
    _audit('auth.verify_success',{});
    this.syncState();
    return data;
  },
  async init:function(){
    if(_security&&_security.csrf&&typeof _security.csrf.injectMeta==='function'&&!document.querySelector('meta[name="csrf-token"]')){
      _security.csrf.injectMeta();
    }
    if(typeof window!=='undefined'&&window.location&&window.location.search&&((_authConfig.type||'').toLowerCase()==='oauth'||(_authConfig.type||'').toLowerCase()==='pkce')){
      try{
        var params=new URLSearchParams(window.location.search);
        var code=params.get('code');
        var state=params.get('state');
        if(code){
          await this.exchangeCode(code,state);
          if(window.history&&typeof window.history.replaceState==='function'){
            var cleanPath=window.location.pathname+(window.location.hash||'');
            window.history.replaceState(null,'',cleanPath);
          }
        }
      }catch(err){
        _state.authError=err&&err.message?err.message:String(err);
        _audit('auth.oauth_exchange_failed',{message:_state.authError});
      }
    }
    try{
      await this.verify();
    }catch(err){
      _audit('auth.verify_failed',{message:err&&err.message?err.message:String(err)});
    }
    this.syncState();
  }
};
window.NCUIAuth=_auth;
window.NCUIRBAC={
  can:function(action,resource){
    var user=_auth.getUser()||{};
    var perms=user.permissions||[];
    if(!Array.isArray(perms))return false;
    return perms.indexOf('*')!==-1||perms.indexOf(action+':'+resource)!==-1||perms.indexOf(action+':*')!==-1;
  },
  hasRole:function(role){return _auth.hasRole(role);}
};
function _guardByName(name){
  for(var i=0;i<_guards.length;i++){if(_guards[i].name===name)return _guards[i];}
  return null;
}
function _routeAllowed(route){
  if(route.guard){
    var guard=_guardByName(route.guard);
    if(guard){
      if(guard.requireAuth && !_auth.isAuthenticated()) return {ok:false, redirect:guard.redirect||_authConfig.onLogoutNavigateTo||'/login'};
      if(guard.requireRole && !_auth.hasRole(guard.requireRole)) return {ok:false, redirect:guard.redirect||'/403'};
    }
  }
  if(route.requireAuth && !_auth.isAuthenticated()) return {ok:false, redirect:route.redirect||_authConfig.onLogoutNavigateTo||'/login'};
  if(route.requireRole && !_auth.hasRole(route.requireRole)) return {ok:false, redirect:route.redirect||'/403'};
  return {ok:true};
}
function _renderTables(){
  document.querySelectorAll('[data-ncui-table]').forEach(function(table){
    var source=table.getAttribute('data-ncui-table');
    var cols=[];
    try{cols=JSON.parse(table.getAttribute('data-ncui-columns')||'[]')}catch(_){}
    var rows=_exprValue(source);
    var body=table.querySelector('tbody');
    if(!body)return;
    if(!Array.isArray(rows)||rows.length===0){
      var colspan=Math.max(cols.length,1);
      body.innerHTML='<tr class="ncui-table-empty"><td class="ncui-table-cell" colspan="'+colspan+'">No data available</td></tr>';
      return;
    }
    body.innerHTML=rows.map(function(row){
      return '<tr>'+cols.map(function(col){
        var value=_exprValue(col.expr,row);
        if(value==null)value='';
        return '<td class="ncui-table-cell">'+String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</td>';
      }).join('')+'</tr>';
    }).join('');
  });
}
function _markdownToHtml(raw){
  var escaped=String(raw==null?'':raw)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  function inline(text){
    return String(text||'')
      .replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  }
  return escaped.split(/\n{2,}/).map(function(block){
    block=block.trim();
    if(!block)return '';
    if(/^###\s+/.test(block))return '<h4>'+inline(block.replace(/^###\s+/,''))+'</h4>';
    if(/^##\s+/.test(block))return '<h3>'+inline(block.replace(/^##\s+/,''))+'</h3>';
    if(/^#\s+/.test(block))return '<h2>'+inline(block.replace(/^#\s+/,''))+'</h2>';
    if(/^[-*]\s+/m.test(block)){
      var items=block.split(/\n/).map(function(line){return line.trim();}).filter(Boolean).map(function(line){return '<li>'+inline(line.replace(/^[-*]\s+/,''))+'</li>';}).join('');
      return '<ul>'+items+'</ul>';
    }
    return '<p>'+inline(block.replace(/\n/g,'<br>'))+'</p>';
  }).join('');
}
function _mountExternalNodes(){
  document.querySelectorAll('[data-ncui-external]').forEach(function(node){
    if(node.getAttribute('data-ncui-external-mounted')==='true')return;
    var name=node.getAttribute('data-ncui-external');
    var props={};
    try{props=JSON.parse(node.getAttribute('data-ncui-external-props')||'{}');}catch(_){}
    if(window.NCUIInterop&&typeof window.NCUIInterop.mountExternal==='function'){
      var mounted=window.NCUIInterop.mountExternal(name,node,props);
      if(mounted)node.setAttribute('data-ncui-external-mounted','true');
    }
  });
}
window.NCUISSR={
  payload:function(){return _ssrPayload;},
  routeParams:function(){return _state.routeParams||{};},
  path:function(){return _state.currentRoute||window.location.pathname||'/';},
  revalidate:function(path){
    var target=path||window.location.pathname||'/';
    if(target===window.location.pathname){window.location.reload();return true;}
    if(window.NCUIInterop&&typeof window.NCUIInterop.navigate==='function'){window.NCUIInterop.navigate(target);return true;}
    return false;
  }
};
window.NCUIStores={
  get:function(path){return _storeGet(path||'');},
  set:function(path,value){_setStorePath(path||'',value);return value;},
  toggle:function(path){_toggleStorePath(path||'');return true;},
  add:function(path,value){_addToStorePath(path||'',value);return true;},
  snapshot:function(){return JSON.parse(JSON.stringify(_stores));}
};
var _socketRegistry={};
function _assignCollectionTarget(target,value){
  target=String(target||'');
  if(/^stores?\./.test(target)){_setStorePath(target.replace(/^stores?\./,''),value);return;}
  if(Object.prototype.hasOwnProperty.call(_stores,target)){_setStorePath(target,value);return;}
  _set(target,value);
}
function _safeJsonText(value){
  return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _renderDragDrop(){
  document.querySelectorAll('[data-ncui-drag-source]').forEach(function(node){
    var source=node.getAttribute('data-ncui-drag-source')||'';
    var items=_exprValue(source);
    if(!Array.isArray(items))items=[];
    var body=node.querySelector('.ncui-drag-items');
    if(!body)return;
    body.innerHTML=items.map(function(item,index){
      var payload={source:source,index:index,item:item};
      var label=(item&&typeof item==='object')?(item.label||item.name||item.title||item.id||('Item '+(index+1))):String(item);
      return '<div class="ncui-drag-item" draggable="true" data-ncui-drag-payload="'+encodeURIComponent(JSON.stringify(payload))+'">'+_safeJsonText(label)+'</div>';
    }).join('');
  });
  document.querySelectorAll('[data-ncui-drop-target]').forEach(function(node){
    var target=node.getAttribute('data-ncui-drop-target')||'';
    var items=_exprValue(target);
    if(!Array.isArray(items))items=[];
    var body=node.querySelector('.ncui-drop-items');
    if(!body)return;
    body.innerHTML=items.map(function(item,index){
      var label=(item&&typeof item==='object')?(item.label||item.name||item.title||item.id||('Item '+(index+1))):String(item);
      return '<div class="ncui-drag-item">'+_safeJsonText(label)+'</div>';
    }).join('');
  });
}
function _renderGraphs(){
  document.querySelectorAll('[data-ncui-graph-kind]').forEach(function(node){
    var source=node.getAttribute('data-ncui-graph-source')||'';
    var kind=node.getAttribute('data-ncui-graph-kind')||'graph';
    var canvas=node.querySelector('.ncui-graph-canvas');
    if(!canvas)return;
    var data=source?_exprValue(source):null;
    if(window.NCUIInterop&&typeof window.NCUIInterop.mountExternal==='function'){
      var mounted=window.NCUIInterop.mountExternal('graph:'+kind, canvas, { kind: kind, data: data });
      if(mounted)return;
    }
    var nodes=[];
    if(Array.isArray(data))nodes=data;
    else if(data&&Array.isArray(data.nodes))nodes=data.nodes;
    else if(data&&typeof data==='object')nodes=Object.keys(data).map(function(key){return { id:key, label:key, meta:data[key] };});
    if(!nodes.length){
      canvas.innerHTML='<div class="ncui-graph-node"><div class="ncui-graph-node-title">No graph data</div><div class="ncui-graph-node-meta">Bind graph data with graph \"name\" from state_name.</div></div>';
      return;
    }
    canvas.innerHTML=nodes.map(function(entry,index){
      var title=entry.label||entry.name||entry.id||('Node '+(index+1));
      var meta=entry.meta||entry.status||entry.type||'';
      return '<div class="ncui-graph-node"><div class="ncui-graph-node-title">'+String(title).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div><div class="ncui-graph-node-meta">'+String(meta||kind).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div></div>';
    }).join('');
  });
}
function _renderFlows(){
  document.querySelectorAll('[data-ncui-flow-kind]').forEach(function(node){
    var source=node.getAttribute('data-ncui-flow-source')||'';
    var canvas=node.querySelector('.ncui-flow-canvas');
    var svg=node.querySelector('.ncui-flow-edges');
    if(!canvas||!svg)return;
    var data=source?_exprValue(source):null;
    var flow=data&&typeof data==='object'?data:{};
    var nodes=Array.isArray(flow.nodes)?flow.nodes:[];
    var edges=Array.isArray(flow.edges)?flow.edges:[];
    if(!nodes.length){
      canvas.innerHTML='<div class="ncui-flow-node" style="left:24px;top:24px;"><div class="ncui-flow-node-title">No flow data</div><div class="ncui-flow-node-meta">Bind a flow source with nodes and edges.</div></div>';
      svg.innerHTML='';
      return;
    }
    canvas.innerHTML=nodes.map(function(entry,index){
      var x=Number(entry.x!=null?entry.x:(40+(index%4)*200));
      var y=Number(entry.y!=null?entry.y:(40+Math.floor(index/4)*120));
      var title=entry.label||entry.name||entry.id||('Node '+(index+1));
      var meta=entry.meta||entry.status||entry.type||'';
      return '<div class="ncui-flow-node" data-ncui-flow-node="'+_safeJsonText(entry.id||String(index))+'" style="left:'+x+'px;top:'+y+'px;"><div class="ncui-flow-node-title">'+_safeJsonText(title)+'</div><div class="ncui-flow-node-meta">'+_safeJsonText(meta)+'</div></div>';
    }).join('');
    svg.innerHTML=edges.map(function(edge){
      var from=nodes.find(function(item){return String(item.id)===String(edge.from);});
      var to=nodes.find(function(item){return String(item.id)===String(edge.to);});
      if(!from||!to)return '';
      var x1=Number(from.x!=null?from.x:40)+80;
      var y1=Number(from.y!=null?from.y:40)+26;
      var x2=Number(to.x!=null?to.x:240)+80;
      var y2=Number(to.y!=null?to.y:40)+26;
      return '<path class="ncui-flow-edge" d="M '+x1+' '+y1+' C '+(x1+70)+' '+y1+', '+(x2-70)+' '+y2+', '+x2+' '+y2+'"></path>';
    }).join('');
  });
}
function _initStreams(){
  document.querySelectorAll('[data-ncui-stream-url]').forEach(function(node){
    if(node.getAttribute('data-ncui-stream-mounted')==='true')return;
    node.setAttribute('data-ncui-stream-mounted','true');
    var url=node.getAttribute('data-ncui-stream-url');
    var saveAs=node.getAttribute('data-ncui-stream-save')||'';
    var useAuth=node.getAttribute('data-ncui-stream-auth')==='true';
    var status=node.querySelector('.ncui-live-status');
    var body=node.querySelector('.ncui-live-body');
    var readerRequest=useAuth ? _auth.fetch(url,{method:'GET'}) : _requestWithTimeout(url,{method:'GET',credentials:'same-origin'});
    Promise.resolve(readerRequest).then(function(res){
      if(!res||!res.ok||!res.body)throw new Error('Stream connection failed');
      if(status)status.textContent='Live stream connected';
      var reader=res.body.getReader();
      var decoder=new TextDecoder();
      var buffer='';
      var items=[];
      function pump(){
        reader.read().then(function(result){
          if(result.done)return;
          buffer+=decoder.decode(result.value,{stream:true});
          var lines=buffer.split('\n');
          buffer=lines.pop()||'';
          lines.forEach(function(line){
            var trimmed=String(line||'').trim();
            if(!trimmed)return;
            items.push(trimmed);
          });
          if(saveAs)_set(saveAs,items.slice());
          if(body)body.innerHTML=items.slice(-12).map(function(item){return '<div class="ncui-live-event">'+String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';}).join('');
          pump();
        }).catch(function(err){
          if(status)status.textContent=(err&&err.message)?err.message:'Stream closed';
        });
      }
      pump();
    }).catch(function(err){
      if(status)status.textContent=(err&&err.message)?err.message:'Unable to connect to stream';
    });
  });
}
function _initSockets(){
  document.querySelectorAll('[data-ncui-socket-url]').forEach(function(node){
    if(node.getAttribute('data-ncui-socket-mounted')==='true')return;
    node.setAttribute('data-ncui-socket-mounted','true');
    var url=node.getAttribute('data-ncui-socket-url');
    var saveAs=node.getAttribute('data-ncui-socket-save')||'';
    var channel=node.getAttribute('data-ncui-socket-channel')||'';
    var status=node.querySelector('.ncui-live-status');
    var body=node.querySelector('.ncui-live-body');
    if(typeof WebSocket==='undefined'){
      if(status)status.textContent='WebSocket is not available in this browser';
      return;
    }
    try{
      var socket=new WebSocket(url);
      _socketRegistry[url]=socket;
      socket.onopen=function(){
        if(status)status.textContent='Realtime socket connected';
        if(channel)socket.send(JSON.stringify({ subscribe: channel }));
      };
      socket.onmessage=function(event){
        var current=saveAs?_exprValue(saveAs):[];
        if(!Array.isArray(current))current=[];
        current=current.concat([event.data]);
        if(saveAs)_set(saveAs,current.slice(-50));
        if(body)body.innerHTML=current.slice(-12).map(function(item){return '<div class="ncui-live-event">'+String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';}).join('');
      };
      socket.onerror=function(){ if(status)status.textContent='Socket error'; };
      socket.onclose=function(){ if(status)status.textContent='Socket disconnected'; };
    }catch(err){
      if(status)status.textContent=(err&&err.message)?err.message:'Unable to connect to socket';
    }
  });
}
function _initDragDrop(){
  document.querySelectorAll('.ncui-drag-item[draggable="true"]').forEach(function(item){
    if(item.getAttribute('data-ncui-drag-ready')==='true')return;
    item.setAttribute('data-ncui-drag-ready','true');
    item.addEventListener('dragstart',function(event){
      if(!event.dataTransfer)return;
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('application/x-ncui-drag', item.getAttribute('data-ncui-drag-payload')||'');
    });
  });
  document.querySelectorAll('[data-ncui-drop-target]').forEach(function(zone){
    if(zone.getAttribute('data-ncui-drop-ready')==='true')return;
    zone.setAttribute('data-ncui-drop-ready','true');
    zone.addEventListener('dragover',function(event){
      event.preventDefault();
      zone.classList.add('ncui-drop-hover');
    });
    zone.addEventListener('dragleave',function(){ zone.classList.remove('ncui-drop-hover'); });
    zone.addEventListener('drop',function(event){
      event.preventDefault();
      zone.classList.remove('ncui-drop-hover');
      var raw=event.dataTransfer?event.dataTransfer.getData('application/x-ncui-drag'):'';
      if(!raw)return;
      try{
        var payload=JSON.parse(decodeURIComponent(raw));
        var sourceItems=_exprValue(payload.source);
        var targetName=zone.getAttribute('data-ncui-drop-target')||'';
        var targetItems=_exprValue(targetName);
        if(!Array.isArray(sourceItems)||!Array.isArray(targetItems))return;
        var nextSource=sourceItems.slice();
        var moved=nextSource.splice(Number(payload.index),1)[0];
        var nextTarget=targetItems.slice();
        nextTarget.push(moved);
        _assignCollectionTarget(payload.source,nextSource);
        _assignCollectionTarget(targetName,nextTarget);
        _notify();
      }catch(_){}
    });
  });
}
function _initFlowInteractions(){
  document.querySelectorAll('.ncui-flow-node').forEach(function(node){
    if(node.getAttribute('data-ncui-flow-ready')==='true')return;
    node.setAttribute('data-ncui-flow-ready','true');
    node.addEventListener('pointerdown',function(event){
      var host=node.closest('[data-ncui-flow-kind]');
      if(!host)return;
      var source=host.getAttribute('data-ncui-flow-source')||'';
      var id=node.getAttribute('data-ncui-flow-node');
      var startX=event.clientX;
      var startY=event.clientY;
      var originLeft=parseFloat(node.style.left||'0');
      var originTop=parseFloat(node.style.top||'0');
      function move(ev){
        var left=originLeft+(ev.clientX-startX);
        var top=originTop+(ev.clientY-startY);
        node.style.left=left+'px';
        node.style.top=top+'px';
      }
      function up(ev){
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',up);
        var flow=_exprValue(source);
        if(flow&&Array.isArray(flow.nodes)){
          var next=Object.assign({},flow,{nodes:flow.nodes.map(function(entry){
            if(String(entry.id)!==String(id))return entry;
            return Object.assign({},entry,{x:parseFloat(node.style.left||'0'),y:parseFloat(node.style.top||'0')});
          })});
          _assignCollectionTarget(source,next);
          _notify();
        }
      }
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up);
    });
  });
}
function _notify(){
  _listeners.forEach(function(fn){fn(_state)});
  document.querySelectorAll('[data-ncui-text]').forEach(function(el){
    var tpl=el.getAttribute('data-ncui-text');
    el.textContent=tpl.replace(/\\{\\{([^}]+)\\}\\}/g,function(_,e){
      var v=_exprValue(e);
      return v!=null?v:'';
    });
  });
  document.querySelectorAll('[data-ncui-if]').forEach(function(el){
    var k=el.getAttribute('data-ncui-if');
    var neg=k.charAt(0)==='!';
    var rk=neg?k.slice(1):k;
    var show=neg?!_exprValue(rk):!!_exprValue(rk);
    el.classList.toggle('ncui-hidden',!show);
  });
  _syncBoundInputs();
  _renderTables();
  _renderGraphs();
  _renderFlows();
  _renderDragDrop();
  _initStreams();
  _initSockets();
  _initDragDrop();
  _initFlowInteractions();
  document.querySelectorAll('[data-ncui-markdown]').forEach(function(el){
    var tpl=el.getAttribute('data-ncui-markdown')||'';
    var text=tpl.replace(/\{\{([^}]+)\}\}/g,function(_,e){
      var v=_exprValue(e);
      return v!=null?v:'';
    });
    el.innerHTML=_markdownToHtml(text);
  });
  _mountExternalNodes();
}\n`;

    js += `window.NCUIProviders=window.NCUIProviders||{
  configs:${JSON.stringify((this.ast.providers || []).reduce((acc, provider) => { acc[provider.name] = provider.config || {}; return acc; }, {}))},
  handlers:{},
  register:function(name,handler){this.handlers[name]=handler;return true;},
  mount:function(name,target,props){
    if(typeof this.handlers[name]==='function')return this.handlers[name](target,props||{},this.configs[name]||{});
    return false;
  }
};\n`;

    js += `window.NCUIServices=window.NCUIServices||{};\n`;
    for (const service of (this.ast.services || [])) {
      js += `window.NCUIServices[${JSON.stringify(service.name)}]={
  base:${JSON.stringify(service.base || '')},
  timeout:${JSON.stringify(service.timeout || 15000)},
  request:async function(path,options){
    options=options||{};
    var url=(this.base||'')+path;
    var requestOptions=Object.assign({credentials:'same-origin'},options);
    if(options.auth)return _auth.fetch(url,requestOptions);
    return _requestWithTimeout(url,Object.assign({timeoutMs:this.timeout},requestOptions));
  },\n`;
      for (const endpoint of (service.endpoints || [])) {
        js += `${JSON.stringify(endpoint.name)}:async function(payload,options){
    options=options||{};
    var requestOptions={method:${JSON.stringify(endpoint.method || 'GET')},headers:Object.assign({'Accept':'application/json'},options.headers||{}),credentials:'same-origin'};
    if(payload!=null && ${JSON.stringify(endpoint.method || 'GET')}!=='GET'){
      requestOptions.headers['Content-Type']='application/json';
      requestOptions.body=JSON.stringify(payload);
    }
    if(options.auth)return _auth.fetch((this.base||'')+${JSON.stringify(endpoint.path || '/')}, requestOptions);
    return _requestWithTimeout((this.base||'')+${JSON.stringify(endpoint.path || '/')}, Object.assign({timeoutMs:this.timeout}, requestOptions));
  },\n`;
      }
      js += `};\n`;
    }

    if (this._hasAuth) {
      js += `async function action_login(formData){return _auth.login(formData||{});}\n`;
      js += `async function action_logout(){return _auth.logout();}\n`;
      js += `async function action_refresh(){return _auth.refresh();}\n`;
      js += `window.action_login=action_login;\nwindow.action_logout=action_logout;\nwindow.action_refresh=action_refresh;\n`;
    }

    js += `document.querySelectorAll('[data-ncui-bind]').forEach(function(field){
  var handler=function(){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    var value=field.type==='checkbox'?!!field.checked:field.value;
    _state[key]=value;
    _validateFieldElement(field);
    var changeAction=field.getAttribute('data-ncui-change');
    if(changeAction){
      var changeFn=window['action_'+changeAction];
      if(typeof changeFn==='function')changeFn(value);
    }
    _notify();
  };
  field.addEventListener('input',handler);
  field.addEventListener('change',handler);
});\n`;

    js += `document.querySelectorAll('[data-ncui-click]').forEach(function(el){
  el.addEventListener('click',function(e){
    e.preventDefault();
    var name=el.getAttribute('data-ncui-click');
    var fn=window['action_'+name];
    if(typeof fn==='function')fn();
  });
});\n`;

    js += `document.querySelectorAll('.ncui-form').forEach(function(form){
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    if(!_validateForm(form)){
      form.setAttribute('data-ncui-status','error');
      return;
    }
    var name=form.getAttribute('data-ncui-submit');
    var fn=name?window['action_'+name]:null;
    var payload=_collectFormData(form);
    var submitBtn=form.querySelector('button[type="submit"], .ncui-btn');
    var originalLabel=submitBtn?submitBtn.textContent:null;
    var status=form.querySelector('[data-ncui-form-status]');
    if(submitBtn){submitBtn.disabled=true;submitBtn.setAttribute('aria-busy','true');}
    if(status)status.textContent='';
    try{
      if(typeof fn==='function'){
        await fn(payload);
      } else {
        var actionUrl=form.getAttribute('data-ncui-action-url')||form.getAttribute('action')||'';
        if(actionUrl && actionUrl !== '#'){
          var method=(form.getAttribute('method')||'POST').toUpperCase();
          var requestOptions={method:method,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)};
          var res=form.getAttribute('data-ncui-auth')==='true' ? await _auth.fetch(actionUrl,requestOptions) : await _requestWithTimeout(actionUrl,Object.assign({credentials:'same-origin'},requestOptions));
          var contentType=res.headers&&res.headers.get?res.headers.get('content-type')||'':'';
          var data=contentType.indexOf('application/json')!==-1 ? await res.json() : await res.text();
          if(!res.ok)throw new Error((data&&data.message)||('Request failed ('+res.status+')'));
          var saveAs=form.getAttribute('data-ncui-save-response');
          if(saveAs)_set(saveAs,data);
          var redirectTo=form.getAttribute('data-ncui-redirect');
          if(redirectTo){
            history.pushState(null,'',redirectTo);
            if(typeof _resolve==='function')_resolve();
          }
        }
      }
      form.setAttribute('data-ncui-status','success');
      if(status)status.textContent='Saved successfully.';
    }catch(err){
      _state.lastError=err&&err.message?err.message:String(err);
      form.setAttribute('data-ncui-status','error');
      if(status)status.textContent=_state.lastError;
      _audit('action.submit_failed',{action:name||'form_submit',message:_state.lastError});
      _notify();
    }finally{
      if(submitBtn){submitBtn.disabled=false;submitBtn.removeAttribute('aria-busy');if(originalLabel!=null)submitBtn.textContent=originalLabel;}
    }
  });
});\n`;

    // Actions
    if (this._hasActions) {
      for (const action of this.ast.actions) {
        js += `async function action_${action.name}(${action.param || ''}){\n`;
        for (const stmt of action.body) {
          js += this._compileStatementJS(stmt, action.param);
        }
        js += '}\n';
      }

      // Make action functions accessible
      for (const action of this.ast.actions) {
        js += `window.action_${action.name}=action_${action.name};\n`;
      }
    }

    // Routing
    if (this._hasRoutes) {
      js += this._generateRoutingJS();
    }

    js += `window.NCUIInterop=window.NCUIInterop||{
  renderComponent:function(name,params){
    var fn=window['_render_'+name];
    return typeof fn==='function'?fn(params||{}):'';
  },
  mountComponent:function(name,target,params){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host)return false;
    host.innerHTML=this.renderComponent(name,params);
    return true;
  },
  renderRoute:function(path){
    if(!_routes||!_routes.length)return '';
    for(var i=0;i<_routes.length;i++){
      var match=String(path||'/').match(_routes[i].regex);
      if(match){
        var fn=window['_render_'+_routes[i].component];
        return typeof fn==='function'?fn(match.groups||{}):'';
      }
    }
    return '';
  },
  mountRoute:function(path,target){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host)return false;
    host.innerHTML=this.renderRoute(path);
    return true;
  },
  navigate:function(path){
    history.pushState(null,'',path);
    if(typeof _resolve==='function')_resolve();
  },
  snapshot:function(){
    return {state:Object.assign({},_state), stores:JSON.parse(JSON.stringify(_stores)), ssr:_ssrPayload, path:window.location.pathname};
  },
  registerExternal:function(name,renderer){
    window.NCUIExternal=window.NCUIExternal||{};
    window.NCUIExternal[name]=renderer;
  },
  mountExternal:function(name,target,props){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host||!window.NCUIExternal||typeof window.NCUIExternal[name]!=='function')return false;
    window.NCUIExternal[name](host, props||{});
    return true;
  }
};\n`;

    js += `if(typeof window!=='undefined'&&window.customElements&&!window.customElements.get('ncui-route')){
  window.customElements.define('ncui-route', class extends HTMLElement{
    connectedCallback(){
      var path=this.getAttribute('path')||window.location.pathname||'/';
      window.NCUIInterop.mountRoute(path,this);
    }
  });
}
if(typeof window!=='undefined'&&window.customElements&&!window.customElements.get('ncui-component')){
  window.customElements.define('ncui-component', class extends HTMLElement{
    connectedCallback(){
      var name=this.getAttribute('name');
      var props={};
      Array.prototype.forEach.call(this.attributes,function(attr){
        if(attr.name==='name')return;
        props[attr.name]=attr.value;
      });
      window.NCUIInterop.mountComponent(name,this,props);
    }
  });
}\n`;

    js += `Promise.resolve(_auth.init()).catch(function(err){
  _state.authError=err&&err.message?err.message:String(err);
  _audit('auth.init_failed',{message:_state.authError});
}).finally(async function(){
  if(typeof _runMountTasks==='function'){await _runMountTasks();}
  if(typeof _resolve==='function')_resolve();
  _notify();
});\n`;

    js += '})();\n';
    return js;
  }

  _compileExpr(expr) {
    if (!expr) return 'null';
    let compiled = expr;
    if (this._hasStores) {
      compiled = compiled.replace(/\bstores?\.(\w[\w.]*)\b/g, (_, path) => `_storeGet(${JSON.stringify(path)})`);
      for (const s of this.ast.stores || []) {
        const re = new RegExp(`(^|[^\\w"'])(${s.name})(?![\\w"'])`, 'g');
        compiled = compiled.replace(re, (_, prefix) => `${prefix}_storeGet(${JSON.stringify(s.name)})`);
      }
    }
    if (this._hasState) {
      for (const s of this.ast.states) {
        const re = new RegExp(`(^|[^\\w"'])(${s.name})(?![\\w"'])`, 'g');
        compiled = compiled.replace(re, (_, prefix) => `${prefix}_get(${JSON.stringify(s.name)})`);
      }
    }
    return compiled;
  }

  _generateRoutingJS() {
    let js = '\n// Router\n';
    js += `var _lazyRoutesLoaded={};\n`;
    js += `var _routes=[\n`;
    for (const r of this.ast.routes) {
      const pattern = r.path
        .replace(/:([A-Za-z_][\w-]*)/g, '(?<$1>[^/]+)')
        .replace(/\{\{(\w+)\}\}/g, '(?<$1>[^/]+)');
      js += `  {path:${JSON.stringify(r.path)},regex:new RegExp('^${pattern}$'),component:${JSON.stringify(r.component)},public:${r.public ? 'true' : 'false'},requireAuth:${r.requireAuth ? 'true' : 'false'},requireRole:${JSON.stringify(r.requireRole || null)},guard:${JSON.stringify(r.guard || null)},redirect:${JSON.stringify(r.redirect || null)},lazy:${r.lazy ? 'true' : 'false'},errorComponent:${JSON.stringify(r.errorComponent || null)},unauthorizedComponent:${JSON.stringify(r.unauthorizedComponent || null)},loadingComponent:${JSON.stringify(r.loadingComponent || null)}},\n`;
    }
    js += `];\n`;

    // Component render functions
    if (this._hasComponents) {
      for (const comp of this.ast.components) {
        const html = this._renderChildren(comp.children || [], {});
        js += `function _render_${comp.name}(params){
  var html=${JSON.stringify(html)};
  if(params){for(var k in params){html=html.replace(new RegExp('\\\\{\\\\{'+k+'\\\\}\\\\}','g'),params[k])}}
  return html;
}\n`;
      }
    }

    js += `function _resolve(){
  var path=location.pathname;
  var outlet=document.getElementById('ncui-router-outlet');
  if(!outlet)return;
  for(var i=0;i<_routes.length;i++){
    var m=path.match(_routes[i].regex);
    if(m){
      var access=_routeAllowed(_routes[i]);
      if(!access.ok){
        if(access.redirect && access.redirect!==path){
          history.replaceState(null,'',access.redirect);
          path=access.redirect;
          i=-1;
          continue;
        }
        if(_routes[i].unauthorizedComponent){
          var deniedFn=window['_render_'+_routes[i].unauthorizedComponent];
          if(typeof deniedFn==='function'){
            outlet.innerHTML=deniedFn(m.groups||{});
            return;
          }
        }
        outlet.innerHTML='<div class="ncui-section ncui-centered"><div class="ncui-container"><h2 class="ncui-heading">403</h2><p class="ncui-text">Access denied</p></div></div>';
        return;
      }
      if(_routes[i].lazy && !_lazyRoutesLoaded[_routes[i].path||path]){
        if(_routes[i].loadingComponent){
          var lazyFn=window['_render_'+_routes[i].loadingComponent];
          if(typeof lazyFn==='function'){
            outlet.innerHTML=lazyFn(m.groups||{});
          }
        } else {
          outlet.innerHTML='<div class="ncui-section ncui-centered"><div class="ncui-container"><div class="ncui-loading ncui-loading-spinner ncui-loading-large"><div class="ncui-spinner" aria-hidden="true"></div><p class="ncui-loading-text">Loading route...</p></div></div></div>';
        }
        _lazyRoutesLoaded[_routes[i].path||path]=true;
        setTimeout(_resolve,0);
        return;
      }
      if(_state.authPending && _routes[i].loadingComponent){
        var loadingFn=window['_render_'+_routes[i].loadingComponent];
        if(typeof loadingFn==='function'){
          outlet.innerHTML=loadingFn(m.groups||{});
          return;
        }
      }
      _routeContext(path,m.groups||{},_routes[i]);
      var fn=window['_render_'+_routes[i].component];
      if(fn){
        if(_ssrPayload && !_ssrPayload.consumed && _ssrPayload.path===path && outlet.innerHTML.trim()){
          _ssrPayload.consumed=true;
          return;
        }
        try{
          outlet.innerHTML=fn(m.groups||{});
        }catch(err){
          if(_routes[i].errorComponent){
            var errorFn=window['_render_'+_routes[i].errorComponent];
            if(typeof errorFn==='function'){
              outlet.innerHTML=errorFn(Object.assign({},m.groups||{},{error:(err&&err.message)||String(err)}));
              return;
            }
          }
          outlet.innerHTML='<div class="ncui-section ncui-centered"><div class="ncui-container"><h2 class="ncui-heading">Route Error</h2><p class="ncui-text">'+((err&&err.message)?err.message:'This page failed to render.')+'</p></div></div>';
        }
      }
      return;
    }
  }
  outlet.innerHTML='<div class="ncui-section ncui-centered"><div class="ncui-container"><h2 class="ncui-heading">404</h2><p class="ncui-text">Page not found</p></div></div>';
}
window.addEventListener('popstate',_resolve);
document.addEventListener('click',function(e){
  var dismiss=e.target.closest('[data-ncui-dismissible] .ncui-alert-close');
  if(dismiss){
    var alert=dismiss.closest('[data-ncui-dismissible]');
    if(alert)alert.remove();
    return;
  }
  var link=e.target.closest('[data-ncui-link]');
  if(link){e.preventDefault();history.pushState(null,'',link.getAttribute('data-ncui-link'));_resolve();}
});
`;
    return js;
  }

  // ─── Color helpers ────────────────────────────────────────────────────────

  _shiftHue(hex, degrees) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    h = ((h * 360 + degrees) % 360) / 360;
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

function compile(source, options) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const gen = new CodeGenerator(ast, options || {});
  return gen.generate();
}

function parse(source) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

function tokenize(source) {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

// Backward compatibility aliases
const NCUIParser = Parser;
const NCUIGenerator = CodeGenerator;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compile, parse, tokenize, Lexer, Parser, CodeGenerator, NCUIParser, NCUIGenerator, ICONS };
}
if (typeof window !== 'undefined') {
  window.NCUICompiler = { compile, parse, tokenize, Lexer, Parser, CodeGenerator, NCUIParser, NCUIGenerator, ICONS };
}
