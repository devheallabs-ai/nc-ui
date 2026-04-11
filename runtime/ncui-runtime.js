/**
 * NC UI Browser Runtime v3.0
 *
 * The tiny runtime that powers NC UI apps in the browser.
 * GitHub Pages, Netlify, Vercel, any static host — just drop this file.
 *
 * Size target: < 15KB minified
 *
 * Responsibilities:
 *   1. Reactive state store (like Vue's reactivity)
 *   2. Virtual DOM diff + patch (like React's reconciler)
 *   3. Client-side router (like React Router)
 *   4. Form validation engine
 *   5. Auth state (bearer token, session, RBAC)
 *   6. Component lifecycle (mount, unmount, watchers)
 *
 * Usage:
 *   <script src="ncui-runtime.js"></script>
 *   <script src="my-app.ncui.js"></script>   ← compiled by NC UI compiler
 *   <div id="app"></div>
 *
 * The compiled app file calls:
 *   NCUIRuntime.mount(appDefinition, '#app')
 */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
   *  1. REACTIVE STATE STORE
   *
   *  Same model as OP_STATE_SET / OP_STATE_GET opcodes.
   *  When a state slot changes, all effects (render fns)
   *  that depend on it are re-queued.
   * ══════════════════════════════════════════════════════════ */

  class NCUIState {
    constructor(initialValues) {
      this._slots    = {};      // slot name → current value
      this._effects  = {};      // slot name → Set of effect fns
      this._computed = {};      // computed name → { fn, deps, cache, dirty }
      this._watchers = {};      // slot name → Set of watcher callbacks
      this._batch    = false;
      this._dirty    = new Set();
      this._version  = 0;

      // Initialize slots
      for (const [k, v] of Object.entries(initialValues || {})) {
        this._slots[k] = v;
        this._effects[k] = new Set();
        this._watchers[k] = new Set();
      }
    }

    /* get(name) — read reactive slot value */
    get(name) {
      // Track access during effect execution (dependency tracking)
      if (NCUIState._currentEffect) {
        if (!this._effects[name]) this._effects[name] = new Set();
        this._effects[name].add(NCUIState._currentEffect);
      }
      return this._slots[name];
    }

    /* set(name, value) — write slot, trigger re-renders */
    set(name, value) {
      const old = this._slots[name];
      if (old === value) return; // no change, skip

      this._slots[name] = value;
      this._version++;

      // Notify watchers
      if (this._watchers[name]) {
        for (const w of this._watchers[name]) w(value, old);
      }

      // Mark dependent computed as dirty
      for (const [cname, comp] of Object.entries(this._computed)) {
        if (comp.deps && comp.deps.has(name)) comp.dirty = true;
      }

      // Schedule re-render
      if (this._batch) {
        this._dirty.add(name);
      } else {
        this._scheduleUpdate(name);
      }
    }

    /* batch(fn) — group multiple sets into one re-render */
    batch(fn) {
      this._batch = true;
      try { fn(); }
      finally {
        this._batch = false;
        if (this._dirty.size > 0) {
          this._flushEffects();
          this._dirty.clear();
        }
      }
    }

    /* computed(name, fn) — declare a memoized computed value */
    computed(name, fn) {
      const comp = { fn, deps: new Set(), cache: undefined, dirty: true };
      this._computed[name] = comp;
      Object.defineProperty(this._slots, name, {
        get: () => {
          if (comp.dirty) {
            comp.cache = this._runTracked(fn, comp.deps);
            comp.dirty = false;
          }
          return comp.cache;
        },
        configurable: true,
        enumerable: true,
      });
    }

    /* watch(name, fn) — run fn when slot changes */
    watch(name, fn) {
      if (!this._watchers[name]) this._watchers[name] = new Set();
      this._watchers[name].add(fn);
      return () => this._watchers[name].delete(fn); // returns unwatch fn
    }

    /* effect(fn) — auto-track dependencies, re-run on change */
    effect(fn) {
      const deps = new Set();
      const run = () => {
        this._runTracked(fn, deps);
        // Register this runner on all deps
        for (const dep of deps) {
          if (!this._effects[dep]) this._effects[dep] = new Set();
          this._effects[dep].add(run);
        }
      };
      run();
      return () => {
        for (const dep of deps) {
          if (this._effects[dep]) this._effects[dep].delete(run);
        }
      };
    }

    _runTracked(fn, deps) {
      const prev = NCUIState._currentEffect;
      NCUIState._currentEffect = { track: (name) => deps.add(name) };
      try { return fn(); }
      finally { NCUIState._currentEffect = prev; }
    }

    _scheduleUpdate(name) {
      if (this._effects[name]) {
        for (const effect of this._effects[name]) {
          NCUIScheduler.queue(effect);
        }
      }
    }

    _flushEffects() {
      for (const name of this._dirty) {
        this._scheduleUpdate(name);
      }
    }
  }
  NCUIState._currentEffect = null;

  /* ══════════════════════════════════════════════════════════
   *  2. SCHEDULER — batches DOM updates like React
   *
   *  Collects all pending renders, runs them in one microtask.
   *  Prevents multiple re-renders for multiple state changes.
   * ══════════════════════════════════════════════════════════ */

  const NCUIScheduler = {
    _queue: new Set(),
    _flushing: false,

    queue(fn) {
      this._queue.add(fn);
      if (!this._flushing) {
        this._flushing = true;
        Promise.resolve().then(() => this._flush());
      }
    },

    _flush() {
      for (const fn of this._queue) {
        try { fn(); }
        catch (e) { console.error('[NC UI] Render error:', e); }
      }
      this._queue.clear();
      this._flushing = false;
    },
  };

  /* ══════════════════════════════════════════════════════════
   *  3. VIRTUAL DOM
   *
   *  Lightweight VDOM — same structure as NcVNode in nc_ui_vm.c.
   *  h(tag, props, ...children) creates a VNode.
   *  diff(old, new) produces patches.
   *  patch(el, patches) applies minimal DOM mutations.
   * ══════════════════════════════════════════════════════════ */

  /* h — create a VNode (like React.createElement) */
  function h(tag, props, ...children) {
    return {
      tag,
      props:    props    || {},
      children: children.flat(Infinity).filter(c => c != null && c !== false),
      key:      props && props.key,
      _dom:     null,  // reference to real DOM node (set after mount)
    };
  }

  /* hText — create a text VNode */
  function hText(text) {
    return { tag: '#text', text: String(text == null ? '' : text), _dom: null };
  }

  /* createDom — build real DOM from VNode (first mount) */
  function createDom(vnode) {
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return (vnode._dom = document.createTextNode(vnode));
    }
    if (vnode.tag === '#text') {
      return (vnode._dom = document.createTextNode(vnode.text));
    }
    const el = document.createElement(vnode.tag);
    vnode._dom = el;
    applyProps(el, {}, vnode.props);
    for (const child of (vnode.children || [])) {
      el.appendChild(createDom(child));
    }
    return el;
  }

  /* applyProps — set HTML attributes, event listeners, styles */
  function applyProps(el, oldProps, newProps) {
    // Remove old props not in new
    for (const key of Object.keys(oldProps)) {
      if (!(key in newProps)) {
        if (key.startsWith('on')) {
          el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
        } else {
          el.removeAttribute(key);
        }
      }
    }

    // Set new/changed props
    for (const [key, val] of Object.entries(newProps)) {
      if (oldProps[key] === val) continue; // unchanged

      if (key === 'class' || key === 'className') {
        el.className = val || '';
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
      } else if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        if (el.value !== val) el.value = val == null ? '' : val;
      } else if (key === 'checked' && el.tagName === 'INPUT') {
        el.checked = !!val;
      } else if (key === 'disabled') {
        el.disabled = !!val;
      } else if (key === 'hidden') {
        el.hidden = !!val;
      } else if (key.startsWith('on') && typeof val === 'function') {
        const event = key.slice(2).toLowerCase();
        if (oldProps[key]) el.removeEventListener(event, oldProps[key]);
        el.addEventListener(event, val);
      } else if (key === 'ref' && typeof val === 'function') {
        val(el);
      } else if (key !== 'key') {
        if (val == null || val === false) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, val === true ? '' : val);
        }
      }
    }
  }

  /* patch — diff old VNode vs new VNode, update real DOM minimally */
  function patch(parent, oldVnode, newVnode, index = 0) {
    const el = parent.childNodes[index];

    // Case 1: No old node → insert new
    if (!oldVnode) {
      parent.appendChild(createDom(newVnode));
      return;
    }

    // Case 2: No new node → remove old
    if (!newVnode) {
      parent.removeChild(el);
      return;
    }

    // Case 3: Text nodes
    if (newVnode.tag === '#text' || typeof newVnode === 'string') {
      const newText = newVnode.text || String(newVnode);
      const oldText = oldVnode.text || String(oldVnode);
      if (newText !== oldText) {
        el.textContent = newText;
      }
      newVnode._dom = el;
      return;
    }

    // Case 4: Different tag → replace
    if (!oldVnode.tag || oldVnode.tag !== newVnode.tag) {
      parent.replaceChild(createDom(newVnode), el);
      return;
    }

    // Case 5: Same tag → update props and recurse into children
    newVnode._dom = el;
    applyProps(el, oldVnode.props || {}, newVnode.props || {});

    // Reconcile children
    const oldChildren = oldVnode.children || [];
    const newChildren = newVnode.children || [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      patch(el, oldChildren[i], newChildren[i], i);
    }

    // Remove extra old children
    while (el.childNodes.length > newChildren.length) {
      el.removeChild(el.lastChild);
    }
  }

  /* ══════════════════════════════════════════════════════════
   *  4. COMPONENT SYSTEM
   *
   *  NC UI components map 1:1 to pages and `component` blocks.
   *  Each component:
   *    - has a render() function that returns a VNode tree
   *    - can have local state
   *    - has lifecycle hooks (mount, unmount)
   *    - is reactive: re-renders when state changes
   * ══════════════════════════════════════════════════════════ */

  class NCUIComponent {
    constructor(def, props, appState, auth) {
      this.def      = def;       // component definition from compiled .ncui
      this.props    = props;     // props passed from parent
      this.appState = appState;  // global app state store
      this.auth     = auth;      // auth context
      this._vdom    = null;      // last rendered VNode tree
      this._el      = null;      // real DOM element
      this._mounted = false;
      this._cleanups = [];       // cleanup fns from watchers/effects

      // Local state (from `state:` block in page)
      this.state = new NCUIState(def.state || {});
    }

    /* read — read from local or global state */
    read(name) {
      if (name in (this.def.state || {})) return this.state.get(name);
      return this.appState.get(name);
    }

    /* write — write to local or global state */
    write(name, value) {
      if (name in (this.def.state || {})) {
        this.state.set(name, value);
      } else {
        this.appState.set(name, value);
      }
    }

    /* mount — render and insert into DOM */
    mount(container) {
      this._el = container;

      // Run guard check
      if (this.def.guard && !this._checkGuard()) {
        NCUIRouter.push(this.def.guard.redirect || '/');
        return;
      }

      // Initial render
      this._vdom = this._render();
      container.innerHTML = '';
      container.appendChild(createDom(this._vdom));

      // Set up reactive re-render
      const rerender = () => {
        const newVdom = this._render();
        patch(container, this._vdom, newVdom, 0);
        this._vdom = newVdom;
      };

      // Register effect on all state slots
      const stopEffect = this.appState.effect(rerender);
      const stopLocalEffect = this.state.effect(rerender);
      this._cleanups.push(stopEffect, stopLocalEffect);

      this._mounted = true;

      // Run on-mount hooks
      if (this.def.onMount) {
        this._runAction(this.def.onMount);
      }
    }

    /* unmount — run cleanup, clear DOM */
    unmount() {
      if (this.def.onUnmount) {
        this._runAction(this.def.onUnmount);
      }
      for (const cleanup of this._cleanups) cleanup();
      this._cleanups = [];
      this._mounted = false;
    }

    _render() {
      if (!this.def.render) return h('div');
      try {
        return this.def.render(this);
      } catch (e) {
        console.error('[NC UI] Render error in', this.def.name, e);
        return h('div', { class: 'ncui-error' }, hText('Render error: ' + e.message));
      }
    }

    _checkGuard() {
      const g = this.def.guard;
      if (!g) return true;
      if (g.requireAuth && !this.auth.isAuthenticated()) return false;
      if (g.requireRole && !this.auth.hasRole(g.requireRole)) return false;
      if (g.requirePermission && !this.auth.hasPerm(g.requirePermission)) return false;
      return true;
    }

    async _runAction(actionDef, args) {
      if (typeof actionDef === 'function') {
        try {
          await actionDef.call(this, args);
        } catch (e) {
          console.error('[NC UI] Action error:', e);
        }
      }
    }

    /* navigate — route push */
    navigate(path) {
      NCUIRouter.push(path);
    }

    /* fetch — HTTP request with optional auth header */
    async fetch(url, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...options.headers };
      if (options.auth && this.auth.token) {
        headers['Authorization'] = 'Bearer ' + this.auth.token;
      }
      const res = await global.fetch(url, { ...options, headers });
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    }
  }

  /* ══════════════════════════════════════════════════════════
   *  5. ROUTER
   *
   *  Hash-based router (works on GitHub Pages).
   *  History API mode also supported.
   * ══════════════════════════════════════════════════════════ */

  const NCUIRouter = {
    _routes:    [],          // { pattern, component, guard }
    _current:   null,        // current mounted component instance
    _container: null,        // DOM element to mount into
    _appState:  null,
    _auth:      null,
    _mode:      'hash',      // 'hash' (GitHub Pages compatible) or 'history'

    define(routes) {
      this._routes = routes;
    },

    init(container, appState, auth, mode = 'hash') {
      this._container = container;
      this._appState  = appState;
      this._auth      = auth;
      this._mode      = mode;

      // Listen for navigation
      if (mode === 'hash') {
        global.addEventListener('hashchange', () => this._navigate());
        global.addEventListener('load', () => this._navigate());
      } else {
        global.addEventListener('popstate', () => this._navigate());
        global.addEventListener('load', () => this._navigate());
        // Intercept link clicks
        document.addEventListener('click', e => {
          const a = e.target.closest('a[href]');
          if (a && a.origin === location.origin && !a.target) {
            e.preventDefault();
            this.push(a.pathname);
          }
        });
      }
    },

    push(path) {
      if (this._mode === 'hash') {
        location.hash = path;
      } else {
        history.pushState(null, '', path);
        this._navigate();
      }
    },

    currentPath() {
      if (this._mode === 'hash') {
        return location.hash.slice(1) || '/';
      }
      return location.pathname;
    },

    params() {
      return this._currentParams || {};
    },

    _navigate() {
      const path = this.currentPath();
      const match = this._match(path);

      if (!match) {
        // 404
        this._mount({ name: '404', render: (c) => h('div', { class: 'ncui-404' },
          h('h1', {}, hText('404 — Page not found')),
          h('p',  {}, hText(path + ' does not exist'))) });
        return;
      }

      this._currentParams = match.params;
      this._mount(match.component, match.params);
    },

    _match(path) {
      for (const route of this._routes) {
        const result = this._matchPattern(route.pattern, path);
        if (result) return { component: route.component, params: result };
      }
      return null;
    },

    _matchPattern(pattern, path) {
      const patternParts = pattern.split('/');
      const pathParts    = path.split('/');
      if (patternParts.length !== pathParts.length) return null;

      const params = {};
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
        } else if (patternParts[i] !== pathParts[i]) {
          return null;
        }
      }
      return params;
    },

    _mount(componentDef, props) {
      // Unmount current component
      if (this._current) {
        this._current.unmount();
        this._container.innerHTML = '';
      }

      // Mount new component
      const instance = new NCUIComponent(componentDef, props || {},
                                          this._appState, this._auth);
      this._current = instance;
      instance.mount(this._container);
    },
  };

  /* ══════════════════════════════════════════════════════════
   *  6. AUTH
   *
   *  Bearer token auth — same model as nc-ui/enterprise/auth.nc.
   *  Reads token from sessionStorage / localStorage.
   *  Adds Authorization header to fetches.
   * ══════════════════════════════════════════════════════════ */

  class NCUIAuth {
    constructor(config) {
      this.config = config || {};
      this._user  = null;
      this._token = null;
      this._refreshTimer = null;
      this._load();
    }

    _load() {
      const store = this.config.tokenStore === 'local' ? localStorage : sessionStorage;
      const saved = store.getItem('ncui_auth');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.expiry && Date.now() > data.expiry) {
            this._clear(); // token expired
          } else {
            this._user  = data.user;
            this._token = data.token;
            this._scheduleRefresh(data.expiry);
          }
        } catch {}
      }
    }

    _save(user, token, expiry) {
      const store = this.config.tokenStore === 'local' ? localStorage : sessionStorage;
      store.setItem('ncui_auth', JSON.stringify({ user, token, expiry }));
    }

    _clear() {
      const store = this.config.tokenStore === 'local' ? localStorage : sessionStorage;
      store.removeItem('ncui_auth');
      this._user  = null;
      this._token = null;
      if (this._refreshTimer) clearTimeout(this._refreshTimer);
    }

    _scheduleRefresh(expiry) {
      if (!this.config.refreshEndpoint || !expiry) return;
      const delay = expiry - Date.now() - 60000; // refresh 1 min before expiry
      if (delay > 0) {
        this._refreshTimer = setTimeout(() => this._doRefresh(), delay);
      }
    }

    async _doRefresh() {
      try {
        const res = await global.fetch(this.config.refreshEndpoint, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this._token },
        });
        if (res.ok) {
          const data = await res.json();
          this.login(data.user, data.token, data.expires_in);
        }
      } catch {}
    }

    isAuthenticated() { return !!this._token && !!this._user; }
    getUser()         { return this._user; }
    get token()       { return this._token; }

    hasRole(role) {
      if (!this._user) return false;
      return (this._user.roles || []).includes(role);
    }

    hasAnyRole(roles) {
      return roles.some(r => this.hasRole(r));
    }

    hasPerm(permission) {
      if (!this._user) return false;
      const [action, resource] = permission.split(':');
      const policy = this._user._rbac_policy || {};
      for (const role of (this._user.roles || [])) {
        const perms = policy[role] || [];
        if (perms.includes('*') ||
            perms.includes(action + ':*') ||
            perms.includes(action + ':' + resource) ||
            perms.includes('*:' + resource)) return true;
      }
      return false;
    }

    async login(user, token, expiresIn) {
      const expiry = expiresIn ? Date.now() + expiresIn * 1000 : null;
      this._user  = user;
      this._token = token;
      this._save(user, token, expiry);
      this._scheduleRefresh(expiry);
    }

    async logout() {
      if (this.config.logoutEndpoint && this._token) {
        try {
          await global.fetch(this.config.logoutEndpoint, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + this._token },
          });
        } catch {}
      }
      this._clear();
      if (this.config.onLogout) NCUIRouter.push(this.config.onLogout);
    }

    async authenticate(email, password) {
      const res = await global.fetch(this.config.loginEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
      }
      const data = await res.json();
      await this.login(data.user, data.token, data.expires_in);
      if (this.config.onLogin) NCUIRouter.push(this.config.onLogin);
      return data.user;
    }
  }

  /* ══════════════════════════════════════════════════════════
   *  7. FORM VALIDATION ENGINE
   *
   *  Same rules as NC UI compiler's OP_UI_VALIDATE opcode.
   *  validate(value, rules) → { valid, errors }
   * ══════════════════════════════════════════════════════════ */

  const NCUIValidation = {
    _rules: {
      required:        (v) => v != null && String(v).trim() !== '' || 'This field is required',
      email:           (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
      url:             (v) => /^https?:\/\/.+/.test(v) || 'Enter a valid URL',
      phone:           (v) => /^\+?[\d\s\-()]{7,}$/.test(v) || 'Enter a valid phone number',
      numeric:         (v) => !isNaN(v) || 'Must be a number',
      integer:         (v) => Number.isInteger(Number(v)) || 'Must be a whole number',
      'strong-password': (v) => {
        const s = String(v);
        if (s.length < 8)             return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(s))         return 'Password must contain an uppercase letter';
        if (!/[a-z]/.test(s))         return 'Password must contain a lowercase letter';
        if (!/\d/.test(s))            return 'Password must contain a number';
        if (!/[^A-Za-z0-9]/.test(s)) return 'Password must contain a special character';
        return true;
      },
    },

    addRule(name, fn) {
      this._rules[name] = fn;
    },

    validate(value, rules) {
      const errors = [];
      for (const rule of rules) {
        let result;

        if (rule === 'required')   result = this._rules.required(value);
        else if (rule === 'email') result = this._rules.email(value);
        else if (rule.startsWith('min-length:')) {
          const min = parseInt(rule.split(':')[1]);
          result = String(value).length >= min || `Must be at least ${min} characters`;
        } else if (rule.startsWith('max-length:')) {
          const max = parseInt(rule.split(':')[1]);
          result = String(value).length <= max || `Must be at most ${max} characters`;
        } else if (rule.startsWith('min:')) {
          const min = parseFloat(rule.split(':')[1]);
          result = parseFloat(value) >= min || `Must be at least ${min}`;
        } else if (rule.startsWith('max:')) {
          const max = parseFloat(rule.split(':')[1]);
          result = parseFloat(value) <= max || `Must be at most ${max}`;
        } else if (rule.startsWith('matches:')) {
          const other = rule.split(':')[1];
          // 'other' is a state key name — checked externally
          result = true;
        } else if (this._rules[rule]) {
          result = this._rules[rule](value);
        } else {
          result = true; // unknown rule → pass
        }

        if (result !== true) errors.push(result);
      }
      return { valid: errors.length === 0, errors };
    },

    /* validateForm — validate all fields, return all errors */
    validateForm(fields) {
      const allErrors = {};
      let valid = true;
      for (const [name, { value, rules }] of Object.entries(fields)) {
        const result = this.validate(value, rules);
        if (!result.valid) {
          allErrors[name] = result.errors;
          valid = false;
        }
      }
      return { valid, errors: allErrors };
    },
  };

  /* ══════════════════════════════════════════════════════════
   *  8. HELPER FUNCTIONS
   *
   *  Available inside NC UI action blocks and templates.
   *  Mirrors the NC standard library.
   * ══════════════════════════════════════════════════════════ */

  const NCUIHelpers = {
    string:   (v) => String(v == null ? '' : v),
    number:   (v) => Number(v),
    bool:     (v) => Boolean(v),
    len:      (v) => v == null ? 0 : (Array.isArray(v) ? v.length : String(v).length),
    count:    (v) => v == null ? 0 : (Array.isArray(v) ? v.length : Object.keys(v).length),
    sum:      (v) => (Array.isArray(v) ? v : []).reduce((a, b) => a + (Number(b) || 0), 0),
    average:  (v) => { const a = (Array.isArray(v) ? v : []); return a.length ? NCUIHelpers.sum(a) / a.length : 0; },
    min:      (v) => Math.min(...(Array.isArray(v) ? v : [])),
    max:      (v) => Math.max(...(Array.isArray(v) ? v : [])),
    filter:   (v, fn) => (Array.isArray(v) ? v : []).filter(fn),
    map:      (v, fn) => (Array.isArray(v) ? v : []).map(fn),
    first:    (v) => (Array.isArray(v) ? v[0] : null),
    last:     (v) => (Array.isArray(v) ? v[v.length - 1] : null),
    sort:     (v, key) => [...(Array.isArray(v) ? v : [])].sort((a, b) => key ? (a[key] > b[key] ? 1 : -1) : (a > b ? 1 : -1)),
    unique:   (v) => [...new Set(Array.isArray(v) ? v : [])],
    contains: (v, item) => Array.isArray(v) ? v.includes(item) : String(v).includes(item),
    replace:  (s, f, r) => String(s).replaceAll(f, r),
    upper:    (s) => String(s).toUpperCase(),
    lower:    (s) => String(s).toLowerCase(),
    trim:     (s) => String(s).trim(),
    initials: (s) => String(s).split(' ').map(w => w[0]).join('').toUpperCase(),
    format_date: (d, fmt) => d ? new Date(d).toLocaleDateString() : '',
    format_currency: (n, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n),
    truncate: (s, len = 100) => String(s).length > len ? String(s).slice(0, len) + '...' : String(s),
  };

  /* ══════════════════════════════════════════════════════════
   *  9. NC UI RUNTIME — main entry point
   *
   *  Called by compiled .ncui.js files:
   *    NCUIRuntime.mount(appDefinition, '#app')
   *
   *  appDefinition is the object produced by nc_ui_compiler
   *  when run with --target=js flag.
   * ══════════════════════════════════════════════════════════ */

  const NCUIRuntime = {
    _appState: null,
    _auth:     null,

    mount(appDef, selector) {
      const container = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (!container) {
        console.error('[NC UI] Mount target not found:', selector);
        return;
      }

      // 1. Initialize global app state
      this._appState = new NCUIState(appDef.state || {});

      // 2. Register computed state
      for (const [name, fn] of Object.entries(appDef.computed || {})) {
        this._appState.computed(name, fn);
      }

      // 3. Initialize auth
      this._auth = new NCUIAuth(appDef.auth || {});

      // 4. Set up router
      NCUIRouter.define(appDef.routes || []);
      NCUIRouter.init(container, this._appState, this._auth,
                      appDef.routerMode || 'hash');

      // 5. Apply theme CSS variables
      if (appDef.themes) {
        this._applyTheme(appDef.themes[appDef.defaultTheme || 'dark']);
      }

      console.log('[NC UI] App mounted:', appDef.name, 'v' + appDef.version);
    },

    _applyTheme(theme) {
      if (!theme) return;
      const root = document.documentElement;
      for (const [key, val] of Object.entries(theme)) {
        root.style.setProperty('--ncui-' + key, val);
      }
    },

    /* Exposed utilities for compiled components */
    h, hText, NCUIHelpers, NCUIValidation,
  };

  /* ══════════════════════════════════════════════════════════
   *  Exports
   * ══════════════════════════════════════════════════════════ */

  global.NCUIRuntime    = NCUIRuntime;
  global.NCUIRouter     = NCUIRouter;
  global.NCUIState      = NCUIState;
  global.NCUIAuth       = NCUIAuth;
  global.NCUIValidation = NCUIValidation;
  global.NCUIHelpers    = NCUIHelpers;
  global.h              = h;
  global.hText          = hText;

})(typeof globalThis !== 'undefined' ? globalThis : window);
