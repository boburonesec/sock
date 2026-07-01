import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { FactoryModule } from './modules/factory/factory.module';
import { FinanceModule } from './modules/finance/finance.module';
import { IdentityModule } from './modules/identity/identity.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ProductModule } from './modules/product/product.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { ProductionModule } from './modules/production/production.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    DashboardModule,
    IdentityModule,
    TenantModule,
    FactoryModule,
    ProductModule,
    PlatformAdminModule,
    ProductionModule,
    ReportsModule,
    WarehouseModule,
    EmployeeModule,
    SalesModule,
    SettingsModule,
    SupplierModule,
    FinanceModule,
    PayrollModule,
    NotificationModule,
    TelegramModule,
    AuditModule,
  ],
})
export class AppModule {}
