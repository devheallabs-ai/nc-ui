'use strict';

function mountWithInterop(target, options) {
  if (typeof window === 'undefined' || !window.NCUIInterop || !target) return false;
  const mode = options && options.mode ? options.mode : 'component';
  if (mode === 'route') {
    return window.NCUIInterop.mountRoute(options.path || '/', target);
  }
  return window.NCUIInterop.mountComponent(options.name, target, options.props || {});
}

function createNCUIComponent(React, options) {
  options = options || {};
  return function NCUIComponent(props) {
    const ref = React.useRef(null);
    React.useEffect(function () {
      mountWithInterop(ref.current, {
        mode: 'component',
        name: options.name || props.name,
        props: Object.assign({}, options.props || {}, props)
      });
    }, [props]);
    return React.createElement(options.tagName || 'div', {
      ref,
      className: options.className || 'ncui-react-host'
    });
  };
}

function createNCUIRoute(React, options) {
  options = options || {};
  return function NCUIRoute(props) {
    const ref = React.useRef(null);
    React.useEffect(function () {
      mountWithInterop(ref.current, {
        mode: 'route',
        path: options.path || props.path || '/'
      });
    }, [props && props.path]);
    return React.createElement(options.tagName || 'div', {
      ref,
      className: options.className || 'ncui-react-route'
    });
  };
}

module.exports = {
  mountWithInterop,
  createNCUIComponent,
  createNCUIRoute
};
