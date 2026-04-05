# NC UI Language Specification v3.0

## What NC UI Is

NC UI is a **compiled reactive UI language** written in plain English.
For the current enterprise-ready v1 path, it compiles deterministically to
HTML, CSS, and JavaScript with the NC UI runtime.

```
Other languages:
  React:   JSX → Babel → JS bundle → React runtime → DOM
  Vue:     SFC → vue-compiler → JS bundle → Vue runtime → DOM
  Svelte:  .svelte → svelte-compiler → JS bundle → DOM

NC UI:
  .ncui → NC UI Compiler → HTML/CSS/JS → NC UI Runtime → DOM
```

The `.ncui` file is the source of truth. The deterministic v1 toolchain targets
the browser runtime first so builds are testable, portable, and production-safe.
An NC bytecode / VM target remains a future design goal, not the active v1 path.

---

## Language Primitives

### App Declaration
```
app "DevHeal Labs AI"
version "2.0.0"
description "Enterprise AI Platform"
```

### State (Reactive)
Every state slot is reactive. When it changes, the DOM updates automatically.
```
state:
    email is "" with type "string"
    loading is false with type "boolean"
    count is 0 with type "number"
    user is nil with type "object"
```

Computed state (memoized, re-runs only when dependencies change):
```
computed:
    full_name is state.first + " " + state.last
    is_admin is "admin" in state.user.roles
```

### Theme
```
theme "dark":
    primary is "#6366f1"
    background is "#0a0a0a"
    surface is "#111111"
    text is "#ffffff"

theme "light":
    primary is "#4f46e5"
    background is "#f8fafc"
```

### Routes
```
routes:
    "/" shows page "home" publicly
    "/dashboard" shows page "dashboard" requires auth
    "/admin" shows page "admin" requires role "admin"
    "/users/:id" shows page "user-profile" requires auth
    "/settings" shows page "settings" requires auth loading shows "page-loading" unauthorized shows "access-denied" error shows "route-error"
```

### Guards
```
guard "admin-only":
    require role "admin"
    redirect to "/403" when unauthorized

guard "auth-required":
    require authenticated
    redirect to "/login" when unauthorized
```

Route fallbacks:
- `loading shows "component-name"` renders a route-level loading view
- `unauthorized shows "component-name"` renders a custom denied-access view
- `error shows "component-name"` renders a custom route error view
- `lazy` defers route rendering and shows loading feedback first

### Auth Configuration
```
auth:
    type is "bearer"
    login endpoint is "/api/auth/login"
    logout endpoint is "/api/auth/logout"
    refresh endpoint is "/api/auth/refresh"
    verify endpoint is "/api/auth/verify"
    token store is "session"
    on login success navigate to "/dashboard"
    on logout navigate to "/login"
```

OAuth / PKCE flows are also supported by the deterministic v1 runtime:
```
auth:
    type is "pkce"
    auth endpoint is "https://auth.example.com/authorize"
    token endpoint is "https://auth.example.com/token"
    client id is "portal-web"
    redirect uri is "https://app.example.com/callback"
    scope is "openid profile email"
```

Generated apps expose:
- `window.NCUIAuth` for login, logout, refresh, verify, token-aware fetch, and OAuth callback exchange
- `window.NCUIRBAC` for role and permission checks
- `window.NCUISecurityHeaders` with the recommended server-side header contract for enterprise deployments

The generated HTML/runtime also ships secure-by-default browser protections:
- CSP and referrer policy
- COEP, COOP, and CORP isolation headers/meta
- permissions policy defaults
- CSRF token propagation via `NCUISecurity`
- guarded route redirects with auth-aware initial routing

---

## Pages

A page is a full-screen component with lifecycle hooks, guards, and state.

```
page "dashboard" title "Dashboard":
    guard "auth-required"

    state:
        data is []
        selected is nil

    on mount:
        fetch "/api/dashboard" with auth save as data

    on unmount:
        set data to []

    computed:
        total is sum(state.data)
        filtered is filter(state.data, item => item.active)

    section:
        heading "Welcome back, " + state.user.name
        text "You have " + string(count(state.data)) + " items"

        grid 3 columns:
            stat-card "Total" state.total
            stat-card "Active" count(state.filtered)
            stat-card "Pending" state.pending_count

        table state.data:
            column "Name" shows item.name
            column "Status" shows badge(item.status)
            column "Actions":
                button "View" on click runs viewItem with item
                button "Delete" style "danger" on click runs deleteItem with item

footer:
    text "© 2026 DevHeal Labs AI"
```

