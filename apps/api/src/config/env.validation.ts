import * as Joi from 'joi';

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3001),
  // Kept as a validated placeholder until database integration is introduced.
  DATABASE_URL: Joi.string().allow('').optional(),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-development-jwt-secret-change-me'),
  }),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().positive().default(30),
  AUTH_COOKIE_NAME: Joi.string().default('paypoq_refresh_token'),
  PLATFORM_JWT_ACCESS_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-development-platform-jwt-secret-change-me'),
  }),
  PLATFORM_AUTH_COOKIE_NAME: Joi.string().default('paypoq_platform_refresh_token'),
  TELEGRAM_LINK_TOKEN_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-development-telegram-link-token-secret-change-me'),
  }),
  BOT_INTERNAL_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-development-bot-internal-api-key-change-me'),
  }),
  FACTORY_TV_ACCESS_TOKEN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-development-factory-tv-token-change-me'),
  }),
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
}
