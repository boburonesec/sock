import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmployeeStatus,
  EmployeeAdjustmentType,
  Prisma,
  SalesOrderStatus,
  TelegramAccountStatus,
  TelegramAccountType,
} from '../../prisma/client';
import { createHmac, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  CollectionResponse,
  TelegramAccountListItem,
  SingleResponse,
  TelegramAccountStatusChangeResponse,
  TelegramHealthResponse,
  TelegramBotAdvanceResponse,
  TelegramBotClientDebtResponse,
  TelegramBotClientOrderResponse,
  TelegramBotClientPaymentResponse,
  TelegramBotLinkedAccountResponse,
  TelegramBotPayrollItemResponse,
  TelegramBotSalaryRateResponse,
  TelegramBotWorkerActivityResponse,
  TelegramLinkTokenCreatedResponse,
  TelegramLinkTokenListItem,
} from './telegram.types';

const LINK_TOKEN_TTL_MINUTES = 10;
const LINK_CODE_LENGTH = 8;
const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LINK_CODE_CREATE_ATTEMPTS = 5;
const LINK_ATTEMPT_WINDOW_MS = 10 * 60_000;
const LINK_ATTEMPT_MAX = 5;
const CLIENT_ORDER_LIMIT = 10;
const CLIENT_PAYMENT_LIMIT = 10;
const CLIENT_DEBT_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.WAITING_PRODUCTION,
  SalesOrderStatus.READY,
  SalesOrderStatus.DELIVERED,
  SalesOrderStatus.CLOSED,
];

