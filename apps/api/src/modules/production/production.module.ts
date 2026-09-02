import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { RecoveryController } from './recovery.controller';

@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [ProductionController, RecoveryController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
