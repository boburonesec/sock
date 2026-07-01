import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

/**
 * Read-only finance and payroll snapshot queries for the current development
 * context.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