interface LinkAttemptRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class TelegramService {
  private readonly linkTokenSecret: string;
  private readonly linkAttempts = new Map<string, LinkAttemptRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    this.linkTokenSecret = this.configService.getOrThrow<string>(
      'telegram.linkTokenSecret',
    );
  }

  async createEmployeeLinkToken(
    context: RequestContext,
    employeeId: string,
  ): Promise<SingleResponse<TelegramLinkTokenCreatedResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
        factoryId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Active employee not found.');
    }

    const token = await this.createLinkToken(context, {
      targetType: TelegramAccountType.EMPLOYEE,
      targetId: employee.id,
      targetName: employee.name,
    });

    return { data: token };
  }

  async createUserLinkToken(
    context: RequestContext,
  ): Promise<SingleResponse<TelegramLinkTokenCreatedResponse>> {
    const user = await this.prisma.user.findFirst({
      where: { id: context.userId, tenantId: context.tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true },
    });
    if (!user) throw new NotFoundException('Active user not found.');
    return { data: await this.createLinkToken(context, { targetType: TelegramAccountType.USER, targetId: user.id, targetName: user.name }) };
  }

  async createClientLinkToken(
    context: RequestContext,
    clientId: string,
  ): Promise<SingleResponse<TelegramLinkTokenCreatedResponse>> {
    const tenantId = context.tenantId;

    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Active client not found.');
    }

    const token = await this.createLinkToken(context, {
      targetType: TelegramAccountType.CLIENT,
      targetId: client.id,
      targetName: client.name,
    });

    return { data: token };
  }

  async getLinkTokens(
    context: RequestContext,
  ): Promise<CollectionResponse<TelegramLinkTokenListItem>> {
    const tenantId = context.tenantId;

    const tokens = await this.prisma.telegramLinkToken.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        targetType: true,
        employeeId: true,
        clientId: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        createdByUserId: true,
        employee: { select: { name: true } },
        client: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    return {
      data: tokens.map((token) => ({
        id: token.id,
        targetType: token.targetType,
        targetId: token.employeeId ?? token.clientId ?? token.userId ?? null,
        targetName:
          token.employee?.name ?? token.client?.name ?? token.user?.name ?? null,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
        createdAt: token.createdAt,
        createdByUserId: token.createdByUserId,
      })),
    };
  }

  async getAccounts(
    context: RequestContext,
  ): Promise<CollectionResponse<TelegramAccountListItem>> {
    const accounts = await this.prisma.telegramAccount.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: telegramAccountListSelect,
    });

    return {
      data: accounts.map((account) => ({
        id: account.id,
        type: account.type,
        linkedEntity: mapTelegramLinkedEntity(account),
        telegramUserIdMasked: maskTelegramUserId(account.telegramUserId),
        status: account.status,
        linkedAt: account.linkedAt,
        unlinkedAt: account.unlinkedAt,
        blockedAt: account.blockedAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
    };
  }

  async getHealth(
    context: RequestContext,
  ): Promise<SingleResponse<TelegramHealthResponse>> {
    const [accounts, activeAccounts, linkTokens] = await this.prisma.$transaction([
      this.prisma.telegramAccount.count({ where: { tenantId: context.tenantId } }),
      this.prisma.telegramAccount.count({
        where: {
          tenantId: context.tenantId,
          status: TelegramAccountStatus.ACTIVE,
        },
      }),
      this.prisma.telegramLinkToken.count({
        where: { tenantId: context.tenantId },
      }),
    ]);

    return {
      data: {
        status: 'ok',
        service: 'paypoq-os-telegram',
        checks: {
          botInternalApiKeyConfigured: Boolean(
            this.configService.get<string>('bot.internalApiKey')?.trim(),
          ),
          linkTokenSecretConfigured: Boolean(this.linkTokenSecret.trim()),
          database: 'ok',
        },
        counts: {
          accounts: accounts.toString(),
          activeAccounts: activeAccounts.toString(),
          linkTokens: linkTokens.toString(),
        },
      },
    };
  }

  async linkEmployeeAccount(input: {
    code: string;
    telegramUserId: string;
    telegramChatId: string;
  }): Promise<SingleResponse<TelegramBotLinkedAccountResponse>> {
    const now = new Date();
    const normalizedCode = normalizeCode(input.code);
    const telegramUserId = input.telegramUserId.trim();
    const telegramChatId = input.telegramChatId.trim();

    this.registerLinkAttempt(telegramUserId, telegramChatId, now);

    return this.prisma.$transaction(async (tx) => {
      const existingTelegramAccount = await tx.telegramAccount.findUnique({
        where: { telegramUserId },
        select: {
          id: true,
          tenantId: true,
          type: true,
          employeeId: true,
          clientId: true,
          userId: true,
          status: true,
        },
      });

      if (existingTelegramAccount?.status === TelegramAccountStatus.BLOCKED) {
        throw new ConflictException('Telegram account is blocked.');
      }

      const candidateTokens = await tx.telegramLinkToken.findMany({
        where: {
          targetType: { in: [TelegramAccountType.EMPLOYEE, TelegramAccountType.CLIENT, TelegramAccountType.USER] },
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: {
          id: true,
          tenantId: true,
          codeHash: true,
          targetType: true,
          employeeId: true,
          clientId: true,
          userId: true,
          expiresAt: true,
          employee: {
            select: {
              id: true,
              name: true,
              status: true,
              deletedAt: true,
              factoryId: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              status: true,
              deletedAt: true,
            },
          },
          user: {
            select: { id: true, name: true, status: true, deletedAt: true },
          },
        },
      });

      const token = candidateTokens.find(
        (candidate) =>
          candidate.codeHash === this.hashCode(candidate.tenantId, normalizedCode),
      );

      if (!token) {
        throw new BadRequestException('Invalid or expired Telegram link code.');
      }

      if (token.targetType === TelegramAccountType.EMPLOYEE) {
        if (!token.employeeId || !token.employee) {
          throw new BadRequestException('Invalid or expired Telegram link code.');
        }

        if (
          token.employee.status !== EmployeeStatus.ACTIVE ||
          token.employee.deletedAt
        ) {
          throw new ConflictException('Employee is not active.');
        }
      }

      if (token.targetType === TelegramAccountType.CLIENT) {
        if (!token.clientId || !token.client) {
          throw new BadRequestException('Invalid or expired Telegram link code.');
        }

        if (token.client.status !== 'ACTIVE' || token.client.deletedAt) {
          throw new ConflictException('Client is not active.');
        }
      }

      if (token.targetType === TelegramAccountType.USER) {
        if (!token.userId || !token.user || token.user.status !== 'ACTIVE' || token.user.deletedAt) {
          throw new ConflictException('User is not active.');
        }
      }

      if (
        token.targetType !== TelegramAccountType.EMPLOYEE &&
        token.targetType !== TelegramAccountType.CLIENT &&
        token.targetType !== TelegramAccountType.USER
      ) {
        throw new BadRequestException('Unsupported Telegram link token type.');
      }

      const targetId = token.employeeId ?? token.clientId ?? token.userId;

      if (!targetId) {
        throw new BadRequestException('Invalid Telegram link token target.');
      }

      if (
        existingTelegramAccount &&
        !(
          existingTelegramAccount.tenantId === token.tenantId &&
          existingTelegramAccount.type === token.targetType &&
          existingTelegramAccount.employeeId ===
            (token.targetType === TelegramAccountType.EMPLOYEE ? targetId : null) &&
          existingTelegramAccount.clientId ===
            (token.targetType === TelegramAccountType.CLIENT ? targetId : null) &&
          existingTelegramAccount.userId ===
            (token.targetType === TelegramAccountType.USER ? targetId : null)
        )
      ) {
        throw new ConflictException(
          'Telegram account is already linked to another Paypoq account.',
        );
      }

      const telegramAccount = existingTelegramAccount
        ? await tx.telegramAccount.update({
            where: { id: existingTelegramAccount.id },
            data: {
              telegramChatId,
              status: TelegramAccountStatus.ACTIVE,
              linkedAt: now,
              unlinkedAt: null,
              blockedAt: null,
            },
            select: telegramAccountSelect,
          })
        : await tx.telegramAccount.create({
            data: {
              tenantId: token.tenantId,
              telegramUserId,
              telegramChatId,
              type: token.targetType,
              employeeId:
                token.targetType === TelegramAccountType.EMPLOYEE
                  ? targetId
                  : null,
              clientId:
                token.targetType === TelegramAccountType.CLIENT
                  ? targetId
                  : null,
              userId:
                token.targetType === TelegramAccountType.USER
                  ? targetId
                  : null,
              status: TelegramAccountStatus.ACTIVE,
              linkedAt: now,
            },
            select: telegramAccountSelect,
          });

      await tx.telegramLinkToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId: token.tenantId,
        factoryId:
          token.targetType === TelegramAccountType.EMPLOYEE
            ? token.employee?.factoryId ?? null
            : null,
        userId: null,
        action: 'TELEGRAM_ACCOUNT_LINKED',
        entityType: 'TelegramAccount',
        entityId: telegramAccount.id,
        after: {
          id: telegramAccount.id,
          type: telegramAccount.type,
          employeeId: telegramAccount.employeeId,
          clientId: telegramAccount.clientId,
          status: telegramAccount.status,
          linkedAt: telegramAccount.linkedAt,
        },
        metadata: {
          telegramUserId,
          telegramChatId,
          linkTokenId: token.id,
        },
      });

      this.clearLinkAttempts(telegramUserId, telegramChatId);

      return { data: mapLinkedAccountResponse(telegramAccount) };
    });
  }

  async unlinkEmployeeAccount(input: {
    telegramUserId: string;
  }): Promise<SingleResponse<TelegramAccountStatusChangeResponse>> {
    const telegramUserId = input.telegramUserId.trim();
    assertTelegramUserId(telegramUserId);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.telegramAccount.findUnique({
        where: { telegramUserId },
        select: telegramAccountSelect,
      });

      if (
        !account ||
        (account.type !== TelegramAccountType.EMPLOYEE &&
          account.type !== TelegramAccountType.CLIENT &&
          account.type !== TelegramAccountType.USER) ||
        account.status !== TelegramAccountStatus.ACTIVE ||
        (account.type === TelegramAccountType.EMPLOYEE && !account.employee) ||
        (account.type === TelegramAccountType.CLIENT && !account.client) ||
        (account.type === TelegramAccountType.USER && !account.user)
      ) {
        throw new NotFoundException('Active Telegram account not found.');
      }

      const updated = await tx.telegramAccount.update({
        where: { id: account.id },
        data: {
          status: TelegramAccountStatus.UNLINKED,
          unlinkedAt: now,
        },
        select: {
          id: true,
          status: true,
          unlinkedAt: true,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId: account.tenantId,
        factoryId: account.employee?.factoryId ?? null,
        userId: null,
        action: 'TELEGRAM_ACCOUNT_UNLINKED',
        entityType: 'TelegramAccount',
        entityId: account.id,
        before: {
          id: account.id,
          employeeId: account.employeeId,
          clientId: account.clientId,
          userId: account.userId,
          status: account.status,
        },
        after: {
          id: updated.id,
          status: updated.status,
          unlinkedAt: updated.unlinkedAt,
        },
        metadata: {
          telegramUserId,
        },
      });

      return {
        data: {
          telegramAccountId: updated.id,
          status: 'UNLINKED',
          changedAt: updated.unlinkedAt ?? now,
        },
      };
    });
  }

  async blockTelegramAccount(
    context: RequestContext,
    telegramAccountId: string,
  ): Promise<SingleResponse<TelegramAccountStatusChangeResponse>> {
    const tenantId = context.tenantId;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.telegramAccount.findFirst({
        where: {
          id: telegramAccountId,
          tenantId,
        },
        select: telegramAccountSelect,
      });

      if (!account) {
        throw new NotFoundException('Telegram account not found.');
      }

      if (account.status === TelegramAccountStatus.BLOCKED) {
        throw new ConflictException('Telegram account is already blocked.');
      }

      const updated = await tx.telegramAccount.update({
        where: { id: account.id },
        data: {
          status: TelegramAccountStatus.BLOCKED,
          blockedAt: now,
        },
        select: {
          id: true,
          status: true,
          blockedAt: true,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId: account.employee?.factoryId ?? null,
        userId: context.userId,
        action: 'TELEGRAM_ACCOUNT_BLOCKED',
        entityType: 'TelegramAccount',
        entityId: account.id,
        before: {
          id: account.id,
          type: account.type,
          employeeId: account.employeeId,
          clientId: account.clientId,
          userId: account.userId,
          status: account.status,
        },
        after: {
          id: updated.id,
          status: updated.status,
          blockedAt: updated.blockedAt,
        },
      });

      return {
        data: {
          telegramAccountId: updated.id,
          status: 'BLOCKED',
          changedAt: updated.blockedAt ?? now,
        },
      };
    });
  }

  async getBotMe(
    telegramUserId: string,
  ): Promise<SingleResponse<TelegramBotLinkedAccountResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveTelegramAccount(telegramUserId);

    return { data: mapLinkedAccountResponse(account) };
  }

  async getEmployeeSalary(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotSalaryRateResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveEmployeeTelegramAccount(telegramUserId);
    const now = new Date();

    const salaryRates = await this.prisma.salaryRate.findMany({
      where: {
        tenantId: account.tenantId,
        factoryId: account.employee.factoryId,
        deletedAt: null,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: [{ productionStage: { sortOrder: 'asc' } }, { effectiveFrom: 'desc' }],
      take: 20,
      select: {
        id: true,
        amount: true,
        effectiveFrom: true,
        effectiveTo: true,
        productionStage: { select: { id: true, name: true } },
        productVariant: { select: productVariantLabelSelect },
      },
    });

    return {
      data: salaryRates.map((rate) => ({
        id: rate.id,
        amount: rate.amount.toString(),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        stage: rate.productionStage,
        productVariant: rate.productVariant
          ? {
              id: rate.productVariant.id,
              label: formatProductVariantLabel(rate.productVariant),
            }
          : null,
      })),
    };
  }

  async getEmployeeActivities(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotWorkerActivityResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveEmployeeTelegramAccount(telegramUserId);

    const activities = await this.prisma.workerActivity.findMany({
      where: {
        tenantId: account.tenantId,
        factoryId: account.employee.factoryId,
        employeeId: account.employeeId,
      },
      orderBy: { activityDate: 'desc' },
      take: 10,
      select: telegramWorkerActivitySelect,
    });

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        quantity: activity.quantity,
        salaryRateAmount: activity.salaryRateAmount.toString(),
        activityDate: activity.activityDate,
        stage: activity.productionStage,
        productVariant: {
          id: activity.productVariant.id,
          label: formatProductVariantLabel(activity.productVariant),
        },
      })),
    };
  }

  async getEmployeeAdvances(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotAdvanceResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveEmployeeTelegramAccount(telegramUserId);

    const advances = await this.prisma.employeeAdjustment.findMany({
      where: {
        tenantId: account.tenantId,
        factoryId: account.employee.factoryId,
        employeeId: account.employeeId,
        type: EmployeeAdjustmentType.ADVANCE,
        cancelledAt: null,
      },
      orderBy: { requestedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        requestedAt: true,
        paidAt: true,
      },
    });

    return {
      data: advances.map((advance) => ({
        id: advance.id,
        amount: advance.amount.toString(),
        reason: advance.reason,
        status: advance.status,
        requestedAt: advance.requestedAt,
        paidAt: advance.paidAt,
      })),
    };
  }

  async getEmployeePayroll(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotPayrollItemResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveEmployeeTelegramAccount(telegramUserId);

    const payrollItems = await this.prisma.payrollItem.findMany({
      where: {
        tenantId: account.tenantId,
        factoryId: account.employee.factoryId,
        employeeId: account.employeeId,
      },
      orderBy: { payrollPeriod: { month: 'desc' } },
      take: 6,
      select: telegramPayrollItemSelect,
    });

    return {
      data: payrollItems.map((item) => ({
        id: item.id,
        month: item.payrollPeriod.month,
        status: item.status,
        workedAmount: item.workedAmount.toString(),
        bonusAmount: item.bonusAmount.toString(),
        penaltyAmount: item.penaltyAmount.toString(),
        advanceAmount: item.advanceAmount.toString(),
        finalAmount: item.finalAmount.toString(),
        paidAmount: item.paidAmount.toString(),
        remainingAmount: item.remainingAmount.toString(),
      })),
    };
  }

  async getClientOrders(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotClientOrderResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveClientTelegramAccount(telegramUserId);

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        tenantId: account.tenantId,
        clientId: account.clientId,
      },
      orderBy: { createdAt: 'desc' },
      take: CLIENT_ORDER_LIMIT,
      select: telegramClientOrderSelect,
    });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deadline: order.deadline,
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          productVariant: {
            id: item.productVariant.id,
            label: formatProductVariantLabel(item.productVariant),
          },
        })),
      })),
    };
  }

  async getClientDebt(
    telegramUserId: string,
  ): Promise<SingleResponse<TelegramBotClientDebtResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveClientTelegramAccount(telegramUserId);

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        tenantId: account.tenantId,
        clientId: account.clientId,
        status: { in: CLIENT_DEBT_ORDER_STATUSES },
      },
      select: {
        totalAmount: true,
        allocations: {
          where: { payment: { reversedAt: null } },
          select: { amount: true },
        },
      },
    });

    const totalOrders = sumDecimal(orders.map((order) => order.totalAmount));
    const totalPaid = sumDecimal(
      orders.flatMap((order) =>
        order.allocations.map((allocation) => allocation.amount),
      ),
    );

    return {
      data: {
        client: {
          id: account.client.id,
          name: account.client.name,
        },
        totalOrders: totalOrders.toString(),
        totalPaid: totalPaid.toString(),
        debt: totalOrders.minus(totalPaid).toString(),
      },
    };
  }

  async getClientPayments(
    telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotClientPaymentResponse>> {
    assertTelegramUserId(telegramUserId);
    const account = await this.findActiveClientTelegramAccount(telegramUserId);

    const payments = await this.prisma.clientPayment.findMany({
      where: {
        tenantId: account.tenantId,
        clientId: account.clientId,
        reversedAt: null,
      },
      orderBy: { paymentDate: 'desc' },
      take: CLIENT_PAYMENT_LIMIT,
      select: telegramClientPaymentSelect,
    });

    return {
      data: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        method: payment.method,
        paymentDate: payment.paymentDate,
        note: payment.note,
        allocations: payment.allocations.map((allocation) => ({
          id: allocation.id,
          amount: allocation.amount.toString(),
          order: allocation.order,
        })),
      })),
    };
  }

  private async findActiveEmployeeTelegramAccount(
    telegramUserId: string,
  ): Promise<ActiveEmployeeTelegramAccount> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      select: telegramAccountSelect,
    });

    if (
      !account ||
      account.type !== TelegramAccountType.EMPLOYEE ||
      account.status !== TelegramAccountStatus.ACTIVE ||
      !account.employeeId ||
      !account.employee ||
      account.employee.status !== EmployeeStatus.ACTIVE ||
      account.employee.deletedAt
    ) {
      throw new NotFoundException('Active employee Telegram account not found.');
    }

    return account as ActiveEmployeeTelegramAccount;
  }

  private async findActiveTelegramAccount(
    telegramUserId: string,
  ): Promise<ActiveEmployeeTelegramAccount | ActiveClientTelegramAccount | ActiveUserTelegramAccount> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      select: telegramAccountSelect,
    });

    if (!account || account.status !== TelegramAccountStatus.ACTIVE) {
      throw new NotFoundException('Active Telegram account not found.');
    }

    if (
      account.type === TelegramAccountType.EMPLOYEE &&
      account.employeeId &&
      account.employee &&
      account.employee.status === EmployeeStatus.ACTIVE &&
      !account.employee.deletedAt
    ) {
      return account as ActiveEmployeeTelegramAccount;
    }

    if (
      account.type === TelegramAccountType.CLIENT &&
      account.clientId &&
      account.client &&
      account.client.status === 'ACTIVE' &&
      !account.client.deletedAt
    ) {
      return account as ActiveClientTelegramAccount;
    }

    if (account.type === TelegramAccountType.USER && account.userId && account.user && account.user.status === 'ACTIVE' && !account.user.deletedAt) {
      return account as ActiveUserTelegramAccount;
    }

    throw new NotFoundException('Active Telegram account not found.');
  }

  private async findActiveClientTelegramAccount(
    telegramUserId: string,
  ): Promise<ActiveClientTelegramAccount> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      select: telegramAccountSelect,
    });

    if (
      !account ||
      account.type !== TelegramAccountType.CLIENT ||
      account.status !== TelegramAccountStatus.ACTIVE ||
      !account.clientId ||
      !account.client ||
      account.client.status !== 'ACTIVE' ||
      account.client.deletedAt
    ) {
      throw new NotFoundException('Active client Telegram account not found.');
    }

    return account as ActiveClientTelegramAccount;
  }

  private async createLinkToken(
    context: RequestContext,
    input: {
      targetType: TelegramAccountType;
      targetId: string;
      targetName: string;
    },
  ): Promise<TelegramLinkTokenCreatedResponse> {
    const tenantId = context.tenantId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LINK_TOKEN_TTL_MINUTES * 60_000);

    return this.prisma.$transaction(async (tx) => {
      // Current schema has no invalidatedAt column. For MVP, marking old
      // unexpired tokens as used prevents multiple live codes for one target.
      await tx.telegramLinkToken.updateMany({
        where: {
          tenantId,
          targetType: input.targetType,
          employeeId:
            input.targetType === TelegramAccountType.EMPLOYEE
              ? input.targetId
              : null,
          clientId:
            input.targetType === TelegramAccountType.CLIENT
              ? input.targetId
              : null,
          userId:
            input.targetType === TelegramAccountType.USER
              ? input.targetId
              : null,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      const generated = await this.createUniqueCodeHash(tx, tenantId);
      const createdToken = await tx.telegramLinkToken.create({
        data: {
          tenantId,
          codeHash: generated.codeHash,
          targetType: input.targetType,
          employeeId:
            input.targetType === TelegramAccountType.EMPLOYEE
              ? input.targetId
              : null,
          clientId:
            input.targetType === TelegramAccountType.CLIENT
              ? input.targetId
              : null,
          userId:
            input.targetType === TelegramAccountType.USER
              ? input.targetId
              : null,
          expiresAt,
          createdByUserId: context.userId,
        },
        select: {
          id: true,
          targetType: true,
          employeeId: true,
          clientId: true,
          userId: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId:
          input.targetType === TelegramAccountType.EMPLOYEE
            ? context.activeFactoryId
            : null,
        userId: context.userId,
        action: 'TELEGRAM_LINK_TOKEN_CREATED',
        entityType: 'TelegramLinkToken',
        entityId: createdToken.id,
        after: {
          id: createdToken.id,
          targetType: createdToken.targetType,
          targetId:
            createdToken.employeeId ??
            createdToken.clientId ??
            createdToken.userId ??
            null,
          expiresAt: createdToken.expiresAt,
          createdAt: createdToken.createdAt,
        },
        metadata: {
          targetName: input.targetName,
          rawCodeReturnedOnce: true,
        },
      });

      return {
        id: createdToken.id,
        code: generated.code,
        targetType: createdToken.targetType,
        targetId: input.targetId,
        expiresAt: createdToken.expiresAt,
        createdAt: createdToken.createdAt,
      };
    });
  }

  private async createUniqueCodeHash(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<{ code: string; codeHash: string }> {
    for (let attempt = 0; attempt < LINK_CODE_CREATE_ATTEMPTS; attempt += 1) {
      const code = generateHumanCode();
      const codeHash = this.hashCode(tenantId, code);
      const existingToken = await tx.telegramLinkToken.findUnique({
        where: { codeHash },
        select: { id: true },
      });

      if (!existingToken) {
        return { code, codeHash };
      }
    }

    throw new ConflictException('Could not generate a unique Telegram link code.');
  }

  private hashCode(tenantId: string, code: string): string {
    return createHmac('sha256', this.linkTokenSecret)
      .update(`${tenantId}:${normalizeCode(code)}`)
      .digest('hex');
  }

  private registerLinkAttempt(
    telegramUserId: string,
    telegramChatId: string,
    now: Date,
  ): void {
    assertTelegramUserId(telegramUserId);

    if (!telegramChatId.trim()) {
      throw new BadRequestException('telegramChatId is required.');
    }

    const key = createLinkAttemptKey(telegramUserId, telegramChatId);
    const nowMs = now.getTime();
    const existing = this.linkAttempts.get(key);
    const record =
      !existing || existing.resetAt <= nowMs
        ? { count: 0, resetAt: nowMs + LINK_ATTEMPT_WINDOW_MS }
        : existing;

    record.count += 1;
    this.linkAttempts.set(key, record);

    if (record.count > LINK_ATTEMPT_MAX) {
      throw new HttpException(
        'Too many Telegram link attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private clearLinkAttempts(telegramUserId: string, telegramChatId: string): void {
    this.linkAttempts.delete(createLinkAttemptKey(telegramUserId, telegramChatId));
  }
}

function generateHumanCode(): string {
  let code = '';

  for (let index = 0; index < LINK_CODE_LENGTH; index += 1) {
    code += LINK_CODE_ALPHABET[randomInt(0, LINK_CODE_ALPHABET.length)];
  }

  return code;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function createLinkAttemptKey(telegramUserId: string, telegramChatId: string): string {
  return `${telegramUserId.trim()}:${telegramChatId.trim()}`;
}

function assertTelegramUserId(telegramUserId: string): void {
  if (!telegramUserId?.trim()) {
    throw new BadRequestException('telegramUserId is required.');
  }
}

const telegramAccountSelect = {
  id: true,
  tenantId: true,
  telegramUserId: true,
  telegramChatId: true,
  type: true,
  employeeId: true,
  clientId: true,
  userId: true,
  status: true,
  linkedAt: true,
  employee: {
    select: {
      id: true,
      name: true,
      status: true,
      deletedAt: true,
      factoryId: true,
    },
  },
  client: {
    select: {
      id: true,
      name: true,
      status: true,
      deletedAt: true,
    },
  },
  user: {
    select: { id: true, name: true, status: true, deletedAt: true },
  },
} satisfies Prisma.TelegramAccountSelect;

const telegramAccountListSelect = {
  id: true,
  telegramUserId: true,
  type: true,
  status: true,
  linkedAt: true,
  unlinkedAt: true,
  blockedAt: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      name: true,
    },
  },
  client: {
    select: {
      id: true,
      name: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TelegramAccountSelect;

type TelegramAccountPayload = Prisma.TelegramAccountGetPayload<{
  select: typeof telegramAccountSelect;
}>;

type ActiveEmployeeTelegramAccount = TelegramAccountPayload & {
  employeeId: string;
  employee: NonNullable<TelegramAccountPayload['employee']>;
};

type ActiveClientTelegramAccount = TelegramAccountPayload & {
  clientId: string;
  client: NonNullable<TelegramAccountPayload['client']>;
};
type ActiveUserTelegramAccount = TelegramAccountPayload & {
  userId: string;
  user: NonNullable<TelegramAccountPayload['user']>;
};

type TelegramAccountListPayload = Prisma.TelegramAccountGetPayload<{
  select: typeof telegramAccountListSelect;
}>;

const productVariantLabelSelect = {
  id: true,
  product: { select: { name: true } },
  color: { select: { name: true } },
  material: { select: { name: true } },
  season: { select: { name: true } },
} satisfies Prisma.ProductVariantSelect;

const telegramWorkerActivitySelect = {
  id: true,
  quantity: true,
  salaryRateAmount: true,
  activityDate: true,
  productionStage: { select: { id: true, name: true } },
  productVariant: { select: productVariantLabelSelect },
} satisfies Prisma.WorkerActivitySelect;

const telegramPayrollItemSelect = {
  id: true,
  workedAmount: true,
  bonusAmount: true,
  penaltyAmount: true,
  advanceAmount: true,
  finalAmount: true,
  paidAmount: true,
  remainingAmount: true,
  status: true,
  payrollPeriod: { select: { month: true } },
} satisfies Prisma.PayrollItemSelect;

const telegramClientOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  deadline: true,
  totalAmount: true,
  createdAt: true,
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productVariant: { select: productVariantLabelSelect },
    },
  },
} satisfies Prisma.SalesOrderSelect;

const telegramClientPaymentSelect = {
  id: true,
  amount: true,
  method: true,
  paymentDate: true,
  note: true,
  allocations: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      amount: true,
      order: { select: { id: true, orderNumber: true } },
    },
  },
} satisfies Prisma.ClientPaymentSelect;

function mapLinkedAccountResponse(
  account: TelegramAccountPayload,
): TelegramBotLinkedAccountResponse {
  if (
    account.type !== TelegramAccountType.EMPLOYEE &&
    account.type !== TelegramAccountType.CLIENT &&
    account.type !== TelegramAccountType.USER
  ) {
    throw new NotFoundException('Linked Telegram account type is not supported.');
  }

  if (account.type === TelegramAccountType.EMPLOYEE && !account.employee) {
    throw new NotFoundException('Linked employee not found.');
  }

  if (account.type === TelegramAccountType.CLIENT && !account.client) {
    throw new NotFoundException('Linked client not found.');
  }
  if (account.type === TelegramAccountType.USER && !account.user) {
    throw new NotFoundException('Linked user not found.');
  }

  return {
    telegramAccountId: account.id,
    tenantId: account.tenantId,
    type: account.type,
    employee: account.employee
      ? {
          id: account.employee.id,
          name: account.employee.name,
        }
      : null,
    client: account.client
      ? {
          id: account.client.id,
          name: account.client.name,
        }
      : null,
    user: account.user ? { id: account.user.id, name: account.user.name } : null,
    linkedAt: account.linkedAt,
  };
}

function mapTelegramLinkedEntity(
  account: TelegramAccountListPayload,
): TelegramAccountListItem['linkedEntity'] {
  if (account.type === TelegramAccountType.EMPLOYEE && account.employee) {
    return {
      id: account.employee.id,
      name: account.employee.name,
      type: 'EMPLOYEE',
    };
  }

  if (account.type === TelegramAccountType.CLIENT && account.client) {
    return {
      id: account.client.id,
      name: account.client.name,
      type: 'CLIENT',
    };
  }

  if (account.type === TelegramAccountType.USER && account.user) {
    return {
      id: account.user.id,
      name: account.user.name,
      type: 'USER',
    };
  }

  return null;
}

function maskTelegramUserId(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 4) {
    return '••••';
  }

  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
}

function formatProductVariantLabel(
  variant: Prisma.ProductVariantGetPayload<{ select: typeof productVariantLabelSelect }>,
): string {
  return [
    variant.product.name,
    variant.color.name,
    variant.material.name,
    variant.season.name,
  ].join(' · ');
}

function sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0),
  );
}
