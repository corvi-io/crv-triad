#!/usr/bin/env bash
set -euo pipefail

target="${1:?target environment is required}"
app="${2:?app is required: api, idp, site, or web}"

case "$target" in
  dev)
    api_config="apps/api/fly.dev.toml"
    api_health_url="https://crv-triad-api-dev.fly.dev/health"
    idp_config="apps/idp/fly.dev.toml"
    idp_health_url="https://crv-triad-idp-dev.fly.dev/health"
    pages_branch="dev"
    site_health_url="${PUBLIC_SITE_URL:-}"
    web_health_url="${WEB__CLOUDFLARE_PAGES_URL:-}"
    ;;
  hml)
    api_config="apps/api/fly.hml.toml"
    api_health_url="https://crv-triad-api-hml.fly.dev/health"
    idp_config="apps/idp/fly.hml.toml"
    idp_health_url="https://crv-triad-idp-hml.fly.dev/health"
    pages_branch="hml"
    site_health_url="${PUBLIC_SITE_URL:-}"
    web_health_url="${WEB__CLOUDFLARE_PAGES_URL:-}"
    ;;
  prd)
    api_config="apps/api/fly.prd.toml"
    api_health_url="https://crv-triad-api-prd.fly.dev/health"
    idp_config="apps/idp/fly.prd.toml"
    idp_health_url="https://crv-triad-idp-prd.fly.dev/health"
    pages_branch="main"
    site_health_url="${PUBLIC_SITE_URL:-}"
    web_health_url="${WEB__CLOUDFLARE_PAGES_URL:-}"
    ;;
  *)
    echo "Unknown deploy target: $target"
    exit 1
    ;;
esac

wait_for_health() {
  local url="$1"

  if [[ -z "$url" ]]; then
    echo "Health check URL not configured. Skipping smoke check."
    return 0
  fi

  for attempt in {1..12}; do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      echo "Health check passed: $url"
      return 0
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
      [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] ||
        [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]] ||
        [[ -z "$project_name" ]]
    }
}

if [[ "$app" == "api" ]]; then
  if [[ -z "${FLY_API_TOKEN:-}" ]]; then
    echo "FLY_API_TOKEN is required to deploy API to Fly.io."
    exit 1
  fi

  bun .github/scripts/env-management.ts sync-fly --app api --target "$target"
  flyctl deploy . --config "$api_config" --dockerfile apps/api/Dockerfile --remote-only
  wait_for_health "$api_health_url"
  exit 0
fi

if [[ "$app" == "idp" ]]; then
  if [[ -z "${FLY_API_TOKEN:-}" ]]; then
    echo "FLY_API_TOKEN is required to deploy IDP to Fly.io."
    exit 1
  fi

  bun .github/scripts/env-management.ts sync-fly --app idp --target "$target"
  flyctl deploy . --config "$idp_config" --dockerfile apps/idp/Dockerfile --remote-only
  wait_for_health "$idp_health_url"
  exit 0
fi

if [[ "$app" == "site" ]]; then
  bun .github/scripts/env-management.ts validate --app site --target "$target"

  if should_skip_dev_cloudflare_pages_deploy "${SITE__CLOUDFLARE_PAGES_PROJECT_NAME:-}"; then
    echo "Cloudflare Pages deploy is not fully configured for dev. Skipping site deploy."
    exit 0
  fi

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "CLOUDFLARE_API_TOKEN is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    echo "CLOUDFLARE_ACCOUNT_ID is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${SITE__CLOUDFLARE_PAGES_PROJECT_NAME:-}" ]]; then
    echo "SITE__CLOUDFLARE_PAGES_PROJECT_NAME is required to deploy site to Cloudflare Pages."
    exit 1
  fi

  bun --filter site build
  bunx wrangler pages deploy apps/site/dist \
    --project-name "$SITE__CLOUDFLARE_PAGES_PROJECT_NAME" \
    --branch "$pages_branch" \
    --commit-dirty=true

  wait_for_health "$site_health_url"
  exit 0
fi

if [[ "$app" == "web" ]]; then
  bun .github/scripts/env-management.ts validate --app web --target "$target"

  if should_skip_dev_cloudflare_pages_deploy "${WEB__CLOUDFLARE_PAGES_PROJECT_NAME:-}"; then
    echo "Cloudflare Pages deploy is not fully configured for dev. Skipping web deploy."
    exit 0
  fi

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "CLOUDFLARE_API_TOKEN is required to deploy web to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    echo "CLOUDFLARE_ACCOUNT_ID is required to deploy web to Cloudflare Pages."
    exit 1
  fi

  if [[ -z "${WEB__CLOUDFLARE_PAGES_PROJECT_NAME:-}" ]]; then
    echo "WEB__CLOUDFLARE_PAGES_PROJECT_NAME is required to deploy web to Cloudflare Pages."
    exit 1
  fi

  bun --filter web build
  bunx wrangler pages deploy apps/web/dist \
    --project-name "$WEB__CLOUDFLARE_PAGES_PROJECT_NAME" \
    --branch "$pages_branch" \
    --commit-dirty=true

  wait_for_health "$web_health_url"
  exit 0
fi

echo "Unknown deploy gate app: $app"
exit 1
