#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[ext] || 'application/octet-stream';
}

const root = path.resolve(process.argv[2] || process.cwd());
const port = parseInt(process.argv[3] || process.env.PORT || '3000', 10);
const indexPath = path.join(root, 'index.html');
const securityHeaders = loadJson(path.join(root, 'index.security-headers.json')) || {};
const routesManifest = loadJson(path.join(root, 'routes-manifest.json'));
const ssrManifest = loadJson(path.join(root, 'ssr-manifest.json'));

function applyHeaders(res) {
  for (const [name, value] of Object.entries(securityHeaders)) {
    res.setHeader(name, value);
  }
}

function shouldServeSpaFallback(urlPath) {
  if (!routesManifest || !Array.isArray(routesManifest.routes) || !routesManifest.routes.length) {
    return !path.extname(urlPath);
  }
  if (!urlPath || urlPath === '/') return true;
  if (!path.extname(urlPath)) return true;
  return false;
}

function resolveSSRFile(urlPath) {
  if (!ssrManifest || !Array.isArray(ssrManifest.staticRoutes)) return null;
  const normalized = !urlPath || urlPath === '/' ? '/' : urlPath.replace(/\/+$/, '');
  const match = ssrManifest.staticRoutes.find(route => route.path === normalized);
  if (!match || !match.outputPath) return null;
  const filePath = path.join(root, match.outputPath);
  return fs.existsSync(filePath) ? { filePath, route: match, path: normalized } : null;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTemplate(templateHtml, params) {
  let html = String(templateHtml || '');
  for (const [key, value] of Object.entries(params || {})) {
    html = html.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), escapeHtml(value));
  }
  return html;
}

function resolveDynamicRoute(urlPath) {
  if (!ssrManifest || !Array.isArray(ssrManifest.dynamicRoutes)) return null;
  const normalized = !urlPath || urlPath === '/' ? '/' : urlPath.replace(/\/+$/, '');
  for (const route of ssrManifest.dynamicRoutes) {
    if (!route.routePattern) continue;
    const regex = new RegExp(route.routePattern);
    const match = normalized.match(regex);
    if (!match) continue;
    const params = match.groups || {};
    const outletHtml = renderTemplate(route.templateHtml, params);
    return {
      path: normalized,
      route,
      params,
      outletHtml,
      state: {
        routeParams: params,
        currentRoute: normalized,
        currentRouteName: route.component
      }
    };
  }
  return null;
}

function injectSSRPayload(html, payload) {
  if (!payload) return html;
  const outlet = `<div id="ncui-router-outlet">${payload.outletHtml || ''}</div>`;
  const ssrScript = `<script id="ncui-ssr-data">window.__NCUI_SSR__=${JSON.stringify({
    path: payload.path,
    route: payload.route.path,
    component: payload.route.component,
    params: payload.params,
    state: payload.state
  })};</script>`;

  return String(html)
    .replace('<div id="ncui-router-outlet"></div>', outlet)
    .replace(/<script id="ncui-ssr-data">[\s\S]*?<\/script>/, ssrScript);
}

function buildAbsoluteUrl(req, targetUrl) {
  if (!targetUrl) return null;
  if (/^https?:\/\//i.test(targetUrl)) return targetUrl;
  const host = req.headers.host || `localhost:${port}`;
  const protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return `${protocol}://${host}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
}

function interpolateUrl(url, params) {
  let resolved = String(url || '');
  for (const [key, value] of Object.entries(params || {})) {
    const safe = encodeURIComponent(String(value));
    resolved = resolved.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), safe);
    resolved = resolved.replace(new RegExp(`:${key}(?=/|$)`, 'g'), safe);
  }
  return resolved;
}

async function runServerLoaders(req, routeInfo) {
  const state = Object.assign({}, routeInfo && routeInfo.state ? routeInfo.state : {});
  const loaders = ssrManifest && Array.isArray(ssrManifest.serverLoad) ? ssrManifest.serverLoad : [];
  if (!loaders.length || typeof fetch !== 'function') return state;

  for (const loader of loaders) {
    if (!loader || loader.type !== 'fetch' || !loader.saveAs) continue;
    const targetUrl = interpolateUrl(loader.url, routeInfo && routeInfo.params ? routeInfo.params : {});
    if (targetUrl.includes('{{') || /:([A-Za-z_][\w-]*)/.test(targetUrl)) continue;
    const requestUrl = buildAbsoluteUrl(req, targetUrl);
    if (!requestUrl) continue;
    try {
      const response = await fetch(requestUrl, {
        method: loader.method || 'GET',
        headers: { Accept: 'application/json' }
      });
      const contentType = response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();
      if (response.ok) {
        state[loader.saveAs] = data;
      } else {
        state[`${loader.saveAs}_error`] = data && data.message ? data.message : `Request failed (${response.status})`;
      }
    } catch (error) {
      state[`${loader.saveAs}_error`] = error.message;
    }
  }

  return state;
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const requested = path.join(root, urlPath === '/' ? '/index.html' : urlPath);

  applyHeaders(res);

  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    res.writeHead(200, { 'Content-Type': contentTypeFor(requested) });
    fs.createReadStream(requested).pipe(res);
    return;
  }

  const prerendered = resolveSSRFile(urlPath);
  if (prerendered) {
    const html = fs.readFileSync(prerendered.filePath, 'utf8');
    const state = await runServerLoaders(req, {
      path: prerendered.path,
      route: prerendered.route,
      params: {},
      state: {
        currentRoute: prerendered.path,
        currentRouteName: prerendered.route.component,
        routeParams: {}
      },
      outletHtml: ''
    });
    const hydrated = injectSSRPayload(html, {
      path: prerendered.path,
      route: prerendered.route,
      params: {},
      state,
      outletHtml: html.includes('<div id="ncui-router-outlet">') ? '' : undefined
    });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(hydrated);
    return;
  }

  const dynamicSSR = resolveDynamicRoute(urlPath);
  if (dynamicSSR && fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    dynamicSSR.state = await runServerLoaders(req, dynamicSSR);
    const hydrated = injectSSRPayload(html, dynamicSSR);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(hydrated);
    return;
  }

  if (shouldServeSpaFallback(urlPath) && fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const state = await runServerLoaders(req, {
      path: urlPath || '/',
      route: { path: urlPath || '/', component: null },
      params: {},
      state: { currentRoute: urlPath || '/', currentRouteName: null, routeParams: {} },
      outletHtml: ''
    });
    const hydrated = injectSSRPayload(html, {
      path: urlPath || '/',
      route: { path: urlPath || '/', component: null },
      params: {},
      state,
      outletHtml: ''
    });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(hydrated);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(port, () => {
  process.stdout.write(`NC UI Node adapter listening on http://localhost:${port}\n`);
});
