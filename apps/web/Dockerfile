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
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm --filter @paypoq/web build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# Runtime-only TV secrets (not baked into the client bundle).
# FACTORY_TV_ACCESS_TOKEN and API_INTERNAL_URL come from compose/env.
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

