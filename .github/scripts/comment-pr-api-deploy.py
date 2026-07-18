#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.request


MARKER = "<!-- crv-triad-dev-deploy -->"


def request(method: str, path: str, token: str, payload: dict | None = None):
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "crv-workspace-pipeline",
    }

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        f"https://api.github.com{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise SystemExit(f"GitHub API error {error.code}: {detail}") from error


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def optional_env(name: str) -> str:
    return os.environ.get(name, "").strip()


def status_label(deployed: str) -> str:
    return "✅ Deployed in this run" if deployed == "true" else "ℹ️ Available"


def badge_label(value: str) -> str:
    return value.replace("-", "--").replace("_", "__").replace(" ", "_")


def main() -> None:
    token = env("CICD__GITHUB_TOKEN")
    repository = env("GITHUB_REPOSITORY")
    pr_number = env("CICD__PR_NUMBER")
    commit_sha = env("CICD__COMMIT_SHA")
    env_code = optional_env("CICD__ENV_CODE") or "DEV"
    env_name = optional_env("CICD__ENV_NAME") or "DEVELOPMENT"
    api_deployed = optional_env("CICD__API_DEPLOYED")
    api_url = env("CICD__API_URL")
    health_url = env("CICD__API_HEALTH_URL")
    idp_deployed = optional_env("CICD__IDP_DEPLOYED")
    idp_url = optional_env("CICD__IDP_URL")
    idp_health_url = optional_env("CICD__IDP_HEALTH_URL")
    site_deployed = optional_env("CICD__SITE_DEPLOYED")
    site_url = optional_env("CICD__SITE_URL")
    web_deployed = optional_env("CICD__WEB_DEPLOYED")
    web_url = optional_env("CICD__WEB_URL")
    run_url = env("CICD__RUN_URL")

    short_sha = commit_sha[:7]
    environment_badge = (
        "https://img.shields.io/badge/"
        f"{badge_label(env_code)}-{badge_label(env_name)}-7c3aed?style=for-the-badge"
    )
    table_rows = [
        f"| 🔌 API | {status_label(api_deployed)} | [Open API]({api_url}) | [Health check]({health_url}) |",
    ]
    if idp_url:
        table_rows.append(
            f"| 🔐 IDP | {status_label(idp_deployed)} | [Open IDP]({idp_url}) | [Health check]({idp_health_url}) |"
        )
    if site_url:
        table_rows.append(
            f"| 🌐 Site | {status_label(site_deployed)} | [Open preview]({site_url}) | Alias preview |"
        )
    if web_url:
        table_rows.append(
            f"| 🖥️ Web | {status_label(web_deployed)} | [Open preview]({web_url}) | Alias preview |"
        )
    table_rows.append(
        f"| 🧾 Logs | Completed | [View workflow run]({run_url}) | Commit `{short_sha}` |"
    )

    body = f"""{MARKER}
## 🚀 Dev preview is ready

![{env_code} - {env_name}]({environment_badge})

| Surface | Status | URL | Check |
| --- | --- | --- | --- |
{chr(10).join(table_rows)}

> Latest deployed commit: `{short_sha}`

"""

    comments = request(
        "GET", f"/repos/{repository}/issues/{pr_number}/comments", token
    )
    existing = next(
        (
            comment
            for comment in comments
            if MARKER in comment.get("body", "")
        ),
        None,
    )

    if existing:
        request(
            "PATCH",
            f"/repos/{repository}/issues/comments/{existing['id']}",
            token,
            {"body": body},
        )
        print(f"Updated dev deploy comment: {existing['html_url']}")
        return

    created = request(
        "POST",
        f"/repos/{repository}/issues/{pr_number}/comments",
        token,
        {"body": body},
    )
    print(f"Created dev deploy comment: {created['html_url']}")


if __name__ == "__main__":
    main()
