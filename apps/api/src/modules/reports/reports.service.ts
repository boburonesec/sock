import { Injectable } from '@nestjs/common';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  QuickReportResponse,
  ReportCategoryCardResponse,
  ReportsOverviewResponse,
} from './reports.types';

/**
 * Reports overview links operators to real operational screens.
 * Full generated report files / export are intentionally out of scope.
 */
@Injectable()
export class ReportsService {
  async getOverview(context: RequestContext): Promise<ReportsOverviewResponse> {
    requireActiveFactoryId(context);

    return {
      data: {
        categoryCards: this.getCategoryCards(),
        quickReports: this.getQuickReports(),
        recentReports: [],
      },
    };
  }

  private getCategoryCards(): ReportCategoryCardResponse[] {
    return [
      {
        id: 'production',
        name: 'Ishlab chiqarish',
        description: 'Bosqichlar, stage inventory, faollik va nuqsonlar',
        reportCount: 'Operatsion ko‘rinish',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/production',
      },
      {
        id: 'employees',
        name: 'Xodimlar',
        description: 'Ishbay ishchilar, bonus va jarimalar',
        reportCount: 'Operatsion ko‘rinish',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/employees',
      },
      {
        id: 'sales',
        name: 'Sotuvlar',
        description: 'Buyurtmalar, to‘lovlar va mijoz qarzlari',
        reportCount: 'Operatsion ko‘rinish',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/sales/debts',
      },
      {
        id: 'finance',
        name: 'Moliya',
        description: 'Xarajatlar, avans, supplier qarz va ish haqi',
        reportCount: 'Operatsion ko‘rinish',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/finance',
      },
      {
        id: 'warehouse',
        name: 'Ombor',
        description: 'Qoldiq, harakatlar va past qoldiq materiallar',
        reportCount: 'Operatsion ko‘rinish',
        lastUpdatedAt: null,
        status: 'AVAILABLE',
        href: '/warehouse',
      },
    ];
  }

  private getQuickReports(): QuickReportResponse[] {
    return [
      {
        id: 'today-production',
        label: 'Bugungi ishlab chiqarish',
        description: 'Bosqichlar va operatsiyalar paneli',
        href: '/dashboard/operations',
      },
      {
        id: 'client-debts',
        label: 'Mijoz qarzlari',
        description: 'Qarzdor mijozlar ro‘yxati',
        href: '/sales/debts',
      },
      {
        id: 'supplier-debts',
        label: 'Yetkazib beruvchi qarzlari',
        description: 'Supplier debt holati',
        href: '/finance/suppliers',
      },
      {
        id: 'employee-activity',
        label: 'Xodimlar faolligi',
        description: 'Ishbay ishchilar va hisoblar',
        href: '/employees',
      },
      {
        id: 'low-stock',
        label: 'Past qoldiq materiallar',
        description: 'Ombor limitalari bo‘yicha',
        href: '/warehouse',
      },
      {
        id: 'monthly-payroll',
        label: 'Oylik ish haqi',
        description: 'Payroll davrlari',
        href: '/finance/payroll',
      },
    ];
  }
}
