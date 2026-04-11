# NC UI

**Build websites in plain English.**

NC UI is a frontend language and compiler that takes human-readable markup and outputs stunning, production-ready HTML + CSS + JS. As of March 2026, the primary compiler is written in **Native C** and integrated directly into the [NC engine](https://github.com/devheallabs-ai/nc), enabling 100% self-contained, zero-dependency builds.

Write 20 lines of NC UI. Get a website that looks like a skilled designer built it.

[Live Playground](https://ncui.devheallabs.in) | [Examples](#examples) | [Syntax Reference](#syntax-reference) | [CLI Reference](#cli-reference)

---

## Requirements

| Requirement | Minimum version | Notes |
|-------------|----------------|-------|
| NC engine (`nc` binary) | **v1.0.0** | Zero dependencies — compiles `.ncui` to production HTML |

Download the `nc` binary: [github.com/devheallabs-ai/nc/releases](https://github.com/devheallabs-ai/nc/releases)

---

## Get Started in 30 Seconds

```bash
# Build your first page (Zero dependencies)
echo 'page "Hello"
theme "dark"
section hero centered:
    heading "Hello World" style "gradient"
    text "Built with NC UI"
    button "Learn More" style "primary"
    animate "fade-up"' > hello.ncui

# Compile with the NC engine
nc ui build hello.ncui

# Open hello.html in your browser — done!
```

---

## Installation

NC UI is **native**. The recommended way to use it is via the `nc` executable, which has **zero external dependencies**.

### Distribution

Primary path:
- GitHub Releases plus the `nc` binary
- Local builds via `nc ui build`

Optional channels:
- Homebrew and Chocolatey for install convenience
- Docker for CI or reproducible environments

Legacy compatibility:
- npm and Node.js only if you specifically need the JavaScript `ncui` wrapper

### NC Engine (Recommended)
Download the `nc` binary for your platform and run:
```bash
nc ui build mysite.ncui
```

For CI and Windows CMD log compatibility, NC engine UI output also supports:

- `NC_NO_ANIM=1` to disable animated terminal effects.
- `NO_COLOR=1` to disable ANSI colors.

```bash
NC_NO_ANIM=1 nc ui build mysite.ncui
NO_COLOR=1 nc ui build mysite.ncui
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `ncui new <template> [dest]` | Scaffold a starter app from a built-in plain-English template |
| `ncui packages` | List official NC UI ecosystem packages |
| `ncui package-init <name> [dest]` | Scaffold an NC UI package manifest |
| `ncui package-add <pkg> [dest]` | Install an official or local NC UI package into a workspace |
| `ncui package-install [dest]` | Install all workspace dependencies from `ncui-workspace.json` |
| `ncui package-link <dir> [dest]` | Link a local package into a workspace and lock it |
| `ncui build <file.ncui>` | Compile to `.html` and emit production security manifests |
| `ncui watch <file.ncui>` | Watch for changes and rebuild automatically |
| `ncui serve <file.ncui> [port]` | Serve with live reload and enterprise security headers (default port: 3000) |

`ncui build` now emits:
- `index.html` or your chosen output file
- `*.security-headers.json` for server/CDN enforcement
- `_headers` for Netlify/Cloudflare-style static hosts
- `staticwebapp.config.json` for Azure Static Web Apps
- `vercel.json` for Vercel-style deployment
- `routes-manifest.json` and `_redirects` when routes are defined
- `ssr-manifest.json` plus prerendered route HTML for SSR-ready routes

Starter templates built into the CLI:
- `enterprise-admin`
- `customer-portal`
- `docs-kb`

Official ecosystem package registry exposed by the CLI:
- `auth-kit`
- `data-table`
- `ops-dashboard`
- `chart-kit`
- `form-kit`
- `interop-react`
- `next-bridge`
- `vite-bridge`

### Shell script commands

| Command | Description |
|---------|-------------|
| `./start.sh build <file.ncui>` | Compile to HTML |
| `./start.sh serve <file.ncui>` | Dev server with live reload |
| `./start.sh playground` | Open browser-based playground |
| `./start.sh examples` | Build all example files |

---

## Syntax Reference

### Page Metadata

Set the page title, theme, and accent color at the top of your file:

```
page "My Website"
theme "dark"
accent "#00d4ff"
font "Inter"
```

| Property | Values | Default |
|----------|--------|---------|
| `page` | Any string | (untitled) |
| `theme` | `"dark"`, `"light"` | `"dark"` |
| `accent` | Any hex color | `"#00d4ff"` |
| `font` | Any Google Font name | `"Inter"` |

### Navigation

```
nav:
    brand "MySite"
    links:
        link "Home" to "#"
        link "About" to "#about"
        button "Sign Up" links to "#signup" style "primary"
```

The nav is fixed, has a glass blur effect, and collapses into a hamburger menu on mobile.

### Sections

Sections are the top-level layout blocks:

```
section hero centered:
    heading "Welcome" style "gradient"
    animate "fade-up"

section features:
    heading "Features"
    grid 3 columns:
        card icon "code":
            heading "Fast"
            text "Lightning speed"

section about with image "bg.jpg":
    heading "Our Story"
    text "We started in 2020..."
```

| Modifier | Effect |
|----------|--------|
| `centered` | Centers all text and content |
| `with image "url"` | Adds a background image overlay |

The section name becomes its HTML `id`, so `section features:` produces `<section id="features">`.

### Components

#### heading
```
heading "Title"
heading "Fancy Title" style "gradient"
```

#### subheading
```
subheading "A secondary line of text"
```

#### text
```
text "Body copy goes here"
```

#### button
```
button "Click Me" style "primary"
button "Learn More" links to "#about" style "outline"
button "Glass Button" style "glass"
button "Gradient" style "gradient"
```

Styles: `primary`, `outline`, `glass`, `gradient`

#### link
```
link "GitHub" to "https://github.com"
```

#### badge
```
badge "New Feature"
```

A small pill-shaped label, great for announcements.

#### row
```
row:
    button "One" style "primary"
    button "Two" style "outline"
```

#### grid
```
grid 3 columns:
    card:
        heading "A"
    card:
        heading "B"
    card:
        heading "C"
```

Supports 2, 3, or 4 columns. Automatically becomes 2 columns on tablet and 1 on mobile.

#### card
```
card:
    heading "Title"
    text "Description"

card icon "rocket":
    heading "With Icon"
    text "Cards can have icons"
```

Cards have glass borders, hover lift effects, and a gradient top-border on hover.

#### image
```
image "photo.jpg"
```

#### list
```
list:
    item "First thing"
    item "Second thing"
    item "Third thing"
```

Items get a styled checkmark icon automatically.

#### form
```
form action "/api/submit":
    input "Name" required
    input "Email" type "email" required
    textarea "Message"
    button "Submit" style "primary"
```

Forms have styled inputs with focus effects and are responsive by default.

They also support plain-English validation, auth-aware submit, response saving, and redirects:

```
form action "/api/signup" method "POST" with auth save response as signup_result redirect to "/welcome":
    input "Email" type "email" bind email
        validate required email

    input "Password" type "password" bind password
        validate required min-length 8 strong-password

    textarea "About" bind about rows 6
        validate max-length 240

    button "Create Account" style "primary"
```

Plain-English startup data loading is supported too:

```
state users is []

on mount:
    fetch "/api/users" with auth save as users
```

Server-side loading uses the same plain-English style:

```
on server load:
    fetch "/api/users/{{id}}" save as user
```

That data is injected into SSR hydration automatically when the Node adapter serves the page.

Shared stores and reusable component slots stay in the same plain-English style:

```
store session is {}

component shell with title:
    heading "{{title}}"
    slot content:
        text "Default content"

section hero:
    use shell with title "Portal":
        slot content:
            text "Signed in"
```

Plain-English mutations can also live in actions:

```
action saveTask:
    post "/api/tasks" with task_payload save response as created_item redirect to "/tasks"
    reload created_item
```

---

## Platform Direction

NC UI is still growing toward broader ecosystem parity. The repo now includes the concrete foundations for that path:
- plain-English startup data loading and richer forms
- plain-English shared stores and slot-based composition
- production deploy artifacts for static hosts and SPA rewrites
- starter templates for end-to-end admin, portal, and docs apps

The next ecosystem milestones are:
- deeper SSR hydration for dynamic routes and route params
- LSP/editor tooling for autocomplete, diagnostics, formatting, rename, definition, and workspace symbols
- a larger package and integration ecosystem around auth, data, and deployment
- more end-to-end templates and generators for common business apps

That means the project is staying aligned with the moto: a real plain-English language first, with ecosystem tooling growing around it.

Current repo foundations for that path:
- [`adapters/node-server.js`](./adapters/node-server.js) for Node-hosted SSR-style serving with static prerender output and dynamic route hydration
- [`adapters/react.js`](./adapters/react.js) for mounting NC UI components/routes inside React hosts
- [`adapters/framework-host.js`](./adapters/framework-host.js) for generic host-app mounting
- [`adapters/next.js`](./adapters/next.js) for Next-style hosts
- [`adapters/vite.js`](./adapters/vite.js) for Vite-style hosts
- adapter config helpers for workspace aliases in Next and Vite hosts
- [`lsp/server.js`](./lsp/server.js) for diagnostics, formatting, rename, definition, and workspace symbols
- [`vscode-extension/package.json`](./vscode-extension/package.json) for editor integration
- [`packages/official-registry.json`](./packages/official-registry.json), `ncui package-add`, and `ncui package-install` for package workflows
- `window.NCUIInterop`, `<ncui-route>`, and `<ncui-component>` for embedding NC UI in React or other host UIs

#### stat
```
stat "10K+" "Users"
```

Displays a large gradient number with a label beneath it.

#### progress
```
progress "Completion" 75%
```

An animated progress bar with a gradient fill.

#### divider / spacer
```
divider
spacer
```

### Footer

```
footer:
    text "Copyright 2026"
    row:
        link "GitHub" to "https://github.com"
        link "Twitter" to "https://twitter.com"
```

---

## Theming Guide

NC UI includes a built-in theming system. Set the theme at the top of your file:

### Dark Theme (default)

```
theme "dark"
```

Background: `#0a0a0f`, text: `#f0f0f5`, glass borders, subtle glows.

### Light Theme

```
theme "light"
```

Background: `#ffffff`, text: `#1a1a2e`, soft shadows instead of glows.

### Custom Accent Color

The `accent` property controls the primary color used for buttons, gradients, links, and highlights:

```
accent "#00d4ff"    // Cyan (default)
accent "#8b5cf6"    // Purple
accent "#10b981"    // Green
accent "#f59e0b"    // Amber
accent "#ef4444"    // Red
```

The compiler automatically generates complementary colors for gradients and hover states.

### Custom Font

```
font "Inter"        // Default
font "Poppins"
font "Space Grotesk"
font "DM Sans"
```

Any Google Font name works. The compiler loads the font automatically.

---

## Animation Guide

Add an `animate` directive inside any section to animate its children on scroll:

```
section features:
    heading "Features"
    grid 3 columns:
        card:
            heading "One"
    animate "stagger"
```

### Available Animations

| Animation | Effect |
|-----------|--------|
| `"fade-up"` | Fades in while sliding up |
| `"fade-in"` | Simple fade |
| `"slide-left"` | Slides in from the left |
| `"slide-right"` | Slides in from the right |
| `"zoom"` | Scales up from 90% |
| `"stagger"` | Like fade-up, but each child animates in sequence |

Animations are powered by IntersectionObserver and trigger when elements scroll into view. They run once and are performant (no JS animation loops).

---

## Browser API Reference

Include NC UI in any HTML page for client-side compilation:

```html
<script src="compiler.js"></script>
<script src="nc-ui.js"></script>
```

### Inline Compilation

```html
<script type="text/nc-ui">
page "Dynamic Page"
theme "dark"
section hero centered:
    heading "Compiled in the browser!" style "gradient"
</script>
```

### JavaScript API

```js
// Compile to HTML string
const html = NCUI.compile(source);

// Parse to AST
const ast = NCUI.parse(source);

// Compile and render into an element or iframe
NCUI.render(source, document.getElementById('preview'));
NCUI.render(source, document.querySelector('iframe'));

// Live mode: auto-recompile as user types in a textarea
NCUI.live(textarea, iframe, 300);  // 300ms debounce
```

---

## Comparison: NC UI vs Others

| Metric | NC UI | HTML+CSS+JS | React | Svelte |
|--------|-------|-------------|-------|--------|
| Portfolio site | **~60 lines** | ~500 lines | ~300 + config | ~200 + config |
| Landing page | **~90 lines** | ~800 lines | ~500 + config | ~350 + config |
| Build tools | **None** | None | Webpack/Vite | Vite/SvelteKit |
| Dependencies | **0** | 0 | 100+ | 50+ |
| Output | **Single .html** | Multiple files | JS bundle | JS bundle |
| Learning curve | **5 minutes** | Weeks | Months | Weeks |
| Responsive | **Automatic** | Manual | Manual | Manual |
| Animations | **One keyword** | From scratch | Install library | Basic built-in |

---

## Built-in Icons

Use icons in cards:

```
card icon "code":
card icon "design":
card icon "rocket":
card icon "brain":
card icon "shield":
card icon "globe":
card icon "star":
card icon "heart":
card icon "check":
card icon "arrow":
card icon "chart":
card icon "users":
card icon "mail":
card icon "clock":
card icon "menu":
```

Icons are inline SVGs — no external icon library needed.

---

## Examples

See the `examples/` directory:

- **portfolio.ncui** — Personal portfolio site (hero, cards, contact form)
- **landing.ncui** — SaaS product landing page (features, pricing, CTA)
- **dashboard.ncui** — Analytics dashboard (stats, progress bars, settings)

Build all of them:

```bash
ncui build examples/portfolio.ncui
ncui build examples/landing.ncui
ncui build examples/dashboard.ncui

# Or use the shell script:
./start.sh examples
```

Try them in the [Live Playground](https://ncui.devheallabs.in).

---

## Design Philosophy

1. **Plain English first.** If you can describe it, you can build it.
2. **Beautiful by default.** Every site looks polished — glassmorphism, smooth animations, responsive layout — without writing a single line of CSS.
3. **Zero dependencies.** Build through the NC engine and ship static HTML with no extra runtime setup.
4. **Part of NC.** NC UI handles the frontend. NC handles the backend. Together, they let you build a full-stack app in plain English.

---

## Project Structure

```
nc-ui/
    compiler.nc       — Native NC UI compiler entry
    compiler.js       — Compatibility compiler implementation
    cli.js            — Repository CLI utilities
  start.sh          — Shell script launcher (macOS/Linux)
  start.bat         — Shell script launcher (Windows)
  playground.html   — Full-page browser playground
  examples/
    portfolio.ncui  — Portfolio example
    landing.ncui    — Landing page example
    dashboard.ncui  — Dashboard example
  website/
    index.html      — Showcase website (ncui.devheallabs.in)
        CNAME           — Public domain mapping
    .nojekyll       — Disable Jekyll processing
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test with: `npm test`
5. Build examples: `npm run build:examples`
6. Commit: `git commit -m "Add my feature"`
7. Push: `git push origin feature/my-feature`
8. Open a Pull Request

### Adding a new component

1. Add the parser rule in `compiler.js` inside `_parseComponent()`
2. Add the HTML generator in `_genComponent()`
3. Add CSS styles in the appropriate section of `_genCSS()`
4. Update this README with syntax docs
5. Add examples to the `examples/` directory

---

## License

Apache License 2.0. See [LICENSE](LICENSE).

Part of the NC project by [DevHeal Labs AI](https://devheallabs.in).
