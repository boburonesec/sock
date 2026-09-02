import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';

export interface FactoryTvCredentialStatus {
  hasActiveCredential: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export interface FactoryTvCredentialCreated extends FactoryTvCredentialStatus {
  token: string;
}

/**
 * One active Factory TV credential per factory, so each tenant's floor
 * display works independently of every other tenant on this deployment —
 * see FactoryTvContextService for why a single shared token cannot do that.
 */
@Injectable()
export class FactoryTvCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(context: RequestContext): Promise<FactoryTvCredentialStatus> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const active = await this.prisma.factoryTvCredential.findFirst({
      where: { tenantId, factoryId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, lastUsedAt: true },
    });

    return {
      hasActiveCredential: Boolean(active),
      createdAt: active?.createdAt.toISOString() ?? null,
      lastUsedAt: active?.lastUsedAt?.toISOString() ?? null,
    };
  }

  async generate(context: RequestContext): Promise<FactoryTvCredentialCreated> {
    this.assertOwner(context);
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);

    const created = await this.prisma.$transaction(async (tx) => {
      // Only one active credential per factory — generating a new one
      // rotates out the old one instead of accumulating live tokens.
      await tx.factoryTvCredential.updateMany({
        where: { tenantId, factoryId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.factoryTvCredential.create({
        data: {
          tenantId,
          factoryId,
          tokenHash,
          createdByUserId: context.userId,
        },
        select: { createdAt: true },
      });
    });

    return {
      hasActiveCredential: true,
      createdAt: created.createdAt.toISOString(),
      lastUsedAt: null,
      token,
    };
  }

  async revoke(context: RequestContext): Promise<void> {
    this.assertOwner(context);
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const { count } = await this.prisma.factoryTvCredential.updateMany({
      where: { tenantId, factoryId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      throw new NotFoundException('Faol Factory TV havolasi topilmadi.');
    }
  }

  /** Used by FactoryTvAccessGuard — never throws, returns null on any miss. */
  async resolveByToken(
    rawToken: string,
  ): Promise<{ tenantId: string; factoryId: string } | null> {
    const tokenHash = this.hashToken(rawToken);
    const credential = await this.prisma.factoryTvCredential.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { id: true, tenantId: true, factoryId: true },
    });

    if (!credential) return null;

    // Best-effort — a lost lastUsedAt update must never block the TV screen.
    this.prisma.factoryTvCredential
      .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return { tenantId: credential.tenantId, factoryId: credential.factoryId };
  }

  private assertOwner(context: RequestContext): void {
    if (!context.roles.includes('Owner')) {
      throw new ForbiddenException('Factory TV havolasini faqat korxona egasi boshqaradi.');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
