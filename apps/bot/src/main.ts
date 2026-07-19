import { BotApiClient } from './api-client';
import { createEmployeeBot } from './bot';
import { loadConfig } from './config';
import { startNotificationDeliveryWorker } from './notification-worker';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const apiClient = new BotApiClient(config);
  if (config.mode === 'disabled') {
    const shutdown = waitForShutdown();
    console.log('Paypoq OS Telegram bot started with external polling disabled.');
    await shutdown;
    return;
  }

  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required in polling mode.');
  }
  const bot = createEmployeeBot({
    token: config.telegramBotToken,
    apiClient,
  });

  bot.catch((error) => {
    // Keep logs generic: command payloads may contain one-time link codes.
    console.error('Telegram bot handler failed.', error);
  });

  await bot.launch();
  const stopWorker = startNotificationDeliveryWorker(bot, apiClient);
  let stopping = false;
  const stop = (signal: 'SIGINT' | 'SIGTERM') => {
    if (stopping) return;
    stopping = true;
    stopWorker();
    bot.stop(signal);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
  console.log('Paypoq OS Telegram bot started.');
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const keepAlive = setInterval(() => undefined, 60_000);
    let stopping = false;
    const stop = (signal: string) => {
      if (stopping) return;
      stopping = true;
      clearInterval(keepAlive);
      console.log(`Paypoq OS Telegram bot stopping (${signal}).`);
      resolve();
    };
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));
  });
}

bootstrap().catch((error) => {
  console.error('Paypoq OS Telegram bot failed to start.', error);
  process.exitCode = 1;
});
