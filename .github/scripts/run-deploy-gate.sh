#!/usr/bin/env bash
set -euo pipefail

target="${1:?target environment is required}"
app="${2:?app is required: api, site, studio, or backstage}"

case "$target" in
  dev)
    api_config="apps/api/fly.dev.toml"
    api_health_url="https://crv-triad-api-dev.fly.dev/health"
    pages_branch="dev"
    site_health_url="${PUBLIC_SITE_URL:-}"
    studio_health_url="${INFRA__STUDIO_URL:-}"
    backstage_health_url="${INFRA__BACKSTAGE_URL:-}"
    ;;
  hml)
    api_config="apps/api/fly.hml.toml"
    api_health_url="https://crv-triad-api-hml.fly.dev/health"
    pages_branch="hml"
    site_health_url="${PUBLIC_SITE_URL:-}"
    studio_health_url="${INFRA__STUDIO_URL:-}"
    backstage_health_url="${INFRA__BACKSTAGE_URL:-}"
    ;;
  prd)
    api_config="apps/api/fly.prd.toml"
    api_health_url="https://crv-triad-api-prd.fly.dev/health"
    pages_branch="main"
    site_health_url="${PUBLIC_SITE_URL:-}"
    studio_health_url="${INFRA__STUDIO_URL:-}"
    backstage_health_url="${INFRA__BACKSTAGE_URL:-}"
    ;;
  *)
    echo "Unknown deploy target: $target"
    exit 1
    ;;
esac

wait_for_health() {
  local url="$1"
  local accepted_status="${2:-}"

  if [[ -z "$url" ]]; then
    echo "Health check URL not configured. Skipping smoke check."
    return 0
  fi

  for attempt in {1..12}; do
    local status
    if status="$(curl --silent --show-error --output /dev/null --write-out "%{http_code}" "$url")"; then
      if [[ "$status" =~ ^[23][0-9][0-9]$ || "$status" == "$accepted_status" ]]; then
        echo "Health check passed: $url (HTTP $status)"
        return 0
      fi
    fi

    echo "Health check not ready yet: $url (attempt $attempt/12)"
    sleep 5
  done

  echo "Health check failed: $url"
  return 1
}

should_skip_dev_cloudflare_pages_deploy() {
  local project_name="$1"

  [[ "$target" == "dev" ]] &&
    {
      [[ -z "${INFRA__CLOUDFLARE_API_TOKEN:-}" ]] ||
        [[ -z "${INFRA__CLOUDFLARE_ACCOUNT_ID:-}" ]] ||
        [[ -z "$project_name" ]]
    }
}

record_deployment() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "deployed=$1" >> "$GITHUB_OUTPUT"
  fi
}

deploy_trigger_tasks() {
  if [[ -z "${INFRA__TRIGGER_ACCESS_TOKEN:-}" ]]; then
    echo "INFRA__TRIGGER_ACCESS_TOKEN is required to deploy Trigger.dev tasks."
    return 1
  fi

  if [[ -z "${API__TRIGGER_PROJECT_REF:-}" ]]; then
    echo "API__TRIGGER_PROJECT_REF is required to deploy Trigger.dev tasks."
    return 1
  fi

  local trigger_environment
  local -a trigger_args
  case "$target" in
    dev)
      trigger_environment="preview"
      trigger_args=(--env preview --branch dev)
      ;;
    hml)
      trigger_environment="staging"
      trigger_args=(--env staging)
      ;;
    prd)
      trigger_environment="production"
      trigger_args=(--env prod)
      ;;
  esac

  echo "Deploying Trigger.dev tasks to ${trigger_environment}."
  TRIGGER_ACCESS_TOKEN="$INFRA__TRIGGER_ACCESS_TOKEN" \
    TRIGGER_PROJECT_REF="$API__TRIGGER_PROJECT_REF" \
    bun run --cwd apps/api deploy:trigger -- "${trigger_args[@]}" --external-id "${GITHUB_SHA:?GITHUB_SHA is required}"
}

if [[ "$app" == "api" ]]; then
  if [[ -z "${INFRA__FLY_API_TOKEN:-}" ]]; then
    echo "INFRA__FLY_API_TOKEN is required to deploy API to Fly.io."
    exit 1
  fi

  bun .github/scripts/env-management.ts validate --app api --target "$target"
  deploy_trigger_tasks
  FLY_API_TOKEN="$INFRA__FLY_API_TOKEN" bun .github/scripts/env-management.ts sync-fly --app api --target "$target"
  FLY_API_TOKEN="$INFRA__FLY_API_TOKEN" flyctl deploy . --config "$api_config" --dockerfile apps/api/Dockerfile --remote-only
  wait_for_health "$api_health_url"
  record_deployment true
  exit 0
