import { afterEach, describe, expect, it } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const scriptPath = resolve(".github/scripts/detect-affected-apps.sh")
const tempDirectories: string[] = []

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe("detect-affected-apps", () => {
  it("marks only Studio for an apps/studio change", () => {
    const repository = createRepository()
    const baseSha = git(repository, "rev-parse", "HEAD")

    writeFileSync(join(repository, "apps/studio/changed.ts"), "export const changed = true\n")
    commitAll(repository, "test: change studio")

    expect(runDetection(repository, baseSha)).toEqual({
      api: "false",
      idp: "false",
      site: "false",
      studio: "true",
    })
  })

  it("marks every app for a shared workspace change", () => {
    const repository = createRepository()
    const baseSha = git(repository, "rev-parse", "HEAD")

    writeFileSync(join(repository, "bun.lock"), "lockfile changed\n")
    commitAll(repository, "test: change lockfile")

    expect(runDetection(repository, baseSha)).toEqual({
      api: "true",
      idp: "true",
      site: "true",
      studio: "true",
    })
  })
})

function createRepository() {
  const repository = mkdtempSync(join(tmpdir(), "triad-affected-apps-"))
  tempDirectories.push(repository)

  mkdirSync(join(repository, "apps/studio"), { recursive: true })
  writeFileSync(join(repository, "apps/studio/index.ts"), "export {}\n")
  writeFileSync(join(repository, "bun.lock"), "lockfile baseline\n")
  git(repository, "init")
  git(repository, "config", "user.email", "tests@example.com")
  git(repository, "config", "user.name", "Triad Tests")
  commitAll(repository, "test: baseline")

  return repository
}

function commitAll(repository: string, message: string) {
  git(repository, "add", ".")
  git(repository, "commit", "-m", message)
}

function git(repository: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd: repository, encoding: "utf8" })
  if (result.status !== 0) {
    throw new Error(result.stderr)
  }

  return result.stdout.trim()
}

function runDetection(repository: string, baseSha: string) {
  const outputPath = join(repository, "github-output.txt")
  const result = spawnSync("bash", [scriptPath], {
    cwd: repository,
    encoding: "utf8",
    env: {
      ...process.env,
      CICD__BASE_SHA: baseSha,
      CICD__HEAD_SHA: "HEAD",
      GITHUB_OUTPUT: outputPath,
    },
  })

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }

  return Object.fromEntries(
    readFileSync(outputPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split("=", 2)),
  )
}
