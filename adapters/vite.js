'use strict';

const compiler = require('../compiler');
const project = require('../project');
const hostAdapter = require('./framework-host');

function createNCUIVitePlugin(options) {
  const opts = options || {};
  return {
    name: 'nc-ui-vite-bridge',
    enforce: 'post',
    resolveId(id) {
      if (id === 'virtual:ncui-workspace') return id;
      return null;
    },
    load(id) {
      if (id !== 'virtual:ncui-workspace') return null;
      const aliases = opts.projectDir ? project.workspaceAliases(opts.projectDir) : {};
      return `export default ${JSON.stringify({ aliases })};`;
    },
    transform(code, id) {
      if (!id || !id.endsWith('.ncui')) return null;
      const compiled = compiler.compile(code);
      const html = typeof compiled === 'string' ? compiled : (compiled.html || compiled.code || compiled.output || '');
      return `export default ${JSON.stringify(html)};`;
    },
    transformIndexHtml(html) {
      return html;
    }
  };
}

function createViteNCUIConfig(options) {
  const opts = options || {};
  return {
    plugins: [createNCUIVitePlugin(opts)],
    resolve: {
      alias: opts.projectDir ? project.workspaceAliases(opts.projectDir) : {}
    },
    define: {
      __NCUI_PLAIN_ENGLISH__: true
    }
  };
}

function mountViteComponent(target, name, props) {
  return hostAdapter.mountComponent(target, name, props || {});
}

function mountViteRoute(target, routePath) {
  return hostAdapter.mountRoute(target, routePath || '/');
}

module.exports = {
  createNCUIVitePlugin,
  createViteNCUIConfig,
  mountViteComponent,
  mountViteRoute
};
