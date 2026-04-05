# Contributing to NC UI

Thank you for your interest in contributing to NC UI — the plain-English frontend framework.

## Getting Started

### Prerequisites

- **Node.js 16+** and **npm**
- **Git**
- Familiarity with the [NC UI Language Spec](NC_UI_LANGUAGE_SPEC.md)

### Setup

```bash
git clone https://github.com/devheallabs-ai/nc-ui.git
cd nc-ui
npm install
```

### Run Tests

```bash
node tests/run_tests.js
```

### Build a Sample

```bash
node cli.js build samples/hello.ncui
```

## How to Contribute

### Reporting Bugs

- Search [existing issues](https://github.com/devheallabs-ai/nc-ui/issues) first.
- Open a new issue with a clear title, reproduction steps, expected behavior, and actual behavior.
- Include the `.ncui` source if applicable.

### Suggesting Features

- Open a feature request issue describing the use case and proposed syntax.

### Submitting Code

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with clear, focused commits.
3. Add or update tests for any changed behavior.
4. Ensure all tests pass before submitting.
5. Open a pull request with a description of what changed and why.

## Code Style

- JavaScript: standard style, no semicolons omitted.
- NC UI (`.ncui`): follow the indentation and naming conventions in `samples/`.
- Keep functions small and well-named.

## Project Structure

```
nc-ui/
├── cli.js              CLI entry point
├── compiler.js         .ncui → AST → HTML compiler
├── runtime.js          Browser runtime
├── security.js         CSP and security headers
├── adapters/           Platform adapters (React, Vue, etc.)
├── lsp/                Language Server Protocol support
├── vscode-extension/   VS Code extension
├── templates/          Starter templates
├── tests/              Test suite
└── packages/           npm/distribution packages
```

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
