import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Establishes the future boundary for auditable operational history.
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
