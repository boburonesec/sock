import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * Settings projections and explicitly approved configuration writes.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
