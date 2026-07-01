import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
