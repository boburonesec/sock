import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { BotInternalApiKeyGuard } from './bot-internal-api-key.guard';
import {
  TelegramAccountController,
  TelegramBotController,
  TelegramController,
  TelegramHealthController,
} from './telegram.controller';
import { TelegramService } from './telegram.service';

/**
 * Tenant-side Telegram linking foundation.
 *
 * This module only creates short-lived link tokens. Bot runtime, Telegram
 * webhooks, and account linking commands are intentionally separate future work.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [
    TelegramController,
    TelegramAccountController,
    TelegramHealthController,
    TelegramBotController,
  ],
  providers: [TelegramService, BotInternalApiKeyGuard],
})
export class TelegramModule {}