---

## Components

Reusable components — like React functional components.

```
component "stat-card" with label, value:
    card class "stat-card":
        text label style "muted"
        heading string(value) style "large"

component "user-avatar" with user:
    row:
        if user.avatar:
            image user.avatar alt user.name class "avatar"
        otherwise:
            div class "avatar-placeholder":
                text initials(user.name)
        text user.name
```

Use a component:
```
stat-card "Revenue" state.revenue
user-avatar state.current_user
```

---

## Elements Reference

### Layout
```
section [class "name"] [centered]:
    ...children...

card [class "name"]:
    ...children...

grid N columns [gap "16px"]:
    ...children...

row [between|centered|start|end]:
    ...children...

sidebar [collapsed state.sidebar_open]:
    nav:
        ...links...
```

### Typography
```
heading "Title Text"
heading state.dynamic_title
subheading "Subtitle"
text "Body text"
text state.message style "muted"
badge "Active" type "success"
badge state.status type state.status_type
```

### Inputs
```
input "Label" type "email" bind email
    validate email required
    placeholder "you@company.com"
    autocomplete "email"

input "Password" type if state.show_pw then "text" otherwise "password"
    bind password
    validate required min-length 8 strong-password
    strength-indicator

checkbox "Remember me" bind remember_me
select "Country" bind country options state.countries
textarea "Message" bind message rows 4
```

### Buttons
```
button "Sign In" style "primary" full-width
    loading state.loading
    loading-text "Signing in..."
    on click runs handleLogin

button "Cancel" style "secondary"
    on click navigates to "/dashboard"

button "Delete" style "danger"
    disabled not state.selected
    on click runs confirmDelete
```

### Media
```
image "/assets/logo.svg" alt "Logo" class "logo"
image state.user.avatar alt state.user.name
icon "settings" size "24"
```

### Navigation
```
link "Home" to "/"
link state.label to state.url style "primary"
```

### Data Display
```
table state.users:
    column "Name" shows item.name sortable
    column "Email" shows item.email
    column "Role" shows badge(item.role)
    column "Actions":
        button "Edit" on click runs editUser with item

chart "bar" data state.analytics:
    x-axis is "date"
    y-axis is "revenue"
    color is theme.primary
```

### Forms
```
form "login" action "/api/auth/login" method "POST":
    on submit runs handleLogin

    input "Email" type "email" bind email
        validate email required

    input "Password" type "password" bind password
        validate required min-length 8

    button "Sign In" type "submit" style "primary"
```

### Feedback
```
alert "Something went wrong" type "error" dismissible
alert state.message type state.alert_type

modal "confirm-delete" title "Delete User?":
    text "This action cannot be undone."
    row:
        button "Cancel" style "secondary" on click closes modal
        button "Delete" style "danger" on click runs confirmDelete

loading spinner size "large"
loading skeleton rows 3
```

### Rich Content And Host Widgets
```
markdown "# Release Notes

- **Secure auth**
- Real-time updates
"

external "pipeline-graph" with project "alpha" view "live"
external "chat-panel" with room "ops-war-room" mode "stream"
```

### Live Data And Services
```
stream "/api/chat/stream" save as chat_feed
socket "wss://example.com/live" save as live_events channel "metrics"
graph "pipeline" from pipeline_data
flow "pipeline" from pipeline_flow
drag list backlog title "Backlog"
drop zone active_items title "Active Stage"

provider "realtime":
    mode is "shared"
    source is "ops"

service "platform_api":
    base is "/api"
    timeout is 12000
    endpoint "listUsers" uses GET "/users"
    endpoint "saveUser" uses POST "/users"
```

