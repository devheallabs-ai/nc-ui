# Plain English Showcase

This sample page is written in NC UI plain-English syntax.

You only write the source file:
- `app.ncui`

NC UI generates the production files for you:
- `dist/index.html`
- `dist/index.css`
- `dist/index.js`
- `dist/index.security-headers.json`
- `dist/_headers`
- deployment config artifacts in `dist/`

One-command production build:

```bash
node nc-ui/cli.js release nc-ui/samples/plain-english-showcase/app.ncui
```

To run the sample with a real local backend for the form:

```bash
node nc-ui/samples/plain-english-showcase/server.js
```

Then open:

`http://localhost:4010`

Generic production notes:
- terminate TLS at your edge proxy or load balancer
- enable proxy-aware client IP handling with `APP_TRUST_PROXY=1`
- persist audit logs with `APP_AUDIT_LOG_PATH=/path/to/audit.log`
- keep public audit access disabled unless explicitly enabled
- add stronger bot protection for public forms when needed
