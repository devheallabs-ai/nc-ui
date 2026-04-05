'use strict';

function mountComponent(target, name, props) {
  if (typeof window === 'undefined' || !window.NCUIInterop) return false;
  return window.NCUIInterop.mountComponent(name, target, props || {});
}

function mountRoute(target, routePath) {
  if (typeof window === 'undefined' || !window.NCUIInterop) return false;
  return window.NCUIInterop.mountRoute(routePath || '/', target);
}

function snapshot() {
  if (typeof window === 'undefined' || !window.NCUIInterop) return null;
  return window.NCUIInterop.snapshot();
}

module.exports = {
  mountComponent,
  mountRoute,
  snapshot
};
