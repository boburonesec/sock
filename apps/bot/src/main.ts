import { BotApiClient } from './api-client';
import { createEmployeeBot } from './bot';
import { loadConfig } from './config';
import { startNotificationDeliveryWorker } from './notification-worker';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const apiClient = new BotApiClient(config);
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
  process.once('SIGINT', () => { stopWorker(); bot.stop('SIGINT'); });
  process.once('SIGTERM', () => { stopWorker(); bot.stop('SIGTERM'); });
  console.log('Paypoq OS Telegram bot started.');
}

bootstrap().catch((error) => {
  console.error('Paypoq OS Telegram bot failed to start.', error);
  process.exitCode = 1;
});
