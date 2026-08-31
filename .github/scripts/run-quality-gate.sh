#!/usr/bin/env bash
set -euo pipefail

app="${1:?app is required: api, site, or studio}"

case "$app" in
  api)
    bun --filter api check
    bun --filter api coverage:check
    bun --filter api build
    ;;
  site)
  bun --filter site check
  bun --filter site build
    ;;
  studio)
  bun --filter studio check
  bun --filter studio test:e2e:sandbox
  bun --filter studio test:e2e:production
    ;;
  *)
    echo "Unknown quality gate app: $app"
    exit 1
    ;;
esac
