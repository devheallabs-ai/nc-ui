# ─────────────────────────────────────────────────────────────────────────────
# NC UI — Docker Image
# Multi-stage build for running the NC UI dev server in a container.
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY compiler.js cli.js nc-ui.js runtime.js security.js project.js compiler_bridge.js ./
COPY examples/ ./examples/
COPY adapters/ ./adapters/
COPY templates/ ./templates/
COPY packages/ ./packages/
COPY lsp/ ./lsp/
COPY runtime/ ./runtime/
COPY playground.html ./
COPY start.sh ./

RUN chmod +x start.sh

# Stage 2: Runtime
FROM node:20-alpine

LABEL maintainer="DevHeal Labs AI <hello@devheallabs.in>"
LABEL description="NC UI — Build websites in plain English"
LABEL org.opencontainers.image.source="https://github.com/devheal-labs/nc-ui"

WORKDIR /app

# Run as non-root user
RUN addgroup -S ncui && adduser -S ncui -G ncui

COPY --from=builder --chown=ncui:ncui /app ./

USER ncui

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "cli.js", "serve", "examples/portfolio.ncui", "3000"]
