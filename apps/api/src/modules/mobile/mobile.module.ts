import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { MobileEmployeeController } from './mobile-employee.controller';
import { MobileEmployeeService } from './mobile-employee.service';

/**
 * Read-only mobile self-service endpoints.
 *
 * Mobile does not own business logic. These endpoints expose only the
 * authenticated employee's own backend-calculated records.
 */
@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [MobileEmployeeController],
  providers: [MobileEmployeeService],
})
export class MobileModule {}

