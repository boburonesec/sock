import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Read-only report metadata projection.
 *
 * This module does not generate report files or aggregate full report data in
 * V1. It only exposes report catalogue metadata for the frontend overview.
 */
@Module({
  imports: [IdentityModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
