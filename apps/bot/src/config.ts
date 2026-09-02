export interface BotConfig {
  telegramBotToken: string | null;
  mode: 'polling' | 'disabled';
  apiBaseUrl: string;
  botInternalApiKey: string;
}

export function loadConfig(): BotConfig {
  const mode = parseBotMode(process.env.BOT_MODE);
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const botInternalApiKey =
    process.env.BOT_INTERNAL_API_KEY?.trim() || 'internal-bot-key';
  const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL);

  return {
    telegramBotToken: token,
    mode: token ? mode : 'disabled',
    apiBaseUrl,
    botInternalApiKey,
  };
}

function parseBotMode(value: string | undefined): BotConfig['mode'] {
  const normalized = value?.trim().toLowerCase() || 'polling';
  if (normalized === 'polling' || normalized === 'disabled') return normalized;
  return 'polling';
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

