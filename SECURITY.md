# Security Policy — NC UI

## Supported Versions

| Version | Security Patches |
| ------- | ---------------- |
| 1.x     | Yes              |
| < 1.0   | No               |

## Reporting a Vulnerability

Please report security issues **privately**:

- **Email:** `support@devheallabs.in` (DevHeal Labs AI security team)

Do **not** open public GitHub issues for vulnerabilities before a fix is available.

## What to Include

- A clear description of the issue.
- Affected component(s) and file path(s), if known.
- Reproduction steps or a proof of concept.
- Expected impact and any known mitigations.
- Your contact details for follow-up.

## Response Timeline

For valid reports, maintainers aim to:

1. Acknowledge receipt within **72 hours**.
2. Provide an initial assessment within **7 days**.
3. Prepare and test a fix based on severity.
4. Issue a patched release and publish an advisory.

Critical vulnerabilities are prioritized and may receive expedited patches.

## Responsible Disclosure

- Allow a reasonable window (typically 90 days) for a fix before public disclosure.
- Coordinated disclosure timing will be agreed upon between the reporter and the maintainers.
- Credit will be given in the advisory unless anonymity is requested.

## NC UI Security Model

The NC UI compiler applies security best practices by default:

- **Content Security Policy (CSP)** headers are injected into all compiled HTML output.
- **Input sanitization** is applied to user-provided values in templates.
- **No inline `eval()`** — the runtime never evaluates arbitrary strings as code.
- **Subresource integrity** is enforced for external script/style references when available.

For security details about the broader NC ecosystem, see the [root SECURITY.md](../SECURITY.md).
