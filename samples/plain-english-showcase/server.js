'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const security = require('../../security');

const PORT = parseInt(process.env.PORT || '4010', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const HEADER_PATH = path.join(DIST_DIR, 'index.security-headers.json');
const MAX_BODY_BYTES = parseInt(process.env.APP_MAX_BODY_BYTES || process.env.NCUI_MAX_BODY_BYTES || '32768', 10);
const ENABLE_AUDIT_API = (process.env.APP_ENABLE_AUDIT_API || process.env.NCUI_ENABLE_AUDIT_API || '') === '1';
const AUDIT_TOKEN = process.env.APP_AUDIT_TOKEN || process.env.NCUI_AUDIT_TOKEN || '';
const AUDIT_LOG_PATH = process.env.APP_AUDIT_LOG_PATH || process.env.NCUI_AUDIT_LOG_PATH || path.join(__dirname, 'logs', 'audit.log');
const RATE_LIMIT_MAX = parseInt(process.env.APP_RATE_LIMIT_MAX || process.env.NCUI_RATE_LIMIT_MAX || '10', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.APP_RATE_LIMIT_WINDOW_MS || process.env.NCUI_RATE_LIMIT_WINDOW_MS || '6000', 10);
const TRUST_PROXY = (process.env.APP_TRUST_PROXY || process.env.NCUI_TRUST_PROXY || '') === '1';
const ENFORCE_SAME_ORIGIN = (process.env.APP_ENFORCE_SAME_ORIGIN || '1') !== '0';
const ENABLE_HONEYPOT = (process.env.APP_ENABLE_HONEYPOT || '1') !== '0';
const HONEYPOT_FIELDS = ['website', 'company', 'url'];

const baseHeaders = fs.existsSync(HEADER_PATH)
  ? JSON.parse(fs.readFileSync(HEADER_PATH, 'utf8'))
  : security.headers.generate();

delete baseHeaders['Strict-Transport-Security'];

const limiterByIp = new Map();

function getLimiter(ip) {
  if (!limiterByIp.has(ip)) {
    limiterByIp.set(ip, security.rateLimit.create(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS));
  }
  return limiterByIp.get(ip);
}

function generateRequestId() {
  try {
    return crypto.randomBytes(12).toString('hex');
  } catch (_) {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function extractClientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(part => part.trim()).filter(Boolean);
    if (forwarded[0]) return forwarded[0];
    const realIp = String(req.headers['x-real-ip'] || '').trim();
    if (realIp) return realIp;
  }
  return req.socket.remoteAddress || 'local';
}

function ensureAuditLogDir() {
  fs.mkdirSync(path.dirname(AUDIT_LOG_PATH), { recursive: true });
}

function persistAuditEntry(entry) {
  try {
    ensureAuditLogDir();
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (_) {
    // Keep request handling alive even if persistent logging fails.
  }
}

function recordAudit(event, details) {
  const entry = security.audit.log(event, details);
  persistAuditEntry(entry);
  return entry;
}

function hashForAudit(value) {
  try {
    return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex').slice(0, 16);
  } catch (_) {
    return 'unavailable';
  }
}

function isSameOriginRequest(req) {
  const host = String(req.headers.host || '').trim().toLowerCase();
  if (!host) return true;
  const origin = String(req.headers.origin || '').trim();
  const referer = String(req.headers.referer || '').trim();
  const candidate = origin || referer;
  if (!candidate) return true;
  try {
    const parsed = new URL(candidate);
    return parsed.host.toLowerCase() === host;
  } catch (_) {
    return false;
  }
}

function json(res, status, payload, extraHeaders) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, baseHeaders, extraHeaders || {}));
  res.end(JSON.stringify(payload));
}

function html(res, status, markup, extraHeaders) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  }, baseHeaders, extraHeaders || {}));
  res.end(markup);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
  res.writeHead(200, Object.assign({
    'Content-Type': contentType
  }, baseHeaders));
  fs.createReadStream(filePath).pipe(res);
}

function injectCsrfToken(markup, token) {
  const meta = `<meta name="csrf-token" content="${token}">`;
  if (markup.includes('<meta name="csrf-token"')) return markup;
  return markup.replace('</head>', `${meta}\n</head>`);
}

function collectBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limitBytes) {
        req.resume();
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (total > limitBytes) {
        reject(new Error('BODY_TOO_LARGE'));
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function isSafeStaticPath(distDir, pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relativePath);
  const root = path.resolve(distDir) + path.sep;
  return candidate === path.resolve(distDir) || candidate.startsWith(root) ? candidate : null;
}

function parseJsonSafe(input) {
  try {
    return JSON.parse(input || '{}');
  } catch (_) {
    return null;
  }
}

function validateSubmission(payload) {
  const errors = [];
  if (!security.validate.required(payload.name || '')) errors.push('Name is required.');
  if (!security.validate.minLength(String(payload.name || ''), 2)) errors.push('Name must be at least 2 characters.');
  if (!security.validate.maxLength(String(payload.name || ''), 80)) errors.push('Name must be 80 characters or fewer.');
  if (!security.validate.noSqlInjection(String(payload.name || ''))) errors.push('Name contains unsafe input.');
  if (!security.validate.email(String(payload.email || ''))) errors.push('Email must be valid.');
  if (!security.validate.maxLength(String(payload.email || ''), 160)) errors.push('Email must be 160 characters or fewer.');
  if (!security.validate.required(payload.message || '')) errors.push('Message is required.');
  if (!security.validate.minLength(String(payload.message || ''), 10)) errors.push('Message must be at least 10 characters.');
  if (!security.validate.maxLength(String(payload.message || ''), 240)) errors.push('Message must be 240 characters or fewer.');
  if (!security.validate.noSqlInjection(String(payload.message || ''))) errors.push('Message contains unsafe input.');
  if (ENABLE_HONEYPOT) {
    for (const field of HONEYPOT_FIELDS) {
      if (security.validate.required(payload[field])) {
        errors.push('Submission rejected.');
        break;
      }
    }
  }
  return errors;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;
    const requestId = generateRequestId();
    const ip = extractClientIp(req, TRUST_PROXY);
    res.setHeader('X-Request-Id', requestId);

    if (pathname === '/healthz' && req.method === 'GET') {
      return json(res, 200, { ok: true, status: 'healthy', requestId });
    }

    if (pathname === '/readyz' && req.method === 'GET') {
      const ready = fs.existsSync(INDEX_PATH);
      return json(res, ready ? 200 : 503, { ok: ready, status: ready ? 'ready' : 'not-ready', requestId });
    }

    if (pathname === '/api/contact' && req.method === 'POST') {
      if (ENFORCE_SAME_ORIGIN && !isSameOriginRequest(req)) {
        recordAudit('contact.origin_rejected', { ip, path: pathname, requestId });
        return json(res, 403, { ok: false, message: 'Origin not allowed.' });
      }

      const limiter = getLimiter(ip);
      if (!security.rateLimit.check(limiter)) {
        recordAudit('contact.rate_limited', { ip, path: pathname, requestId });
        return json(res, 429, { ok: false, message: 'Too many requests. Please wait and try again.' });
      }

      const csrfToken = req.headers['x-csrf-token'];
      if (!security.csrf.validateToken(String(csrfToken || ''))) {
        recordAudit('contact.csrf_rejected', { ip, path: pathname, requestId });
        return json(res, 403, { ok: false, message: 'Security token invalid or expired.' });
      }

      let rawBody;
      try {
        rawBody = await collectBody(req, MAX_BODY_BYTES);
      } catch (err) {
        if (err && err.message === 'BODY_TOO_LARGE') {
          recordAudit('contact.body_too_large', { ip, path: pathname, maxBytes: MAX_BODY_BYTES, requestId });
          return json(res, 413, { ok: false, message: 'Request body too large.' });
        }
        recordAudit('contact.body_read_failed', { ip, path: pathname, error: String(err && err.message || err), requestId });
        return json(res, 400, { ok: false, message: 'Unable to read request body.' });
      }

      const payload = parseJsonSafe(rawBody);
      if (!payload) {
        recordAudit('contact.invalid_json', { ip, path: pathname, requestId });
        return json(res, 400, { ok: false, message: 'Invalid JSON body.' });
      }

      const errors = validateSubmission(payload);
      if (errors.length) {
        recordAudit('contact.validation_failed', { ip, errors, requestId });
        return json(res, 422, { ok: false, message: errors[0], errors });
      }

      const submission = {
        id: 'msg_' + Date.now().toString(36),
        receivedAt: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        messageLength: String(payload.message || '').length
      };
      recordAudit('contact.submitted', {
        ip,
        requestId,
        submission: {
          id: submission.id,
          receivedAt: submission.receivedAt,
          messageLength: submission.messageLength
        },
        actor: {
          nameHash: hashForAudit(payload.name),
          emailHash: hashForAudit(payload.email)
        }
      });
      return json(res, 200, { ok: true, message: 'Message received successfully.', submission });
    }

    if (pathname === '/api/audit' && req.method === 'GET') {
      if (!ENABLE_AUDIT_API) {
        return json(res, 404, { ok: false, message: 'Not Found' });
      }
      if (AUDIT_TOKEN && req.headers['x-audit-token'] !== AUDIT_TOKEN) {
        recordAudit('audit.token_rejected', { ip, path: pathname, requestId });
        return json(res, 403, { ok: false, message: 'Audit access denied.' });
      }
      const entries = security.audit.getEntries();
      return json(res, 200, { entries, requestId });
    }

    if (pathname === '/' || pathname === '/index.html') {
      const csrfToken = security.csrf.generateToken();
      const markup = injectCsrfToken(fs.readFileSync(INDEX_PATH, 'utf8'), csrfToken);
      return html(res, 200, markup);
    }

    const staticPath = isSafeStaticPath(DIST_DIR, pathname);
    if (staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      return sendFile(res, staticPath);
    }

    html(res, 404, '<h1>404</h1><p>Not Found</p>');
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Plain English Showcase server running at http://localhost:${PORT}`);
  });
}

module.exports = {
  createServer,
  validateSubmission,
  isSafeStaticPath,
  extractClientIp,
  isSameOriginRequest,
  recordAudit,
  MAX_BODY_BYTES,
  AUDIT_LOG_PATH,
};
