import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationDeliveryStatus, Prisma, QualityIssueStatus } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { AcknowledgeDeliveryDto } from './notification.dto';

export interface CreateNotificationInput {
  tenantId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  sourceType?: string;
  sourceId?: string;
  dedupeKey: string;
}

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.scheduleDueNotifications(), 60_000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }

  async list(context: RequestContext) {
    return { data: await this.prisma.notification.findMany({
      where: { tenantId: context.tenantId, recipientUserId: context.userId },
      orderBy: { createdAt: 'desc' }, take: 100,
    }) };
  }

  async markRead(context: RequestContext, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, tenantId: context.tenantId, recipientUserId: context.userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification topilmadi.');
    return { data: { id, readAt: new Date() } };
  }

  async createWithTransaction(tx: Prisma.TransactionClient, input: CreateNotificationInput) {
    try {
      return await tx.notification.create({
        data: {
          ...input,
          deliveries: { create: {} },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
      throw error;
    }
  }

  async claimTelegramDeliveries() {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + 60_000);
    const candidates = await this.prisma.notificationDelivery.findMany({
      where: {
        status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      orderBy: { nextAttemptAt: 'asc' }, take: 20,
      include: {
        notification: {
          include: {
            recipient: {
              include: { telegramAccounts: { where: { type: 'USER', status: 'ACTIVE' }, take: 1 } },
            },
          },
        },
      },
    });
    const claimed = [];
    for (const item of candidates) {
      const updated = await this.prisma.notificationDelivery.updateMany({
        where: { id: item.id, status: item.status, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
        data: { status: 'PROCESSING', leaseUntil, attemptCount: { increment: 1 } },
      });
      if (updated.count) {
        const account = item.notification.recipient.telegramAccounts[0];
        claimed.push({
          id: item.id,
          chatId: account?.telegramChatId ?? null,
          title: item.notification.title,
          body: item.notification.body,
        });
      }
    }
    return { data: claimed };
  }

  async acknowledge(id: string, dto: AcknowledgeDeliveryDto) {
    const existing = await this.prisma.notificationDelivery.findUnique({ where: { id } });
    if (!existing || existing.status !== 'PROCESSING') throw new NotFoundException('Claim qilingan delivery topilmadi.');
    const failed = dto.status === 'FAILED';
    const retryMinutes = Math.min(60, 2 ** Math.min(existing.attemptCount, 6));
    return { data: await this.prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: failed ? 'FAILED' : 'SENT',
        lastError: failed ? (dto.error ?? 'Telegram delivery failed') : null,
        nextAttemptAt: failed ? new Date(Date.now() + retryMinutes * 60_000) : existing.nextAttemptAt,
        sentAt: failed ? null : new Date(),
        leaseUntil: null,
      },
    }) };
  }

  private async scheduleDueNotifications(): Promise<void> {
    const now = new Date();
    const issues = await this.prisma.qualityIssue.findMany({
      where: { status: QualityIssueStatus.ATTENTION, recheckDueAt: { lte: now } },
      include: { mechanic: { include: { user: true } }, machine: true }, take: 100,
    });
    for (const issue of issues) {
      if (!issue.mechanic.user) continue;
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.qualityIssue.updateMany({ where: { id: issue.id, status: 'ATTENTION' }, data: { status: 'RECHECK_DUE' } });
        if (!changed.count) return;
        await this.createWithTransaction(tx, {
          tenantId: issue.tenantId,
          recipientUserId: issue.mechanic.user!.id,
          type: 'QUALITY_RECHECK_DUE',
          title: 'Qayta o‘lchash vaqti',
          body: `${issue.machine.code} stanogini qayta tekshiring.`,
          sourceType: 'QualityIssue', sourceId: issue.id,
          dedupeKey: `quality-recheck:${issue.id}`,
        });
      });
    }

    const upcomingRounds = await this.prisma.inspectionRound.findMany({
      where: { status: 'PENDING', scheduledAt: { gte: now, lte: new Date(now.getTime() + 10 * 60_000) } },
      include: { mechanic: { include: { user: true } }, machine: true }, take: 200,
    });
    for (const round of upcomingRounds) {
      if (!round.mechanic.user) continue;
      await this.prisma.$transaction((tx) => this.createWithTransaction(tx, {
        tenantId: round.tenantId, recipientUserId: round.mechanic.user!.id,
        type: 'INSPECTION_ROUND_UPCOMING', title: 'O‘lchov vaqti yaqinlashdi',
        body: `${round.machine.code} stanogi uchun o‘lchov.`, sourceType: 'InspectionRound', sourceId: round.id,
        dedupeKey: `inspection-upcoming:${round.id}`,
      }));
    }

    const overdueTasks = await this.prisma.maintenanceTask.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, dueAt: { lt: now } },
      include: { assignee: { include: { user: true } }, machine: true }, take: 200,
    });
    for (const task of overdueTasks) {
      if (!task.assignee.user) continue;
      await this.prisma.$transaction((tx) => this.createWithTransaction(tx, {
        tenantId: task.tenantId, recipientUserId: task.assignee.user!.id,
        type: 'MAINTENANCE_TASK_OVERDUE', title: 'Task muddati o‘tdi',
        body: `${task.machine.code}: ${task.description}`, sourceType: 'MaintenanceTask', sourceId: task.id,
        dedupeKey: `maintenance-overdue:${task.id}`,
      }));
    }
  }
}
