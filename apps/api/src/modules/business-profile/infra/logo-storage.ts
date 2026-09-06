import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

export type BusinessLogoStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>
  delete(key: string): Promise<void>
}
export function createLocalBusinessLogoStorage(directory: string): BusinessLogoStorage {
  const path = (key: string) => join(directory, basename(key))
  return {
    async put(key, body) {
      await mkdir(directory, { recursive: true })
      await writeFile(path(key), body)
    },
    async get(key) {
      const body = await readFile(path(key)).catch((error: NodeJS.ErrnoException) =>
        error.code === "ENOENT" ? null : Promise.reject(error),
      )
      return body
        ? {
            body: new Uint8Array(body),
            contentType: key.endsWith(".png")
              ? "image/png"
              : key.endsWith(".webp")
                ? "image/webp"
                : "image/jpeg",
          }
        : null
    },
    async delete(key) {
      await unlink(path(key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
      })
    },
  }
}
