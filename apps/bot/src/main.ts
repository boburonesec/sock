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

  if (config.mode === 'disabled' || !config.telegramBotToken) {
    const shutdown = waitForShutdown();
    const reason = config.telegramBotToken ? 'BOT_MODE=disabled' : 'no TELEGRAM_BOT_TOKEN';
    console.log(
      `Paypoq OS Telegram bot running in standby mode, external polling disabled (${reason}). Health listener active.`,
    );
    await shutdown;
    healthServer.close();
    return;
  }
  const bot = createEmployeeBot({
    token: config.telegramBotToken,
    apiClient,
  });

  bot.catch((error) => {
    // Keep logs generic: command payloads may contain one-time link codes.
    console.error('Telegram bot handler failed.', error);
  });

  // Validate the token up front so a bad token fails the process immediately.
  bot.botInfo = await bot.telegram.getMe();

  // Telegraf 4.16 `launch()` resolves only when long polling stops, so it must
  // not be awaited here — otherwise the notification worker and the signal
  // handlers below would never be registered.
  const polling = bot.launch();
  const stopWorker = startNotificationDeliveryWorker(bot, apiClient);
  let stopping = false;
  const stop = (reason: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`Paypoq OS Telegram bot stopping (${reason}).`);
    stopWorker();
    healthServer.close();
    try {
      bot.stop(reason);
    } catch {
      // Polling already ended (e.g. after a fatal polling error).
    }
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));

  polling.catch((error: unknown) => {
    // Fatal polling errors (revoked token, 409 conflict with another instance)
    // must end the process so the supervisor restarts it visibly.
    console.error('Telegram long polling stopped with an error.', error);
    process.exitCode = 1;
    stop('polling-error');
  });

  console.log(`Paypoq OS Telegram bot started as @${bot.botInfo.username}.`);
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
  process.exit(1);
});
