import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

/**
 * Read-only supplier records and debt projection queries for the current
 * development context.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}
