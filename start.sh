#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NC UI — Start Script
# Build, serve, and play with NC UI files.
# Part of the NC language ecosystem by DevHeal Labs AI.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Paths ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="$SCRIPT_DIR/cli.js"
EXAMPLES_DIR="$SCRIPT_DIR/examples"
PLAYGROUND="$SCRIPT_DIR/playground.html"

# ─── Helpers ─────────────────────────────────────────────────────────────────

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}  ╔═══════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}  ║           NC UI  v1.1.0               ║${RESET}"
  echo -e "${CYAN}${BOLD}  ║   Build websites in plain English     ║${RESET}"
  echo -e "${CYAN}${BOLD}  ╚═══════════════════════════════════════╝${RESET}"
  echo ""
}

check_node() {
  if ! command -v node &> /dev/null; then
    echo -e "${RED}${BOLD}  Error:${RESET} Node.js is not installed."
    echo -e "${DIM}  The legacy NC UI launcher requires Node.js 16 or later.${RESET}"
    echo ""
    echo -e "  Install it from: ${CYAN}https://nodejs.org${RESET}"
    echo ""
    exit 1
  fi

  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}${BOLD}  Error:${RESET} The legacy NC UI launcher needs Node.js 16+. You have $(node -v)."
    echo -e "  Update from: ${CYAN}https://nodejs.org${RESET}"
    echo ""
    exit 1
  fi
}

usage() {
  banner
  echo -e "  ${BOLD}Usage:${RESET}"
  echo ""
  echo -e "    ${GREEN}./start.sh build${RESET} ${DIM}<file.ncui>${RESET}       Compile .ncui to .html"
  echo -e "    ${GREEN}./start.sh serve${RESET} ${DIM}<file.ncui>${RESET}       Dev server with live reload"
  echo -e "    ${GREEN}./start.sh playground${RESET}               Open browser-based playground"
  echo -e "    ${GREEN}./start.sh examples${RESET}                 Build all examples"
  echo ""
  echo -e "  ${BOLD}Quick start:${RESET}"
  echo ""
  echo -e "    ${DIM}# Build a file${RESET}"
  echo -e "    ${YELLOW}./start.sh build examples/portfolio.ncui${RESET}"
  echo ""
  echo -e "    ${DIM}# Start dev server${RESET}"
  echo -e "    ${YELLOW}./start.sh serve examples/portfolio.ncui${RESET}"
  echo ""
  echo -e "    ${DIM}# Try the playground${RESET}"
  echo -e "    ${YELLOW}./start.sh playground${RESET}"
  echo ""
  echo -e "  ${DIM}Part of the NC language ecosystem — ${CYAN}https://devheallabs.in${RESET}"
  echo ""
}

# ─── Commands ────────────────────────────────────────────────────────────────

cmd_build() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo -e "${RED}${BOLD}  Error:${RESET} File not found: ${file}"
    exit 1
  fi
  banner
  echo -e "  ${BLUE}${BOLD}Building${RESET} $file"
  echo ""
  node "$CLI" build "$file"
  echo ""
  echo -e "  ${GREEN}${BOLD}Done.${RESET} Open the generated .html file in your browser."
  echo ""
}

cmd_serve() {
  local file="$1"
  local port="${2:-3000}"
  if [ ! -f "$file" ]; then
    echo -e "${RED}${BOLD}  Error:${RESET} File not found: ${file}"
    exit 1
  fi
  banner
  echo -e "  ${MAGENTA}${BOLD}Starting dev server...${RESET}"
  echo ""
  node "$CLI" serve "$file" "$port"
}

cmd_playground() {
  banner
  echo -e "  ${CYAN}${BOLD}Opening NC UI Playground...${RESET}"
  echo ""

  if [ ! -f "$PLAYGROUND" ]; then
    echo -e "${RED}${BOLD}  Error:${RESET} playground.html not found."
    exit 1
  fi

  # Try to open in browser
  if command -v open &> /dev/null; then
    open "$PLAYGROUND"
  elif command -v xdg-open &> /dev/null; then
    xdg-open "$PLAYGROUND"
  elif command -v start &> /dev/null; then
    start "$PLAYGROUND"
  else
    echo -e "  Open this file in your browser:"
    echo -e "  ${CYAN}$PLAYGROUND${RESET}"
  fi

  echo -e "  ${GREEN}${BOLD}Playground opened.${RESET}"
  echo ""
}

cmd_examples() {
  banner
  echo -e "  ${BLUE}${BOLD}Building all examples...${RESET}"
  echo ""

  local count=0
  for f in "$EXAMPLES_DIR"/*.ncui; do
    if [ -f "$f" ]; then
      echo -e "  ${DIM}Building:${RESET} $(basename "$f")"
      node "$CLI" build "$f"
      count=$((count + 1))
    fi
  done

  echo ""
  if [ "$count" -eq 0 ]; then
    echo -e "  ${YELLOW}No .ncui files found in examples/.${RESET}"
  else
    echo -e "  ${GREEN}${BOLD}Built $count example(s).${RESET} Check examples/ for the .html files."
  fi
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

check_node

COMMAND="${1:-}"

case "$COMMAND" in
  build)
    if [ -z "${2:-}" ]; then
      echo -e "${RED}${BOLD}  Error:${RESET} Missing file argument."
      echo -e "  Usage: ${GREEN}./start.sh build <file.ncui>${RESET}"
      exit 1
    fi
    cmd_build "$2"
    ;;
  serve)
    if [ -z "${2:-}" ]; then
      echo -e "${RED}${BOLD}  Error:${RESET} Missing file argument."
      echo -e "  Usage: ${GREEN}./start.sh serve <file.ncui>${RESET}"
      exit 1
    fi
    cmd_serve "$2" "${3:-3000}"
    ;;
  playground)
    cmd_playground
    ;;
  examples)
    cmd_examples
    ;;
  *)
    usage
    ;;
esac
