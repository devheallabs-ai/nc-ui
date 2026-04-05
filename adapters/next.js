'use strict';

const reactAdapter = require('./react');
const project = require('../project');

function createNextNCUIClient(React, options) {
  return reactAdapter.createNCUIComponent(React, options || {});
}

function createNextNCUIRoute(React, options) {
  return reactAdapter.createNCUIRoute(React, options || {});
}

function createSSRBootstrap(payload) {
  const json = JSON.stringify(payload || null);
  return `<script id="ncui-next-ssr">window.__NCUI_SSR__=${json};</script>`;
}

function createNextDocumentProps(html, payload) {
  return {
    __html: `${createSSRBootstrap(payload)}${html || ''}`
  };
}

function createNextNCUIConfig(baseConfig, options) {
  const config = Object.assign({}, baseConfig || {});
  const opts = options || {};
  const aliases = opts.projectDir ? project.workspaceAliases(opts.projectDir) : {};
  const workspacePackages = Object.keys(aliases)
    .filter(key => /^@ncui\/[^/]+$/.test(key))
    .map(key => key.replace(/^@ncui\//, ''));
  const previousWebpack = config.webpack;
  const previousHeaders = config.headers;

  config.transpilePackages = Array.from(new Set([].concat(config.transpilePackages || [], workspacePackages)));
  config.webpack = function applyNCUIWebpack(nextWebpackConfig, context) {
    const nextConfig = nextWebpackConfig || {};
    nextConfig.resolve = nextConfig.resolve || {};
    nextConfig.resolve.alias = Object.assign({}, nextConfig.resolve.alias || {}, aliases);
    if (typeof previousWebpack === 'function') {
      return previousWebpack(nextConfig, context);
    }
    return nextConfig;
  };
  config.headers = async function ncuiHeaders() {
    const inherited = typeof previousHeaders === 'function' ? await previousHeaders() : [];
    return inherited.concat([{
      source: '/(.*)',
      headers: [
        { key: 'X-NCUI-Adapter', value: 'next' },
        { key: 'X-NCUI-Plain-English', value: 'true' }
      ]
    }]);
  };

  return config;
}

module.exports = {
  createNextNCUIClient,
  createNextNCUIRoute,
  createSSRBootstrap,
  createNextDocumentProps,
  createNextNCUIConfig
};
