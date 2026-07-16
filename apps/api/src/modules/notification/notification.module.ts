import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { BotInternalApiKeyGuard } from '../telegram/bot-internal-api-key.guard';
import { NotificationController, NotificationInternalController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [NotificationController, NotificationInternalController],
  providers: [NotificationService, BotInternalApiKeyGuard],
  exports: [NotificationService],
})
export class NotificationModule {}
