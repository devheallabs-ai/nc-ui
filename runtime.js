/**
 * NC UI Runtime
 * Client-side runtime for NC UI compiled pages.
 * Provides: reactive state, client-side routing, event binding,
 * component lifecycle, animation triggers, repeat/conditional rendering.
 *
 * Part of the NC language ecosystem by DevHeal Labs AI.
 * No external dependencies. Works in all modern browsers.
 */

(function (root) {
  'use strict';

  // ─── Reactive State ─────────────────────────────────────────────────────────

  class StateStore {
    constructor(initial) {
      this._state = {};
      this._listeners = {};
      this._globalListeners = [];
      if (initial) {
        for (const key in initial) {
          this._state[key] = this._deepClone(initial[key]);
        }
      }
    }

    get(key) {
      return this._state[key];
    }

    set(key, value) {
      const old = this._state[key];
      this._state[key] = value;
      this._notify(key, value, old);
    }

    update(key, fn) {
      const old = this._state[key];
      const val = fn(this._deepClone(old));
      this._state[key] = val;
      this._notify(key, val, old);
    }

    addTo(key, item) {
      const arr = this._state[key];
      if (!Array.isArray(arr)) return;
      arr.push(item);
      this._notify(key, arr, arr);
    }

    removeFrom(key, index) {
      const arr = this._state[key];
      if (!Array.isArray(arr)) return;
      arr.splice(index, 1);
      this._notify(key, arr, arr);
    }

    toggle(key) {
      this.set(key, !this._state[key]);
    }

    on(key, fn) {
      if (!this._listeners[key]) this._listeners[key] = [];
      this._listeners[key].push(fn);
      return () => {
        this._listeners[key] = this._listeners[key].filter(f => f !== fn);
      };
    }

    onAny(fn) {
      this._globalListeners.push(fn);
      return () => {
        this._globalListeners = this._globalListeners.filter(f => f !== fn);
      };
    }

    getAll() {
      return this._deepClone(this._state);
    }

    _notify(key, val, old) {
      const fns = this._listeners[key] || [];
      for (let i = 0; i < fns.length; i++) fns[i](val, old, key);
      for (let i = 0; i < this._globalListeners.length; i++) {
        this._globalListeners[i](key, val, old);
      }
    }

    _deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
      const clone = {};
      for (const key in obj) clone[key] = this._deepClone(obj[key]);
      return clone;
    }
  }

  // ─── Template Engine ────────────────────────────────────────────────────────

  function interpolate(template, data) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{([^}]+)\}\}/g, function (_, expr) {
      expr = expr.trim();
      var parts = expr.split('.');
      var val = data;
      for (var i = 0; i < parts.length; i++) {
        if (val == null) return '';
        val = val[parts[i]];
      }
      return val != null ? String(val) : '';
    });
  }

  // ─── Virtual DOM (minimal diff/patch) ───────────────────────────────────────

  function vText(text) {
    return { type: '#text', text: String(text) };
  }

  function vNode(tag, attrs, children) {
    return { type: tag, attrs: attrs || {}, children: children || [] };
  }

  function createElement(vnode) {
    if (vnode.type === '#text') {
      return document.createTextNode(vnode.text);
    }
    var el = document.createElement(vnode.type);
    var attrs = vnode.attrs;
    for (var key in attrs) {
      if (key.indexOf('on') === 0) {
        el.addEventListener(key.slice(2), attrs[key]);
      } else if (key === 'className') {
        el.className = attrs[key];
      } else if (key === 'style' && typeof attrs[key] === 'object') {
        for (var prop in attrs[key]) el.style[prop] = attrs[key][prop];
      } else if (key === 'innerHTML') {
        // Security: sanitize innerHTML to prevent XSS
        var sanitized = attrs[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/\bon\w+\s*=/gi, 'data-removed-handler=');
        el.innerHTML = sanitized;
      } else {
        el.setAttribute(key, attrs[key]);
      }
    }
    for (var i = 0; i < vnode.children.length; i++) {
      el.appendChild(createElement(vnode.children[i]));
    }
    return el;
  }

  function patch(parent, oldVNode, newVNode, index) {
    index = index || 0;
    var child = parent.childNodes[index];

    if (!oldVNode) {
      parent.appendChild(createElement(newVNode));
      return;
    }
    if (!newVNode) {
      if (child) parent.removeChild(child);
      return;
    }
    if (changed(oldVNode, newVNode)) {
      parent.replaceChild(createElement(newVNode), child);
      return;
    }
    if (newVNode.type !== '#text') {
      var oldLen = oldVNode.children.length;
      var newLen = newVNode.children.length;
      var max = Math.max(oldLen, newLen);
      for (var i = 0; i < max; i++) {
        patch(child, oldVNode.children[i], newVNode.children[i], i);
      }
      // Remove extra children
      while (child.childNodes.length > newLen) {
        child.removeChild(child.lastChild);
      }
    }
  }

  function changed(a, b) {
    if (a.type !== b.type) return true;
    if (a.type === '#text' && a.text !== b.text) return true;
    if (a.attrs && b.attrs) {
      var aKeys = Object.keys(a.attrs);
      var bKeys = Object.keys(b.attrs);
      if (aKeys.length !== bKeys.length) return true;
      for (var i = 0; i < aKeys.length; i++) {
        var k = aKeys[i];
        if (typeof a.attrs[k] !== 'function' && a.attrs[k] !== b.attrs[k]) return true;
      }
    }
    return false;
  }

  // ─── Router ─────────────────────────────────────────────────────────────────

  class Router {
    constructor() {
      this._routes = [];
      this._outlet = null;
      this._current = null;
      this._onRoute = null;
      this._notFound = null;
      this._bound = this._handlePop.bind(this);
    }

    register(path, componentName) {
      var params = [];
      var regex = path
        .replace(/:([A-Za-z_][\w-]*)/g, function (_, name) {
          params.push(name);
          return '([^/]+)';
        })
        .replace(/\{\{(\w+)\}\}/g, function (_, name) {
        params.push(name);
        return '([^/]+)';
        });
      this._routes.push({
        path: path,
        regex: new RegExp('^' + regex + '$'),
        params: params,
        component: componentName
      });
    }

    add(path, handler) {
      this.register(path, handler);
    }

    setNotFound(handler) {
      this._notFound = handler;
    }

    start(outlet, onRoute) {
      this._outlet = outlet;
      this._onRoute = onRoute;
      root.addEventListener('popstate', this._bound);
      this._resolve(root.location.pathname);
    }

    navigate(path) {
      if (path === this._current) return;
      root.history.pushState(null, '', path);
      this._resolve(path);
    }

    stop() {
      root.removeEventListener('popstate', this._bound);
    }

    _handlePop() {
      this._resolve(root.location.pathname);
    }

    _resolve(path) {
      this._current = path;
      for (var i = 0; i < this._routes.length; i++) {
        var route = this._routes[i];
        var match = path.match(route.regex);
        if (match) {
          var params = {};
          for (var j = 0; j < route.params.length; j++) {
            params[route.params[j]] = match[j + 1];
          }
          if (typeof route.component === 'function') {
            route.component(params);
            return;
          }
          if (this._onRoute) {
            this._onRoute(route.component, params);
          }
          return;
        }
      }
      if (typeof this._notFound === 'function') {
        this._notFound(path);
        return;
      }
      // 404 — render nothing or a fallback
      if (this._onRoute) this._onRoute(null, {});
    }
  }

  // ─── Component Registry ─────────────────────────────────────────────────────

  var _components = {};

  function defineComponent(name, renderFn, propNames) {
    _components[name] = { render: renderFn, props: propNames || [] };
  }

  function renderComponent(name, props, store) {
    var comp = _components[name];
    if (!comp) return null;
    var data = Object.assign({}, store ? store.getAll() : {}, props || {});
    return comp.render(data);
  }

  // ─── Repeat Rendering ──────────────────────────────────────────────────────

  function renderRepeat(container, items, templateFn) {
    container.innerHTML = '';
    if (!Array.isArray(items)) return;
    for (var i = 0; i < items.length; i++) {
      var el = templateFn(items[i], i);
      if (el) container.appendChild(el instanceof Node ? el : createElement(el));
    }
  }

  // ─── Conditional Rendering ──────────────────────────────────────────────────

  function renderIf(container, condition, trueFn, falseFn) {
    container.innerHTML = '';
    var el = condition ? trueFn() : (falseFn ? falseFn() : null);
    if (el) container.appendChild(el instanceof Node ? el : createElement(el));
  }

  // ─── Animation Manager ─────────────────────────────────────────────────────

  class AnimationManager {
    constructor() {
      this._observer = null;
      this._hoverObservers = [];
    }

    init() {
      var self = this;
      this._observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self._activate(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      // Observe all animated elements
      var els = document.querySelectorAll('[data-ncui-anim]');
      for (var i = 0; i < els.length; i++) {
        this._observer.observe(els[i]);
      }

      // Observe section children for stagger/fade-up
      var sections = document.querySelectorAll('[class*=ncui-anim-] .ncui-container > *, [class*=ncui-anim-] .ncui-grid > .ncui-card');
      for (var j = 0; j < sections.length; j++) {
        this._observer.observe(sections[j]);
      }

      // Hover animations
      var hoverEls = document.querySelectorAll('[data-ncui-anim-hover]');
      for (var k = 0; k < hoverEls.length; k++) {
        this._setupHover(hoverEls[k]);
      }
    }

    _activate(el) {
      // Stagger: apply delay based on sibling index
      var parent = el.closest('[class*=ncui-anim-stagger]');
      if (parent) {
        var siblings = Array.from(el.parentElement.children);
        var idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx * 0.1) + 's';
      }
      el.classList.add('ncui-visible');

      // Custom data-anim
      var anim = el.getAttribute('data-ncui-anim');
      if (anim) {
        el.classList.add('ncui-anim-active');
      }
    }

    _setupHover(el) {
      var animClass = el.getAttribute('data-ncui-anim-hover');
      el.addEventListener('mouseenter', function () {
        el.classList.add('ncui-anim-' + animClass);
      });
      el.addEventListener('mouseleave', function () {
        el.classList.remove('ncui-anim-' + animClass);
      });
    }

    observe(el) {
      if (this._observer) this._observer.observe(el);
    }

    destroy() {
      if (this._observer) this._observer.disconnect();
    }
  }

  // ─── Action Registry ────────────────────────────────────────────────────────

  var _actions = {};

  function defineAction(name, fn) {
    _actions[name] = fn;
  }

  function runAction(name, store, args) {
    var fn = _actions[name];
    if (!fn) {
      console.warn('NC UI: Unknown action "' + name + '"');
      return;
    }
    fn(store, args);
  }

  // ─── Event Binding ──────────────────────────────────────────────────────────

  // Track bound elements to prevent duplicate listeners
  var _boundElements = new WeakSet();

  function bindEvents(root, store) {
    // data-ncui-click="actionName"
    var clickEls = root.querySelectorAll('[data-ncui-click]');
    for (var i = 0; i < clickEls.length; i++) {
      (function (el) {
        if (_boundElements.has(el)) return;
        _boundElements.add(el);
        var action = el.getAttribute('data-ncui-click');
        el.addEventListener('click', function (e) {
          e.preventDefault();
          runAction(action, store);
        });
      })(clickEls[i]);
    }

    // data-ncui-change="actionName"
    var changeEls = root.querySelectorAll('[data-ncui-change]');
    for (var j = 0; j < changeEls.length; j++) {
      (function (el) {
        if (_boundElements.has(el)) return;
        _boundElements.add(el);
        var action = el.getAttribute('data-ncui-change');
        el.addEventListener('input', function (e) {
          runAction(action, store, { value: e.target.value });
        });
      })(changeEls[j]);
    }

    // data-ncui-submit="actionName"
    var submitEls = root.querySelectorAll('[data-ncui-submit]');
    for (var k = 0; k < submitEls.length; k++) {
      (function (el) {
        if (_boundElements.has(el)) return;
        _boundElements.add(el);
        var action = el.getAttribute('data-ncui-submit');
        el.addEventListener('submit', function (e) {
          e.preventDefault();
          var data = {};
          var inputs = el.querySelectorAll('input, textarea, select');
          for (var m = 0; m < inputs.length; m++) {
            var inp = inputs[m];
            var name = inp.name || inp.id || '';
            if (name) data[name] = inp.value;
          }
          runAction(action, store, data);
        });
      })(submitEls[k]);
    }

    // data-ncui-bind="stateKey" — two-way binding
    var bindEls = root.querySelectorAll('[data-ncui-bind]');
    for (var b = 0; b < bindEls.length; b++) {
      (function (el) {
        if (_boundElements.has(el)) return;
        _boundElements.add(el);
        var key = el.getAttribute('data-ncui-bind');
        el.value = store.get(key) || '';
        el.addEventListener('input', function (e) {
          store.set(key, e.target.value);
        });
        store.on(key, function (val) {
          if (el.value !== val) el.value = val;
        });
      })(bindEls[b]);
    }

    // data-ncui-link — SPA navigation
    var linkEls = root.querySelectorAll('[data-ncui-link]');
    for (var l = 0; l < linkEls.length; l++) {
      (function (el) {
        if (_boundElements.has(el)) return;
        _boundElements.add(el);
        var path = el.getAttribute('data-ncui-link');
        el.addEventListener('click', function (e) {
          e.preventDefault();
          if (root._ncuiRouter) root._ncuiRouter.navigate(path);
        });
      })(linkEls[l]);
    }
  }

  // ─── NC UI App Bootstrap ────────────────────────────────────────────────────

  class NCUIApp {
    constructor(config) {
      config = config || {};
      this.store = new StateStore(config.state || {});
      this.router = new Router();
      this.animations = new AnimationManager();
      this._mountPoint = null;
      this._renderFn = config.render || null;
      this._oldVTree = null;

      // Register initial actions
      if (config.actions) {
        for (var name in config.actions) {
          defineAction(name, config.actions[name]);
        }
      }

      // Register routes
      if (config.routes) {
        for (var i = 0; i < config.routes.length; i++) {
          this.router.register(config.routes[i].path, config.routes[i].component);
        }
      }

      // Register components
      if (config.components) {
        for (var cname in config.components) {
          defineComponent(cname, config.components[cname].render, config.components[cname].props);
        }
      }
    }

    mount(selector) {
      this._mountPoint = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (!this._mountPoint) {
        this._mountPoint = document.body;
      }

      var self = this;

      // Re-render on any state change
      this.store.onAny(function () {
        self._rerender();
      });

      // Init animations after first render
      this.animations.init();

      // Bind events
      bindEvents(document, this.store);
      document._ncuiRouter = this.router;

      return this;
    }

    _rerender() {
      // Update text with interpolation
      var els = document.querySelectorAll('[data-ncui-text]');
      var data = this.store.getAll();
      for (var i = 0; i < els.length; i++) {
        var tpl = els[i].getAttribute('data-ncui-text');
        els[i].textContent = interpolate(tpl, data);
      }

      // Update conditionals
      var condEls = document.querySelectorAll('[data-ncui-if]');
      for (var j = 0; j < condEls.length; j++) {
        var key = condEls[j].getAttribute('data-ncui-if');
        var negate = key.charAt(0) === '!';
        var realKey = negate ? key.slice(1) : key;
        var val = this.store.get(realKey);
        var show = negate ? !val : !!val;
        condEls[j].style.display = show ? '' : 'none';
      }

      // Update repeats
      var repeatEls = document.querySelectorAll('[data-ncui-repeat]');
      for (var k = 0; k < repeatEls.length; k++) {
        var expr = repeatEls[k].getAttribute('data-ncui-repeat');
        var tplId = repeatEls[k].getAttribute('data-ncui-repeat-tpl');
        var items = this.store.get(expr);
        if (Array.isArray(items) && tplId) {
          var tplEl = document.getElementById(tplId);
          if (tplEl) {
            repeatEls[k].innerHTML = '';
            for (var m = 0; m < items.length; m++) {
              var clone = tplEl.content.cloneNode(true);
              var allEls = clone.querySelectorAll('*');
              for (var n = 0; n < allEls.length; n++) {
                if (allEls[n].textContent.indexOf('{{') !== -1) {
                  allEls[n].textContent = interpolate(allEls[n].textContent, items[m]);
                }
              }
              repeatEls[k].appendChild(clone);
            }
          }
        }
      }

      // Re-bind events on dynamic content
      bindEvents(document, this.store);
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  var NCUI = {
    StateStore: StateStore,
    Router: Router,
    AnimationManager: AnimationManager,
    NCUIApp: NCUIApp,
    defineComponent: defineComponent,
    renderComponent: renderComponent,
    defineAction: defineAction,
    runAction: runAction,
    bindEvents: bindEvents,
    interpolate: interpolate,
    renderRepeat: renderRepeat,
    renderIf: renderIf,
    vNode: vNode,
    vText: vText,
    createElement: createElement,
    patch: patch,
    createApp: function (config) {
      return new NCUIApp(config);
    }
  };

  // Export for Node.js and browser
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NCUI;
  }
  if (typeof root !== 'undefined') {
    root.NCUI = NCUI;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
