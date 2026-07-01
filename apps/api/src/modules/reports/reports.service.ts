import { Injectable } from '@nestjs/common';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  QuickReportResponse,
  ReportCategoryCardResponse,
  ReportsOverviewResponse,
} from './reports.types';

@Injectable()
export class ReportsService {
  async getOverview(context: RequestContext): Promise<ReportsOverviewResponse> {
    // Resolve the authenticated context so this endpoint follows the same
    // tenant/factory boundary pattern as other read APIs, even though V1
    // returns metadata only.
    requireActiveFactoryId(context);

    return {
      data: {
        categoryCards: this.getCategoryCards(),
        quickReports: this.getQuickReports(),
        // Real generated report metadata does not exist yet. Do not fake files.
        recentReports: [],
      },
    };
  }

  private getCategoryCards(): ReportCategoryCardResponse[] {
    return [
      {
        id: 'production',
        name: 'Ishlab chiqarish hisobotlari',
        description: 'Bosqichlar, stage inventory, faollik va nuqsonlar',
        reportCount: '6 ta hisobot',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/reports/production',
      },
      {
        id: 'employees',
        name: 'Xodimlar hisobotlari',
        description: 'Faollik, payroll snapshotlari va adjustmentlar',
        reportCount: '5 ta hisobot',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/reports/employees',
      },
      {
        id: 'sales',
        name: 'Sotuv hisobotlari',
        description: 'Buyurtmalar, to‘lovlar va client qarzlari',
        reportCount: '6 ta hisobot',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/reports/sales',
      },
      {
        id: 'finance',
        name: 'Moliya hisobotlari',
        description: 'Xarajatlar, supplier debt, avans va payroll',
        reportCount: '5 ta hisobot',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/reports/finance',
      },
      {
        id: 'warehouse',
        name: 'Ombor hisobotlari',
        description: 'Qoldiq, harakatlar va low stock materiallar',
        reportCount: '4 ta hisobot',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/reports/warehouse',
      },
    ];
  }

  private getQuickReports(): QuickReportResponse[] {
    return [
      {
        id: 'today-production',
        label: 'Bugungi ishlab chiqarish',
        description: 'Bosqichlar bo‘yicha umumiy ko‘rinish',
        href: '/reports/production',
      },
      {
        id: 'client-debts',
        label: 'Client qarzlari',
        description: 'Qarzdor clientlar ro‘yxati',
        href: '/reports/sales',
      },
      {
        id: 'supplier-debts',
        label: 'Supplier qarzlari',
        description: 'Supplier debt holati',
        href: '/reports/finance',
      },
      {
        id: 'employee-activity',
        label: 'Xodimlar faolligi',
        description: 'Ishchi activity yozuvlari',
        href: '/reports/employees',
      },
      {
        id: 'low-stock-materials',
        label: 'Low stock materiallar',
        description: 'Threshold’dan past materiallar',
        href: '/reports/warehouse',
      },
      {
        id: 'monthly-payroll',
        label: 'Oylik payroll',
        description: 'Payroll davri xulosasi',
        href: '/reports/finance',
      },
    ];
  }
}
