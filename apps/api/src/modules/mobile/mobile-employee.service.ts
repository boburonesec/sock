import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  EmployeeAdjustmentType,
  EmployeeStatus,
  TelegramAccountStatus,
  TelegramAccountType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  MobileEmployeeActivitiesResponse,
  MobileEmployeeAdvancesResponse,
  MobileEmployeeMeResponse,
  MobileEmployeePayrollResponse,
} from './mobile-employee.types';

interface ResolvedEmployeeLink {
  employeeId: string;
  tenantId: string;
  factoryId: string;
}

@Injectable()
export class MobileEmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(context: RequestContext): Promise<MobileEmployeeMeResponse> {
    const link = await this.resolveEmployeeLink(context);

    const employee = await this.prisma.employee.findFirstOrThrow({
      where: {
        id: link.employeeId,
        tenantId: link.tenantId,
        factoryId: link.factoryId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        factory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    const user = await this.prisma.user.findFirstOrThrow({
      where: {
        id: context.userId,
        tenantId: link.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    return {
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          status: employee.status,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
        factory: employee.factory,
        tenant: employee.tenant,
        user,
      },
    };
  }

  async getActivities(
    context: RequestContext,
  ): Promise<MobileEmployeeActivitiesResponse> {
    const link = await this.resolveEmployeeLink(context);
    const activities = await this.prisma.workerActivity.findMany({
      where: {
        tenantId: link.tenantId,
        factoryId: link.factoryId,
        employeeId: link.employeeId,
      },
      orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        quantity: true,
        salaryRateAmount: true,
        activityDate: true,
        productionStage: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
          },
        },
        productVariant: {
          select: productVariantSelect,
        },
      },
    });

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        quantity: activity.quantity,
        salaryRateAmount: activity.salaryRateAmount.toString(),
        activityDate: activity.activityDate,
        stage: activity.productionStage,
        productVariant: mapProductVariant(activity.productVariant),
      })),
    };
  }

  async getPayroll(context: RequestContext): Promise<MobileEmployeePayrollResponse> {
    const link = await this.resolveEmployeeLink(context);
    const payrollItems = await this.prisma.payrollItem.findMany({
      where: {
        tenantId: link.tenantId,
        factoryId: link.factoryId,
        employeeId: link.employeeId,
      },
      orderBy: [
        { payrollPeriod: { month: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: 36,
      select: {
        id: true,
        workedAmount: true,
        bonusAmount: true,
        penaltyAmount: true,
        advanceAmount: true,
        finalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        payrollPeriod: {
          select: {
            month: true,
            status: true,
          },
        },
      },
    });

    return {
      data: payrollItems.map((item) => ({
        id: item.id,
        month: item.payrollPeriod.month,
        payrollPeriodStatus: item.payrollPeriod.status,
        status: item.status,
        workedAmount: item.workedAmount.toString(),
        bonusAmount: item.bonusAmount.toString(),
        penaltyAmount: item.penaltyAmount.toString(),
        advanceAmount: item.advanceAmount.toString(),
        finalAmount: item.finalAmount.toString(),
        paidAmount: item.paidAmount.toString(),
        remainingAmount: item.remainingAmount.toString(),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  async getAdvances(context: RequestContext): Promise<MobileEmployeeAdvancesResponse> {
    const link = await this.resolveEmployeeLink(context);
    const advances = await this.prisma.employeeAdjustment.findMany({
      where: {
        tenantId: link.tenantId,
        factoryId: link.factoryId,
        employeeId: link.employeeId,
        type: EmployeeAdjustmentType.ADVANCE,
      },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        paidAt: true,
        cancelledAt: true,
        payrollPeriod: {
          select: {
            id: true,
            month: true,
            status: true,
          },
        },
      },
    });

    return {
      data: advances.map((advance) => ({
        id: advance.id,
        amount: advance.amount.toString(),
        reason: advance.reason,
        status: advance.status,
        requestedAt: advance.requestedAt,
        approvedAt: advance.approvedAt,
        paidAt: advance.paidAt,
        cancelledAt: advance.cancelledAt,
        payrollPeriod: advance.payrollPeriod,
      })),
    };
  }

  private async resolveEmployeeLink(
    context: RequestContext,
  ): Promise<ResolvedEmployeeLink> {
    const factoryId = requireActiveFactoryId(context);
    const links = await this.prisma.telegramAccount.findMany({
      where: {
        tenantId: context.tenantId,
        userId: context.userId,
        type: TelegramAccountType.EMPLOYEE,
        status: TelegramAccountStatus.ACTIVE,
        employeeId: { not: null },
        employee: {
          tenantId: context.tenantId,
          factoryId,
          status: EmployeeStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        employeeId: true,
        employee: {
          select: {
            id: true,
            tenantId: true,
            factoryId: true,
          },
        },
      },
    });

    const employeeIds = new Set(
      links.flatMap((link) => (link.employeeId ? [link.employeeId] : [])),
    );

    if (links.length !== 1 || employeeIds.size !== 1 || !links[0]?.employee) {
      throw new ForbiddenException(
        'Authenticated user is not linked to exactly one active employee.',
      );
    }

    return {
      employeeId: links[0].employee.id,
      tenantId: links[0].employee.tenantId,
      factoryId: links[0].employee.factoryId,
    };
  }
}

const productVariantSelect = {
  id: true,
  product: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  color: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  material: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  season: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

function mapProductVariant(productVariant: {
  id: string;
  product: { id: string; name: string; code: string | null };
  color: { id: string; name: string; code: string | null };
  material: { id: string; name: string; code: string | null };
  season: { id: string; name: string; code: string | null };
}) {
  return {
    id: productVariant.id,
    label: [
      productVariant.product.name,
      productVariant.color.name,
      productVariant.material.name,
      productVariant.season.name,
    ].join(' / '),
    product: productVariant.product,
    color: productVariant.color,
    material: productVariant.material,
    season: productVariant.season,
  };
}

