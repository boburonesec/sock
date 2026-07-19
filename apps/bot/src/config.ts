export interface BotConfig {
  telegramBotToken: string | null;
  mode: 'polling' | 'disabled';
  apiBaseUrl: string;
  botInternalApiKey: string;
}

export function loadConfig(): BotConfig {
  const mode = parseBotMode(process.env.BOT_MODE);
  return {
    telegramBotToken:
      mode === 'polling' ? requireEnv('TELEGRAM_BOT_TOKEN') : null,
    mode,
    apiBaseUrl: normalizeBaseUrl(requireEnv('API_BASE_URL')),
    botInternalApiKey: requireEnv('BOT_INTERNAL_API_KEY'),
  };
}

function parseBotMode(value: string | undefined): BotConfig['mode'] {
  const normalized = value?.trim().toLowerCase() || 'polling';
  if (normalized === 'polling' || normalized === 'disabled') return normalized;
  throw new Error('BOT_MODE must be polling or disabled.');
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}
