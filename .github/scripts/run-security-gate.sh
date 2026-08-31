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

unpinned_actions="$(while IFS= read -r workflow_file; do
  [[ -z "$workflow_file" ]] && continue
  grep -E '^[[:space:]]+uses: [^./][^@]+@' "$workflow_file" | grep -Ev '@[0-9a-f]{40}([[:space:]]+#.*)?$' | sed "s|^|$workflow_file: |" || true
done <<< "$workflow_files")"

if [[ -n "$unpinned_actions" ]]; then
  echo "Third-party actions must be pinned to a full commit SHA:"
  echo "$unpinned_actions"
  exit 1
fi

credential_patterns='(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|sk_live_[A-Za-z0-9]+)'
tracked_credentials="$(git grep -n -I -E "$credential_patterns" -- . || true)"
if [[ -n "$tracked_credentials" ]]; then
  echo "Potential tracked credentials detected:"
  echo "$tracked_credentials"
  exit 1
fi

bun audit --prod --audit-level high

echo "::endgroup::"
