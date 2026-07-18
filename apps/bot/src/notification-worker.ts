import type { Telegraf } from 'telegraf';
import type { BotApiClient } from './api-client';

export function startNotificationDeliveryWorker(bot: Telegraf, api: BotApiClient): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async () => {
    if (stopped) return;
    try {
      const response = await api.claimNotificationDeliveries();
      for (const delivery of response.data) {
        if (!delivery.chatId) {
          await api.acknowledgeNotificationDelivery(delivery.id, 'FAILED', 'Recipient USER Telegram account is not linked.');
          continue;
        }
        try {
          await bot.telegram.sendMessage(delivery.chatId, `*${delivery.title}*\n\n${delivery.body}`, { parse_mode: 'Markdown' });
          await api.acknowledgeNotificationDelivery(delivery.id, 'SENT');
        } catch (error) {
          await api.acknowledgeNotificationDelivery(delivery.id, 'FAILED', safeError(error));
        }
      }
    } catch (error) {
      console.error('Notification delivery polling failed.', safeError(error));
    } finally {
      if (!stopped) timer = setTimeout(run, 5_000);
    }
  };
  void run();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown Telegram delivery error';
}
