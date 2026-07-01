import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

/**
 * Warehouse snapshot, movement queries, and approved stock write flows.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
