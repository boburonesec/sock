export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    jwtAccessSecret:
      process.env.JWT_ACCESS_SECRET ?? 'local-development-jwt-secret-change-me',
    jwtAccessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    cookieName: process.env.AUTH_COOKIE_NAME ?? 'paypoq_refresh_token',
    cookieSameSite: process.env.AUTH_COOKIE_SAMESITE,
  },
  platformAuth: {
    jwtAccessSecret:
      process.env.PLATFORM_JWT_ACCESS_SECRET ??
      'local-development-platform-jwt-secret-change-me',
    cookieName: process.env.PLATFORM_AUTH_COOKIE_NAME ?? 'paypoq_platform_refresh_token',
    cookieSameSite: process.env.PLATFORM_AUTH_COOKIE_SAMESITE ?? process.env.AUTH_COOKIE_SAMESITE,
  },
  telegram: {
    linkTokenSecret:
      process.env.TELEGRAM_LINK_TOKEN_SECRET ??
      'local-development-telegram-link-token-secret-change-me',
  },
  bot: {
    internalApiKey:
      process.env.BOT_INTERNAL_API_KEY ??
      'local-development-bot-internal-api-key-change-me',
  },
  factoryTv: {
    accessToken:
      process.env.FACTORY_TV_ACCESS_TOKEN ??
      'local-development-factory-tv-token-change-me',
    // Which tenant/factory the shared token resolves to. Unset in
    // development/CI falls back to auto-detecting a single seeded tenant;
    // required in production (enforced by env.validation.ts).
    tenantId: process.env.FACTORY_TV_TENANT_ID || undefined,
    factoryId: process.env.FACTORY_TV_FACTORY_ID || undefined,
  },
});
