#!/usr/bin/env bash
set -euo pipefail

# Match the CI package command whenever Studio source or dependency resolution changes.
if [[ -n "$(git diff --cached --name-only -- apps/studio bun.lock)" ]]; then
  bun --filter studio coverage:check
fi
