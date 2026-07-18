export type OpenAPIObject = {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  servers: Array<{ url: string }>
  paths: Record<string, unknown>
}
