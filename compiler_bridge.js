#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { compile, parse, tokenize } = require('./compiler');

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function validateAst(ast) {
  const errors = [];
  const warnings = [];

  const componentNames = new Set();
  const stateNames = new Set();
  const computedNames = new Set();
  const guardNames = new Set();
  const routePaths = new Set();
  let protectedRouteCount = 0;

  for (const component of ast.components || []) {
    const name = normalizeName(component.name);
    if (!name) {
      errors.push('Component name cannot be empty.');
      continue;
    }
    if (componentNames.has(name)) {
      errors.push(`Duplicate component "${component.name}".`);
    }
    componentNames.add(name);
  }

  for (const state of ast.states || []) {
    const name = normalizeName(state.name);
    if (!name) {
      errors.push('State name cannot be empty.');
      continue;
    }
    if (stateNames.has(name)) {
      errors.push(`Duplicate state "${state.name}".`);
    }
    stateNames.add(name);
  }

  for (const computed of ast.computeds || []) {
    const name = normalizeName(computed.name);
    if (!name) {
      errors.push('Computed name cannot be empty.');
      continue;
    }
    if (computedNames.has(name) || stateNames.has(name)) {
      errors.push(`Duplicate computed "${computed.name}".`);
    }
    computedNames.add(name);
  }

  for (const guard of ast.guards || []) {
    const name = normalizeName(guard.name);
    if (!name) {
      errors.push('Guard name cannot be empty.');
      continue;
    }
    if (guardNames.has(name)) {
      errors.push(`Duplicate guard "${guard.name}".`);
    }
    guardNames.add(name);
  }

  for (const route of ast.routes || []) {
    const routePath = String(route.path || '');
    if (!routePath) {
      errors.push('Route path cannot be empty.');
      continue;
    }
    if (routePaths.has(routePath)) {
      errors.push(`Duplicate route "${routePath}".`);
    }
    routePaths.add(routePath);

    const target = normalizeName(route.component);
    if (!target) {
      errors.push(`Route "${routePath}" is missing a component target.`);
      continue;
    }
    if (!componentNames.has(target)) {
      warnings.push(
        `Route "${routePath}" points to "${route.component}", but no component with that name is defined.`
      );
    }
    if (route.guard && !guardNames.has(normalizeName(route.guard))) {
      errors.push(`Route "${routePath}" references missing guard "${route.guard}".`);
    }
    if (route.requireAuth || route.requireRole || route.guard) {
      protectedRouteCount++;
    }
  }

  if (protectedRouteCount > 0 && !ast.auth) {
    warnings.push('Protected routes are defined without an auth block. Runtime defaults will be used.');
  }

  if (ast.auth) {
    const auth = ast.auth;
    const authType = normalizeName(auth.type || 'bearer');
    if ((authType === 'oauth' || authType === 'pkce')) {
      for (const key of ['auth endpoint', 'token endpoint', 'client id', 'redirect uri']) {
        if (!auth[key] && !auth[key.replace(/ ([a-z])/g, (_, ch) => ch.toUpperCase())]) {
          errors.push(`Auth type "${authType}" requires "${key}" in the auth block.`);
        }
      }
    }
    if (auth['token store']) {
      const store = normalizeName(auth['token store']);
      if (!['memory', 'session', 'local', 'cookie'].includes(store)) {
        errors.push(`Unsupported auth token store "${auth['token store']}". Use memory, session, local, or cookie.`);
      }
    }
  }

  if (!ast.meta || !ast.meta.title) {
    warnings.push('No page/app title found. Output will use the default HTML title.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function withResult(fn) {
  try {
    const result = fn();
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stdout.write(JSON.stringify({
      error: error && error.message ? error.message : String(error),
      valid: false
    }));
  }
}

function readSourceArg(index) {
  return process.argv[index] || '';
}

const command = process.argv[2];

switch (command) {
  case 'compile':
    withResult(() => {
      const source = readSourceArg(3);
      const ast = parse(source);
      const validation = validateAst(ast);
      if (!validation.valid) return validation;
      return {
        valid: true,
        html: compile(source),
        token_count: tokenize(source).length,
        warnings: validation.warnings
      };
    });
    break;

  case 'compile-file':
    withResult(() => {
      const filePath = path.resolve(readSourceArg(3));
      const source = fs.readFileSync(filePath, 'utf8');
      const ast = parse(source);
      const validation = validateAst(ast);
      if (!validation.valid) return validation;
      return {
        valid: true,
        html: compile(source),
        token_count: tokenize(source).length,
        warnings: validation.warnings,
        path: filePath
      };
    });
    break;

  case 'tokens':
    withResult(() => {
      const source = readSourceArg(3);
      const tokens = tokenize(source);
      return { valid: true, tokens, count: tokens.length };
    });
    break;

  case 'ast':
    withResult(() => {
      const source = readSourceArg(3);
      const ast = parse(source);
      const validation = validateAst(ast);
      return { ...validation, ast };
    });
    break;

  case 'validate':
    withResult(() => {
      const source = readSourceArg(3);
      const ast = parse(source);
      return { ...validateAst(ast), token_count: tokenize(source).length };
    });
    break;

  default:
    process.stdout.write(JSON.stringify({
      error: 'Unknown command. Use compile, compile-file, tokens, ast, or validate.'
    }));
    break;
}
