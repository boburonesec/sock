import type { Telegraf } from 'telegraf';
import type { BotApiClient, NotificationDelivery } from './api-client';
import { escapeHtml } from './formatters';

export function startNotificationDeliveryWorker(bot: Telegraf, api: BotApiClient): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async () => {
    if (stopped) return;
    try {
      const response = await api.claimNotificationDeliveries();
      for (const delivery of response.data) {
        if (stopped) break;
        // One failed delivery/ack must not strand the rest of the claimed batch.
        await deliver(bot, api, delivery).catch((error) => {
          console.error('Notification delivery acknowledgement failed.', safeError(error));
        });
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

async function deliver(bot: Telegraf, api: BotApiClient, delivery: NotificationDelivery): Promise<void> {
  if (!delivery.chatId) {
    await api.acknowledgeNotificationDelivery(delivery.id, 'FAILED', 'Recipient USER Telegram account is not linked.');
    return;
  }
  try {
    // HTML with escaping: titles/bodies contain operator text (machine codes,
    // task descriptions) where `_`, `*` or `[` broke legacy Markdown parsing.
    await bot.telegram.sendMessage(
      delivery.chatId,
      `<b>${escapeHtml(delivery.title)}</b>\n\n${escapeHtml(delivery.body)}`,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    await api.acknowledgeNotificationDelivery(delivery.id, 'FAILED', safeError(error));
    return;
  }
  await api.acknowledgeNotificationDelivery(delivery.id, 'SENT');
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown Telegram delivery error';
}
