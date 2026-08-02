import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';

export interface CreateAuditLogInput {
  tenantId: string;
  factoryId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown | null;
  after?: unknown | null;
  metadata?: unknown | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithTransaction(
    tx: Prisma.TransactionClient,
    input: CreateAuditLogInput,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: toNullableJson(input.before),
        after: toNullableJson(input.after),
        metadata: toNullableJson(input.metadata),
      },
    });
  }

  async listLogs(context: RequestContext, limit = 100) {
    const take = Math.min(Math.max(limit, 1), 500);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId: context.tenantId,
        ...(context.activeFactoryId
          ? {
              OR: [{ factoryId: context.activeFactoryId }, { factoryId: null }],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        factoryId: true,
        createdAt: true,
        before: true,
        after: true,
        metadata: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      data: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}

function toNullableJson(
  value: unknown | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}
