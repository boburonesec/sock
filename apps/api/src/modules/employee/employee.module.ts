import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

/**
 * Establishes the future boundary for employee records and activity data.
 */
@Module({
  imports: [PrismaModule, IdentityModule, AuditModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
