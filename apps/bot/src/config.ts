export interface BotConfig {
  telegramBotToken: string;
  apiBaseUrl: string;
  botInternalApiKey: string;
}

export function loadConfig(): BotConfig {
  return {
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    apiBaseUrl: normalizeBaseUrl(requireEnv('API_BASE_URL')),
    botInternalApiKey: requireEnv('BOT_INTERNAL_API_KEY'),
  };
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
