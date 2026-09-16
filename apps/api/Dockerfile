# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @paypoq/api build

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runner
ARG BUILD_SHA=unknown
ENV NODE_ENV=production
ENV BUILD_SHA=$BUILD_SHA
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs paypoq
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
USER paypoq
EXPOSE 3001
# Runtime starts the API only.
#
# Migrations (`prisma migrate deploy`) and first-admin bootstrap
# (`bootstrap:platform-admin`) are explicit release steps that must succeed
# BEFORE this container is started — see docs/RELEASE_RUNBOOK_V1.md. The image
# never seeds demo data and never creates accounts on its own.
CMD ["node", "apps/api/dist/src/main.js"]


