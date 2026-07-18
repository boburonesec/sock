import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { BotInternalApiKeyGuard } from '../telegram/bot-internal-api-key.guard';
import { AcknowledgeDeliveryDto } from './notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}
  @Get() list(@CurrentContext() c: RequestContext) { return this.service.list(c); }
  @Patch(':id/read') read(@CurrentContext() c: RequestContext, @Param('id') id: string) { return this.service.markRead(c, id); }
}

@Controller('internal/notification-deliveries')
@UseGuards(BotInternalApiKeyGuard)
export class NotificationInternalController {
  constructor(private readonly service: NotificationService) {}
  @Post('claim') claim() { return this.service.claimTelegramDeliveries(); }
  @Post(':id/ack') ack(@Param('id') id: string, @Body() d: AcknowledgeDeliveryDto) { return this.service.acknowledge(id, d); }
}
