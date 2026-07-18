import { defineConfig } from "orval"

export default defineConfig({
  api: {
    input: {
      target: "./openapi/api.openapi.json",
    },
    output: {
      target: "./src/modules/shared/api/generated/api",
      client: "react-query",
      httpClient: "fetch",
      mode: "tags-split",
      mock: true,
      clean: true,
      override: {
        mutator: {
          path: "./src/modules/shared/api/mutator/api-fetch.ts",
          name: "apiFetch",
        },
        query: {
          signal: true,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
})
