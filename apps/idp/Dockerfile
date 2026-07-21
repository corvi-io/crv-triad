FROM oven/bun:1.3.11-slim AS base

WORKDIR /app

FROM base AS build

COPY package.json bun.lock turbo.json biome.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/idp/package.json apps/idp/package.json
COPY apps/site/package.json apps/site/package.json
COPY apps/studio/package.json apps/studio/package.json

RUN bun install --frozen-lockfile --filter idp

COPY apps/idp apps/idp

RUN bun --filter idp build

FROM base AS runtime

ENV NODE_ENV="production" \
    IDP_HOST="0.0.0.0" \
    IDP_PORT="8080"

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/idp/package.json apps/idp/package.json
COPY apps/site/package.json apps/site/package.json
COPY apps/studio/package.json apps/studio/package.json

RUN bun install --frozen-lockfile --production --filter idp

COPY --from=build /app/apps/idp/dist apps/idp/dist
COPY --from=build /app/apps/idp/drizzle apps/idp/drizzle

RUN useradd --create-home --shell /usr/sbin/nologin appuser

WORKDIR /app/apps/idp
USER appuser

EXPOSE 8080

CMD ["bun", "dist/server.js"]
