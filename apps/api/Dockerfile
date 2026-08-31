FROM oven/bun:1.3.11-slim AS base
WORKDIR /app

FROM base AS build
COPY package.json bun.lock turbo.json biome.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/site/package.json apps/site/package.json
COPY apps/studio/package.json apps/studio/package.json
RUN bun install --frozen-lockfile --filter api
COPY apps/api apps/api
RUN bun --filter api build

FROM base AS runtime
ENV NODE_ENV="production" API_HOST="0.0.0.0" API_PORT="8080"
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/site/package.json apps/site/package.json
COPY apps/studio/package.json apps/studio/package.json
RUN bun install --frozen-lockfile --production --filter api
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
RUN useradd --create-home --shell /usr/sbin/nologin appuser
WORKDIR /app/apps/api
USER appuser
EXPOSE 8080
CMD ["bun", "dist/server.js"]
