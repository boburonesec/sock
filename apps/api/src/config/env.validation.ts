import * as Joi from 'joi';

/**
 * Rejects known weak / placeholder secrets even if they pass min length.
 * Production must use password-manager-generated random secrets.
 */
const WEAK_SECRET_PATTERN =
  /(change-?me|local-development|local-ci|replace-with|password123|secret-secret|your[_-]?secret|example|demo-secret|test-secret|changeme123)/i;

function secretSchema(options: {
  productionMin: number;
  developmentMin: number;
  developmentDefault: string;
}) {
  return Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(options.productionMin)
      .required()
      .custom((value, helpers) => {
        if (WEAK_SECRET_PATTERN.test(value)) {
          return helpers.error('any.invalid');
        }
        // Reject low entropy all-same-char / sequential placeholders
        if (/^(.)\1{15,}$/.test(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'production secret strength')
      .messages({
        'any.invalid':
          '{{#label}} looks like a development placeholder. Generate a strong random secret (≥32 chars) for production.',
        'string.min':
          '{{#label}} must be at least {{#limit}} characters in production.',
        'any.required': '{{#label}} is required in production.',
      }),
    otherwise: Joi.string()
      .min(options.developmentMin)
      .default(options.developmentDefault),
  });
}

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  DATABASE_URL: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .required()
      .custom((value, helpers) => {
        const origins = String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (origins.length === 0) {
          return helpers.error('any.invalid');
        }
        if (origins.some((origin) => origin === '*' || origin.includes('localhost'))) {
          return helpers.error('any.invalid');
        }
        return value;
      }, 'production CORS allowlist')
      .messages({
        'any.invalid':
          'CORS_ORIGIN must be an explicit production HTTPS origin allowlist (no * or localhost).',
        'any.required': 'CORS_ORIGIN is required in production.',
      }),
    otherwise: Joi.string().default('http://localhost:3000'),
  }),
  JWT_ACCESS_SECRET: secretSchema({
    productionMin: 32,
    developmentMin: 16,
    developmentDefault: 'local-development-jwt-secret-change-me',
  }),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().positive().default(30),
  AUTH_COOKIE_NAME: Joi.string().default('paypoq_refresh_token'),
  PLATFORM_JWT_ACCESS_SECRET: secretSchema({
    productionMin: 32,
    developmentMin: 16,
    developmentDefault: 'local-development-platform-jwt-secret-change-me',
  }),
  PLATFORM_AUTH_COOKIE_NAME: Joi.string().default(
    'paypoq_platform_refresh_token',
  ),
  TELEGRAM_LINK_TOKEN_SECRET: secretSchema({
    productionMin: 32,
    developmentMin: 16,
    developmentDefault: 'local-development-telegram-link-token-secret-change-me',
  }),
  BOT_INTERNAL_API_KEY: secretSchema({
    productionMin: 32,
    developmentMin: 16,
    developmentDefault: 'local-development-bot-internal-api-key-change-me',
  }),
  FACTORY_TV_ACCESS_TOKEN: secretSchema({
    productionMin: 32,
    developmentMin: 16,
    developmentDefault: 'local-development-factory-tv-token-change-me',
  }),
  // Not secrets — just which tenant/factory the single shared TV token
  // resolves to. Required in production because auto-detecting "the only
  // tenant" is unsafe once a second tenant exists on the same deployment.
  FACTORY_TV_TENANT_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required().messages({
      'any.required':
        'FACTORY_TV_TENANT_ID is required in production — Factory TV must not guess which tenant to serve.',
    }),
    otherwise: Joi.string().allow('').optional(),
  }),
  FACTORY_TV_FACTORY_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required().messages({
      'any.required':
        'FACTORY_TV_FACTORY_ID is required in production — Factory TV must not guess which factory to serve.',
    }),
    otherwise: Joi.string().allow('').optional(),
  }),
});

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
}
