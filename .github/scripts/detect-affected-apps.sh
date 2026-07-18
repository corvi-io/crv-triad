#!/usr/bin/env bash
set -euo pipefail

base_sha="${BASE_SHA:-}"
head_sha="${HEAD_SHA:-HEAD}"

if [[ -z "$base_sha" || "$base_sha" =~ ^0+$ ]]; then
  base_sha="HEAD~1"
fi

if ! changed_files="$(git diff --name-only "$base_sha" "$head_sha" 2>/dev/null)"; then
  changed_files="$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)"
fi

site_changed=false
api_changed=false
idp_changed=false
web_changed=false

while IFS= read -r file_path; do
  [[ -z "$file_path" ]] && continue

  case "$file_path" in
    apps/site/*)
      site_changed=true
      ;;
    apps/api/*)
      api_changed=true
      ;;
    apps/idp/*)
      idp_changed=true
      ;;
    apps/web/*)
      web_changed=true
      ;;
    package.json|bun.lock|turbo.json|env-schema.yaml|.dockerignore|.github/workflows/*|.github/scripts/*)
      site_changed=true
      api_changed=true
      idp_changed=true
      web_changed=true
      ;;
    packages/*)
      site_changed=true
      api_changed=true
      idp_changed=true
      web_changed=true
      ;;
  esac
done <<< "$changed_files"

{
  echo "site=$site_changed"
  echo "api=$api_changed"
  echo "idp=$idp_changed"
  echo "web=$web_changed"
} >> "$GITHUB_OUTPUT"

echo "Affected apps: site=$site_changed api=$api_changed idp=$idp_changed web=$web_changed"