fi

if [[ "$app" == "site" ]]; then
  bun .github/scripts/env-management.ts validate --app site --target "$target"

  if should_skip_dev_cloudflare_pages_deploy "${INFRA__CLOUDFLARE_SITE_PROJECT_NAME:-}"; then
    echo "Cloudflare Pages deploy is not fully configured for dev. Skipping site deploy."
    record_deployment false
    exit 0
  fi

  if [[ -z "${INFRA__CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "INFRA__CLOUDFLARE_API_TOKEN is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${INFRA__CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    echo "INFRA__CLOUDFLARE_ACCOUNT_ID is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${INFRA__CLOUDFLARE_SITE_PROJECT_NAME:-}" ]]; then
    echo "INFRA__CLOUDFLARE_SITE_PROJECT_NAME is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  bun --filter site build
  CLOUDFLARE_API_TOKEN="$INFRA__CLOUDFLARE_API_TOKEN" \
    CLOUDFLARE_ACCOUNT_ID="$INFRA__CLOUDFLARE_ACCOUNT_ID" \
    bunx wrangler pages deploy apps/site/dist \
    --project-name "$INFRA__CLOUDFLARE_SITE_PROJECT_NAME" \
    --branch "$pages_branch" \
    --commit-dirty=true

  wait_for_health "$site_health_url"
  record_deployment true
  exit 0
fi

if [[ "$app" == "studio" ]]; then
  bun .github/scripts/env-management.ts validate --app studio --target "$target"

  if should_skip_dev_cloudflare_pages_deploy "${INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME:-}"; then
    echo "Cloudflare Pages deploy is not fully configured for dev. Skipping studio deploy."
    record_deployment false
    exit 0
  fi

  if [[ -z "${INFRA__CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "INFRA__CLOUDFLARE_API_TOKEN is required to deploy studio to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${INFRA__CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    echo "INFRA__CLOUDFLARE_ACCOUNT_ID is required to deploy studio to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME:-}" ]]; then
    echo "INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME is required to deploy studio to Cloudflare Pages."
    exit 1
  fi

  bun --filter studio build
  CLOUDFLARE_API_TOKEN="$INFRA__CLOUDFLARE_API_TOKEN" \
    CLOUDFLARE_ACCOUNT_ID="$INFRA__CLOUDFLARE_ACCOUNT_ID" \
    bunx wrangler pages deploy apps/studio/dist \
    --project-name "$INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME" \
    --branch "$pages_branch" \
    --commit-dirty=true

  wait_for_health "$studio_health_url"
  record_deployment true
  exit 0
fi

if [[ "$app" == "backstage" ]]; then
  bun .github/scripts/env-management.ts validate --app backstage --target "$target"

  if should_skip_dev_cloudflare_pages_deploy "${INFRA__CLOUDFLARE_BACKSTAGE_PROJECT_NAME:-}"; then
    echo "Cloudflare Pages deploy is not fully configured for dev. Skipping backstage deploy."
    record_deployment false
    exit 0
  fi

  if [[ -z "${INFRA__CLOUDFLARE_API_TOKEN:-}" || -z "${INFRA__CLOUDFLARE_ACCOUNT_ID:-}" || -z "${INFRA__CLOUDFLARE_BACKSTAGE_PROJECT_NAME:-}" ]]; then
    echo "Cloudflare credentials and INFRA__CLOUDFLARE_BACKSTAGE_PROJECT_NAME are required to deploy backstage."
    exit 1
  fi

  bun --filter backstage build
  CLOUDFLARE_API_TOKEN="$INFRA__CLOUDFLARE_API_TOKEN" \
    CLOUDFLARE_ACCOUNT_ID="$INFRA__CLOUDFLARE_ACCOUNT_ID" \
    bunx wrangler pages deploy apps/backstage/dist \
    --project-name "$INFRA__CLOUDFLARE_BACKSTAGE_PROJECT_NAME" \
    --branch "$pages_branch" \
    --commit-dirty=true

  # Backstage is protected by Cloudflare Access; an anonymous 403 proves the
  # deployed edge route is reachable without weakening operator access.
  wait_for_health "$backstage_health_url" "403"
  record_deployment true
  exit 0
fi

echo "Unknown deploy gate app: $app"
exit 1
