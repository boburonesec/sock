export interface BotConfig {
  telegramBotToken: string | null;
  mode: 'polling' | 'disabled';
  apiBaseUrl: string;
  botInternalApiKey: string;
  apiRequestTimeoutMs: number;
}

// Must match the API's development default in apps/api/src/config/configuration.ts
// so a local bot works against a local API without extra env. Never used in production.
const DEVELOPMENT_BOT_INTERNAL_API_KEY = 'local-development-bot-internal-api-key-change-me';
const PRODUCTION_MIN_KEY_LENGTH = 32;

export function loadConfig(): BotConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const mode = parseBotMode(process.env.BOT_MODE);
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const botInternalApiKey = resolveInternalApiKey(process.env.BOT_INTERNAL_API_KEY, isProduction);
  const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL);

  return {
    telegramBotToken: token,
    mode: token ? mode : 'disabled',
    apiBaseUrl,
    botInternalApiKey,
    apiRequestTimeoutMs: parseTimeout(process.env.BOT_API_TIMEOUT_MS),
  };
}

function resolveInternalApiKey(value: string | undefined, isProduction: boolean): string {
  const key = value?.trim();

  if (isProduction) {
    if (!key || key.length < PRODUCTION_MIN_KEY_LENGTH || key === DEVELOPMENT_BOT_INTERNAL_API_KEY) {
      throw new Error(
        `BOT_INTERNAL_API_KEY must be set to a unique secret of at least ${PRODUCTION_MIN_KEY_LENGTH} characters in production.`,
      );
    }
    return key;
  }

  return key || DEVELOPMENT_BOT_INTERNAL_API_KEY;
}

function parseBotMode(value: string | undefined): BotConfig['mode'] {
  const normalized = value?.trim().toLowerCase() || 'polling';
  if (normalized === 'polling' || normalized === 'disabled') return normalized;
  return 'polling';
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : 15_000;
}

function normalizeBaseUrl(value: string | undefined): string {
  let val = (value || 'http://paypoq-api:3001').trim().replace(/\/+$/, '');
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = val.includes('localhost') || val.includes('127.0.0.1')
      ? `http://${val}`
      : `https://${val}`;
  }
  return val;
}