### Product Shells
```
shell:
    sidebar:
        heading "Platform"
        link "Dashboard" to "/"
        link "Pipelines" to "/pipelines"

    topbar:
        text "Signed in as admin"

    banner "Maintenance window tonight" type "warning"

    panel "Overview":
        text "System healthy"
```

---

## Control Flow

### Conditional Rendering
```
if state.error:
    alert state.error type "error"

if state.loading:
    loading spinner
otherwise:
    table state.data

if state.user.role is equal "admin":
    button "Admin Panel" on click navigates to "/admin"
otherwise if state.user.role is equal "manager":
    button "Reports" on click navigates to "/reports"
otherwise:
    button "Profile" on click navigates to "/profile"
```

### Lists
```
repeat for each item in state.items:
    card:
        heading item.title
        text item.description
        button "View" on click runs viewItem with item

repeat for each user in state.users:
    row:
        user-avatar user
        text user.name
        badge user.role
```

### Show/Hide (no DOM removal)
```
button "Toggle" on click runs toggle
section show state.visible:
    text "Only visible when state.visible is true"
```

---

## Actions

Actions handle user interaction and async operations.

```
action handleLogin with form_data:
    set loading to true
    set error to ""
    try:
        authenticate with state.email, state.password
        if state.remember_me:
            set persistent_session to true
        navigate to "/dashboard"
    on failure as err:
        set error to err.message or "Invalid email or password"
    always:
        set loading to false

action loadUsers:
    set loading to true
    fetch "/api/users" with auth save as users
    set loading to false

action deleteUser with user:
    fetch "/api/users/" + user.id method "DELETE" with auth
    set users to filter(state.users, u => u.id is not equal user.id)

action viewItem with item:
    set selected to item
    navigate to "/items/" + string(item.id)
```

---

## Lifecycle Hooks

```
page "dashboard" title "Dashboard":

    on mount:
        fetch "/api/data" with auth save as data
        set title to "Dashboard — " + string(count(state.data)) + " items"
        start timer 30000 runs refreshData

    on before-unmount:
        stop timer
        save state to session

    on unmount:
        set data to []
        set selected to nil

    on route-change:
        fetch "/api/data" with auth save as data
```

---

## RBAC / Auth in Templates

```
section show authenticated:
    button "Logout" on click runs logout

section show not authenticated:
    button "Login" on click navigates to "/login"

button "Delete User" show role "admin"
    on click runs deleteUser

section show permission "write:users":
    button "Create User" on click navigates to "/users/new"

section hide role "guest":
    text "Premium content"
```

---

## Bytecode Output

When NC UI compiles `button "Sign In" style "primary" on click runs handleLogin`:

```
OP_UI_ELEMENT   "button"          ; push VNode{tag="button"}
OP_CONSTANT     "Sign In"         ; push "Sign In"
OP_UI_TEXT                        ; wrap as text VNode
OP_UI_CHILD                       ; append text to button
OP_CONSTANT     "ncui-btn-primary"
OP_UI_PROP      "class"           ; button.class = "ncui-btn-primary"
OP_UI_ON_EVENT  "click" "handleLogin"  ; register event handler
OP_UI_END_ELEMENT                 ; finalize button VNode
```

This bytecode runs in the NC VM.
The VM builds the VNode tree.
The differ compares old tree vs new tree.
Only changed nodes get DOM patches.

That's NC UI — a real compiled language, not a template engine.

---

## Comparison

| Feature | React | Vue | NC UI |
|---|---|---|---|
| Language | JSX (JS) | Template + JS | Plain English |
| Compile step | Babel/TSC | vue-compiler | NC UI compiler |
| Runtime | React Fiber | Vue runtime | NC VM |
| State | useState hooks | ref/reactive | `state:` block |
| Reactivity | Manual deps | Auto-tracking | Auto (OP_STATE_SET) |
| Routing | React Router | Vue Router | `routes:` block |
| Auth/RBAC | External libs | External libs | Built-in language feature |
| Forms | External libs | v-model | `form:` + `validate` |
| Backend | Separate | Separate | Same language (NC) |
| AI | External | External | `ask AI to "..."` built-in |

NC UI is the only UI language where the same language builds the frontend AND backend AND the AI layer.
