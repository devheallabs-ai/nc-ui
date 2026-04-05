# NC UI — Changelog

All notable changes to NC UI are documented here.
Follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] - 2026-03-31

### First stable release

This is the first production release of NC UI, aligned with NC engine v1.1.0.

### What's included

#### Native C Compiler (primary path — nc v1.1.0+)

The recommended compiler is now built directly into the NC engine binary (`nc ui build`).
This path has zero external dependencies — no Node.js, no npm, no build tools.

- **`nc ui build <file.ncui>`** — Compile to production HTML + security manifests
- **`nc ui serve <file.ncui>`** — Dev server with live reload
- **`nc ui watch <file.ncui>`** — File watcher with automatic rebuild

#### Legacy Node.js Compiler (optional)

The original JavaScript compiler is retained for web-based tooling and legacy workflows.
Requires Node.js 16+. Available as `npm install -g nc-ui`.

#### Output artifacts

`nc ui build` emits the following for every compiled page:

- `*.html` — Production HTML with inlined styles and scripts
- `*.security-headers.json` — CSP and security header manifest
- `_headers` — Netlify/Cloudflare Pages header rules
- `staticwebapp.config.json` — Azure Static Web Apps configuration
- `vercel.json` — Vercel deployment configuration
- `ssr-manifest.json` — SSR route manifest (when SSR routes are defined)
- `routes-manifest.json` + `_redirects` — Route and redirect rules

#### Security

All generated HTML includes hardened security headers by default:

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

#### VSCode Extension

- Syntax highlighting for `.ncui` files
- Build, serve, watch, and validate commands from the command palette
- Chat integration via NC AI

#### CLI commands

| Command | Description |
|---------|-------------|
| `ncui new <template> [dest]` | Scaffold from built-in template |
| `ncui build <file.ncui>` | Compile to HTML with security manifests |
| `ncui watch <file.ncui>` | Watch and rebuild on changes |
| `ncui serve <file.ncui> [port]` | Dev server with live reload (default: 3000) |
| `ncui packages` | List official NC UI ecosystem packages |
| `ncui package-init <name>` | Scaffold a package manifest |
| `ncui package-add <pkg>` | Install an official or local package |
| `ncui package-install` | Install all workspace dependencies |

#### Starter templates

Built into the CLI:
- `enterprise-admin` — Admin dashboard with sidebar navigation and data tables
- `customer-portal` — Customer-facing portal with authentication UI
- `docs-kb` — Documentation/knowledge base with search

#### Official packages

Available via `ncui package-add`:
- `auth-kit` — Authentication forms and flows
- `data-table` — Sortable, filterable data tables
- `ops-dashboard` — Operations and monitoring dashboard
- `chart-kit` — Chart and visualization components
- `form-kit` — Advanced form components with validation
- `interop-react` — React component interop bridge
- `next-bridge` — Next.js integration bridge
- `vite-bridge` — Vite integration bridge

### Dependencies

- NC engine v1.1.0+ (native compiler path)
- Node.js 16+ (legacy JS compiler path only)

### Compatibility

| Component | Minimum version |
|-----------|----------------|
| NC engine | v1.1.0 |
| Node.js (legacy only) | 16.x |
| Chrome/Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

---

## [0.9.0-beta] - 2026-03-01

### Beta release (internal)

- Initial native C compiler integration
- Template-based HTML generation
- Security header injection
- Basic VSCode extension with syntax highlighting
- Node.js CLI (ncui) with build and serve commands
- Examples: dashboard, landing page, portfolio
