import http from 'http';
import { BotApiClient } from './api-client';
import { createEmployeeBot } from './bot';
import { loadConfig } from './config';
import { startNotificationDeliveryWorker } from './notification-worker';

function startHealthServer(): http.Server {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'paypoq-bot' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Paypoq Bot health listener running on port ${port}`);
  });

  return server;
}

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const apiClient = new BotApiClient(config);
  const healthServer = startHealthServer();

  if (config.mode === 'disabled') {
    const shutdown = waitForShutdown();
    console.log('Paypoq OS Telegram bot started with external polling disabled.');
    await shutdown;
    healthServer.close();
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
    healthServer.close();
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

