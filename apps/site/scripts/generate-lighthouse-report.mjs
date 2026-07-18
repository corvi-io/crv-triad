import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import process from "node:process"

import * as chromeLauncher from "chrome-launcher"
import lighthouse from "lighthouse"
import puppeteer from "puppeteer"

const outputFormats = ["html", "json"]
const distDir = path.resolve("dist")
const reportDir = path.resolve("reports/lighthouse")
const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const reportBaseName = `index-${timestamp}-report`

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
])

function isInsideDist(filePath) {
  return filePath === distDir || filePath.startsWith(`${distDir}${path.sep}`)
}

async function resolveStaticFile(requestPathname) {
  const pathname = requestPathname.endsWith("/") ? `${requestPathname}index.html` : requestPathname
  let filePath = path.join(distDir, decodeURIComponent(pathname))

  if (!isInsideDist(filePath)) {
    return null
  }

  try {
    const fileStat = await stat(filePath)

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html")
    }

    return filePath
  } catch {
    return null
  }
}

async function createStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost")
      const filePath = await resolveStaticFile(requestUrl.pathname)

      if (!filePath) {
        response.writeHead(404)
        response.end("Not found")
        return
      }

      const file = await readFile(filePath)
      const contentType = contentTypes.get(path.extname(filePath)) ?? "application/octet-stream"
      const cacheControl = requestUrl.pathname.startsWith("/_astro/")
        ? "public, max-age=31536000, immutable"
        : "no-cache"

      response.writeHead(200, { "Cache-Control": cacheControl, "Content-Type": contentType })
      response.end(file)
    } catch (error) {
      response.writeHead(500)
      response.end(error instanceof Error ? error.message : "Internal server error")
    }
  })

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const address = server.address()

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine static server port.")
  }

  return { server, url: `http://127.0.0.1:${address.port}/` }
}

const { server, url } = await createStaticServer()
const chromePath = await puppeteer.executablePath()
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
})

try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: outputFormats,
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  })

  if (!result) {
    throw new Error("Lighthouse did not return a result.")
  }

  const reports = Array.isArray(result.report) ? result.report : [result.report]
  const htmlReport = reports[outputFormats.indexOf("html")]
  const jsonReport = reports[outputFormats.indexOf("json")]
  const htmlPath = path.join(reportDir, `${reportBaseName}.html`)
  const jsonPath = path.join(reportDir, `${reportBaseName}.json`)
  const manifestPath = path.join(reportDir, "manifest.json")
  const scores = Object.fromEntries(
    Object.entries(result.lhr.categories).map(([id, category]) => [
      id,
      Math.round((category.score ?? 0) * 100),
    ]),
  )

  await mkdir(reportDir, { recursive: true })
  await writeFile(htmlPath, htmlReport)
  await writeFile(jsonPath, jsonReport)
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        requestedUrl: url,
        finalDisplayedUrl: result.lhr.finalDisplayedUrl,
        scores,
        reports: {
          html: path.relative(process.cwd(), htmlPath),
          json: path.relative(process.cwd(), jsonPath),
        },
      },
      null,
      2,
    ),
  )

  console.log(`Lighthouse reports written to ${path.relative(process.cwd(), reportDir)}`)
  console.log(`Scores: ${JSON.stringify(scores)}`)
} finally {
  chrome.kill()
  server.close()
}
