import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * Auditable operational history + browse API for owners.
 */
@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
