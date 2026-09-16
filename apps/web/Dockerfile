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
# NEXT_PUBLIC_* is baked into the browser bundle at build time and CANNOT be
# changed by runtime env. There is deliberately no default: a production image
# must be built against the real API origin, never a fallback host.
ARG NEXT_PUBLIC_API_URL
ARG BUILD_SHA=unknown
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA
COPY . .
RUN test -n "$NEXT_PUBLIC_API_URL" || { \
      echo "ERROR: --build-arg NEXT_PUBLIC_API_URL=https://api.example.com is required" >&2; \
      exit 1; \
    }
RUN pnpm --filter @paypoq/web build

FROM node:22-bookworm-slim AS runner
ARG BUILD_SHA=unknown
ENV NODE_ENV=production
ENV BUILD_SHA=$BUILD_SHA
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

