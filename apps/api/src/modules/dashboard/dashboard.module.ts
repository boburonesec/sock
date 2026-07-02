import { Module } from '@nestjs/common';
import { DevContextService } from '../../common/dev-context/dev-context.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { ProductionModule } from '../production/production.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { FactoryTvAccessGuard } from './factory-tv-access.guard';

/**
 * Read-only cross-domain dashboard projections.
 *
 * This module owns no business writes. It exists because executive summaries
 * combine production, warehouse, sales, supplier, finance, and employee data
 * without naturally belonging to one domain module.
 */
@Module({
  imports: [PrismaModule, IdentityModule, ProductionModule, WarehouseModule],
  controllers: [DashboardController],
  providers: [DevContextService, DashboardService, FactoryTvAccessGuard],
})
export class DashboardModule {}
