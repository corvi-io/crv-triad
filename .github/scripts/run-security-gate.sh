#!/usr/bin/env bash
set -euo pipefail

echo "::group::Shared Pipeline / Security Gate"

tracked_env_files="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v -E '(^|/)\.env\.example$' || true)"
if [[ -n "$tracked_env_files" ]]; then
  echo "Tracked environment files are not allowed:"
  echo "$tracked_env_files"
  exit 1
fi

workflow_files="$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml' || true)"
if [[ -n "$workflow_files" ]]; then
  missing_permissions="$(while IFS= read -r workflow_file; do
    if [[ -n "$workflow_file" ]] && [[ -f "$workflow_file" ]] && ! grep -q '^permissions:' "$workflow_file"; then
      echo "$workflow_file"
    fi
  done <<< "$workflow_files")"

  if [[ -n "$missing_permissions" ]]; then
    echo "Workflow files must declare explicit top-level permissions:"
    echo "$missing_permissions"
    exit 1
  fi
fi

bun audit --prod --audit-level critical

echo "::endgroup::"
