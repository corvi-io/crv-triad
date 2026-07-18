#!/usr/bin/env bash
set -euo pipefail

app="${1:?app is required: api, idp, site, or web}"

case "$app" in
  api)
  bun --filter api format:check
  bun --filter api lint:check
  bun --filter api coverage:check
  bun --filter api typecheck
  bun --filter api build
    ;;
  idp)
  bun --filter idp check
  bun --filter idp build
    ;;
  site)
  bun --filter site check
  bun --filter site build
    ;;
  web)
  bun --filter web check
  bun --filter web build
    ;;
  *)
    echo "Unknown quality gate app: $app"
    exit 1
    ;;
esac
