import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/**
 * Sales read projections plus incremental MVP write flows.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
