import { Context, Telegraf } from 'telegraf';
import type { BotApiClient } from './api-client';
import { BotApiError } from './api-client';
import {
  formatActivities,
  formatAdvances,
  formatClientDebt,
  formatClientOrders,
  formatClientPayments,
  formatLinkedAccount,
  formatPayroll,
  formatSalary,
  formatUnlinkedAccount,
  helpText,
  privateOnlyText,
} from './formatters';

export function createEmployeeBot(input: {
  token: string;
  apiClient: BotApiClient;
}): Telegraf {
  const bot = new Telegraf(input.token);

  bot.start(async (ctx) => {
    if (!isPrivateChat(ctx.chat?.type)) {
      await ctx.reply(privateOnlyText);
      return;
    }

    const telegramUserId = getTelegramUserId(ctx.from?.id);
    if (!telegramUserId) {
      await ctx.reply('Telegram foydalanuvchi ID topilmadi.');
      return;
    }

    try {
      const account = await input.apiClient.me(telegramUserId);
      const linkedName =
        account.data.type === 'CLIENT'
          ? `Ulangan client: ${account.data.client?.name ?? 'Noma’lum'}`
          : `Ulangan xodim: ${account.data.employee?.name ?? 'Noma’lum'}`;
      await ctx.reply(
        [
          'Paypoq OS botiga xush kelibsiz.',
          '',
          linkedName,
          '',
          'Buyruqlar uchun /help yuboring.',
        ].join('\n'),
      );
    } catch {
      await ctx.reply(
        [
          'Paypoq OS botiga xush kelibsiz.',
          '',
          'Hisobingiz hali ulanmagan.',
          'Web app’dan olingan kod bilan /link CODE yuboring.',
        ].join('\n'),
      );
    }
  });

  bot.help(async (ctx) => {
    if (!isPrivateChat(ctx.chat?.type)) {
      await ctx.reply(privateOnlyText);
      return;
    }

    await ctx.reply(helpText);
  });

  bot.command('link', async (ctx) => {
    if (!isPrivateChat(ctx.chat?.type)) {
      await ctx.reply(privateOnlyText);
      return;
    }

    const telegramUserId = getTelegramUserId(ctx.from?.id);
    const telegramChatId = getTelegramChatId(ctx.chat?.id);
    const code = extractCommandArgument(ctx.message.text);

    if (!telegramUserId || !telegramChatId) {
      await ctx.reply('Telegram hisob ma’lumotlari topilmadi.');
      return;
    }

    if (!code) {
      await ctx.reply('Ulanish uchun kod yuboring: /link ABC123');
      return;
    }

    try {
      const response = await input.apiClient.link({
        code,
        telegramUserId,
        telegramChatId,
      });
      await ctx.reply(formatLinkedAccount(response.data));
    } catch (error) {
      await ctx.reply(formatSafeError(error, 'Kod noto‘g‘ri yoki muddati tugagan.'));
    }
  });

  bot.command('salary', async (ctx) => {
    await handlePrivateEmployeeCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.salary(telegramUserId);
      await ctx.reply(formatSalary(response.data));
    });
  });

  bot.command('unlink', async (ctx) => {
    if (!isPrivateChat(ctx.chat?.type)) {
      await ctx.reply(privateOnlyText);
      return;
    }

    const telegramUserId = getTelegramUserId(ctx.from?.id);
    if (!telegramUserId) {
      await ctx.reply('Telegram foydalanuvchi ID topilmadi.');
      return;
    }

    try {
      await input.apiClient.unlink(telegramUserId);
      await ctx.reply(formatUnlinkedAccount());
    } catch (error) {
      await ctx.reply(
        formatSafeError(
          error,
          'Aktiv ulangan hisob topilmadi yoki hisob bloklangan.',
        ),
      );
    }
  });

  bot.command('activities', async (ctx) => {
    await handlePrivateEmployeeCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.activities(telegramUserId);
      await ctx.reply(formatActivities(response.data));
    });
  });

  bot.command('advances', async (ctx) => {
    await handlePrivateEmployeeCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.advances(telegramUserId);
      await ctx.reply(formatAdvances(response.data));
    });
  });

  bot.command('payroll', async (ctx) => {
    await handlePrivateEmployeeCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.payroll(telegramUserId);
      await ctx.reply(formatPayroll(response.data));
    });
  });

  bot.command('orders', async (ctx) => {
    await handlePrivateClientCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.clientOrders(telegramUserId);
      await ctx.reply(formatClientOrders(response.data));
    });
  });

  bot.command('debt', async (ctx) => {
    await handlePrivateClientCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.clientDebt(telegramUserId);
      await ctx.reply(formatClientDebt(response.data));
    });
  });

  bot.command('payments', async (ctx) => {
    await handlePrivateClientCommand(ctx, async (telegramUserId) => {
      const response = await input.apiClient.clientPayments(telegramUserId);
      await ctx.reply(formatClientPayments(response.data));
    });
  });

  return bot;
}

async function handlePrivateEmployeeCommand(
  ctx: Context,
  handler: (telegramUserId: string) => Promise<void>,
): Promise<void> {
  if (!isPrivateChat(ctx.chat?.type)) {
    await ctx.reply(privateOnlyText);
    return;
  }

  const telegramUserId = getTelegramUserId(ctx.from?.id);
  if (!telegramUserId) {
    await ctx.reply('Telegram foydalanuvchi ID topilmadi.');
    return;
  }

  try {
    await handler(telegramUserId);
  } catch (error) {
    await ctx.reply(
      formatSafeError(
        error,
        'Bu buyruq faqat ulangan xodim hisobi uchun. Avval xodim kodi bilan /link CODE yuboring.',
      ),
    );
  }
}

async function handlePrivateClientCommand(
  ctx: Context,
  handler: (telegramUserId: string) => Promise<void>,
): Promise<void> {
  if (!isPrivateChat(ctx.chat?.type)) {
    await ctx.reply(privateOnlyText);
    return;
  }

  const telegramUserId = getTelegramUserId(ctx.from?.id);
  if (!telegramUserId) {
    await ctx.reply('Telegram foydalanuvchi ID topilmadi.');
    return;
  }

  try {
    await handler(telegramUserId);
  } catch (error) {
    await ctx.reply(
      formatSafeError(
        error,
        'Bu buyruq faqat ulangan client hisobi uchun. Avval client kodi bilan /link CODE yuboring.',
      ),
    );
  }
}

function isPrivateChat(type: string | undefined): boolean {
  return type === 'private';
}

function getTelegramUserId(value: number | undefined): string | null {
  return typeof value === 'number' ? String(value) : null;
}

function getTelegramChatId(value: number | undefined): string | null {
  return typeof value === 'number' ? String(value) : null;
}

function extractCommandArgument(text: string | undefined): string | null {
  const argument = text?.split(/\s+/).slice(1).join(' ').trim();
  return argument || null;
}

function formatSafeError(error: unknown, fallback: string): string {
  if (error instanceof BotApiError && error.status >= 400 && error.status < 500) {
    return fallback;
  }

  return 'Bot vaqtincha javob bera olmayapti. Iltimos, keyinroq urinib ko‘ring.';
}
