import type { OpenAPIObject } from "./types.js"

export function createOpenApiDocument(baseUrl: string): OpenAPIObject {
  return {
    openapi: "3.1.0",
    info: {
      title: "Triad Identity Provider API",
      version: "0.1.0",
      description: "Triad-owned IDP routes. Better Auth endpoints are mounted at /api/auth/*.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: { "200": { description: "IDP process is alive" } },
        },
      },
      "/ready": {
        get: {
          tags: ["Health"],
          summary: "Readiness check",
          responses: {
            "200": { description: "IDP dependencies are ready" },
            "503": { description: "IDP dependencies are not ready" },
          },
        },
      },
      "/internal/session-context": {
        get: {
          tags: ["Internal"],
          summary: "Resolve the current IDP session context",
          responses: {
            "200": { description: "Active user and session context" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Session user is not active" },
          },
        },
      },
      "/invitations": {
        get: {
          tags: ["Invitations"],
          summary: "List invitations",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
            { name: "q", in: "query", schema: { type: "string" } },
            {
              name: "role",
              in: "query",
              schema: { type: "array", items: { type: "string", enum: ["admin", "member"] } },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "array",
                items: { type: "string", enum: ["pending", "accepted", "expired", "revoked"] },
              },
            },
            {
              name: "sortBy",
              in: "query",
              schema: {
                type: "string",
                enum: ["createdAt", "email", "expiresAt", "role", "status", "updatedAt"],
              },
            },
            {
              name: "sortDirection",
              in: "query",
              schema: { type: "string", enum: ["asc", "desc"] },
            },
          ],
          responses: {
            "200": { description: "Paginated invitation list" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Admin role required" },
          },
        },
        post: {
          tags: ["Invitations"],
          summary: "Create an invitation",
          description: "Creates an invitation that expires automatically after 24 hours.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                    role: { type: "string", enum: ["admin", "member"], default: "member" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Invitation created" },
            "400": { description: "Invalid invitation payload" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Admin role required" },
            "409": { description: "A pending invitation already exists for this email" },
          },
        },
      },
      "/invitations/{invitationId}/revoke": {
        post: {
          tags: ["Invitations"],
          summary: "Revoke a pending invitation",
          parameters: [
            {
              name: "invitationId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Invitation revoked" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Admin role required" },
            "404": { description: "Pending invitation not found" },
          },
        },
      },
      "/users": {
        get: {
          tags: ["Users"],
          summary: "List users",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
            { name: "q", in: "query", schema: { type: "string" } },
            {
              name: "role",
              in: "query",
              schema: { type: "array", items: { type: "string", enum: ["admin", "member"] } },
            },
            {
              name: "status",
              in: "query",
              schema: { type: "array", items: { type: "string", enum: ["active", "disabled"] } },
            },
            {
              name: "sortBy",
              in: "query",
              schema: {
                type: "string",
                enum: ["createdAt", "email", "name", "role", "status", "updatedAt"],
              },
            },
            {
              name: "sortDirection",
              in: "query",
              schema: { type: "string", enum: ["asc", "desc"] },
            },
          ],
          responses: {
            "200": { description: "Paginated user list" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Admin role required" },
          },
        },
      },
      "/users/{userId}": {
        patch: {
          tags: ["Users"],
          summary: "Update user access",
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", enum: ["admin", "member"] },
                    status: { type: "string", enum: ["active", "disabled"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "User updated" },
            "400": { description: "Invalid payload or unsafe self access change" },
            "401": { description: "Missing or invalid session" },
            "403": { description: "Admin role required" },
            "404": { description: "User not found" },
          },
        },
      },
    },
  }
}
