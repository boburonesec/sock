import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EmployeeStatus,
  EmployeeWorkProfile,
  InspectionRoundStatus,
  MaintenanceTaskStatus,
  MeasurementSpecificationStatus,
  Prisma,
  ProductionRunStatus,
  QualityIssueStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { NotificationService } from '../notification/notification.service';
import {
  ConfigureInspectionSlotDto,
  CreateMachineAssignmentDto,
  CreateMachineDto,
  CreateMachinePieceRateDto,
  CreateMaintenanceTaskDto,
  CreateMeasurementSpecificationDto,
  ResolveQualityIssueDto,
  SubmitInspectionDto,
  UpdateMachineDto,
  UpdateMaintenanceTaskDto,
} from './machine.dto';

@Injectable()
export class MachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async lookups(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c);
    const [employees, shifts, products] = await Promise.all([
      this.prisma.employee.findMany({ where: { tenantId: c.tenantId, factoryId, status: 'ACTIVE', deletedAt: null, workProfile: { in: ['MECHANIC', 'MACHINE_OPERATOR'] } }, select: { id: true, name: true, workProfile: true, workShiftId: true }, orderBy: { name: 'asc' } }),
      this.prisma.workShift.findMany({ where: { tenantId: c.tenantId, factoryId, deletedAt: null }, select: { id: true, name: true, code: true } }),
      this.prisma.product.findMany({ where: { tenantId: c.tenantId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { data: { employees, shifts, products } };
  }

  async list(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c);
    return { data: await this.prisma.machine.findMany({
      where: { tenantId: c.tenantId, factoryId, deletedAt: null },
      include: { assignments: { where: { validTo: null }, include: { mechanic: { select: { id: true, name: true } }, workShift: true } } },
      orderBy: { code: 'asc' },
    }) };
  }

  async create(c: RequestContext, d: CreateMachineDto) {
    const factoryId = requireActiveFactoryId(c);
    return { data: await this.prisma.$transaction(async (tx) => {
      const machine = await tx.machine.create({ data: {
        tenantId: c.tenantId, factoryId, code: d.code.trim(), name: d.name.trim(), status: d.status, note: d.note?.trim(),
      } });
      await this.audit.createWithTransaction(tx, { tenantId: c.tenantId, factoryId, userId: c.userId, action: 'MACHINE_CREATED', entityType: 'Machine', entityId: machine.id, after: machine });
      return machine;
    }) };
  }

  async update(c: RequestContext, id: string, d: UpdateMachineDto) {
    const factoryId = requireActiveFactoryId(c);
    await this.machineOrThrow(c.tenantId, factoryId, id);
    return { data: await this.prisma.machine.update({ where: { id }, data: { code: d.code.trim(), name: d.name.trim(), status: d.status, note: d.note?.trim() } }) };
  }

  async listAssignments(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c);
    const now = new Date();
    return { data: await this.prisma.machineMechanicAssignment.findMany({
      where: { tenantId: c.tenantId, factoryId, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
      include: { machine: true, mechanic: true, workShift: true }, orderBy: { validFrom: 'desc' },
    }) };
  }

  async assign(c: RequestContext, d: CreateMachineAssignmentDto) {
    const factoryId = requireActiveFactoryId(c);
    const from = new Date(d.validFrom); const to = d.validTo ? new Date(d.validTo) : null;
    if (to && to <= from) throw new BadRequestException('validTo validFrom dan keyin bo‘lishi kerak.');
    return { data: await this.prisma.$transaction(async (tx) => {
      const [machine, mechanic, shift] = await Promise.all([
        tx.machine.findFirst({ where: { id: d.machineId, tenantId: c.tenantId, factoryId, status: 'ACTIVE', deletedAt: null } }),
        tx.employee.findFirst({ where: { id: d.mechanicId, tenantId: c.tenantId, factoryId, workProfile: 'MECHANIC', status: EmployeeStatus.ACTIVE, deletedAt: null } }),
        tx.workShift.findFirst({ where: { id: d.workShiftId, tenantId: c.tenantId, factoryId, deletedAt: null } }),
      ]);
      if (!machine || !mechanic || !shift) throw new BadRequestException('Stanok, mexanik yoki smena mos emas.');
      const overlap = await tx.machineMechanicAssignment.findFirst({ where: {
        tenantId: c.tenantId, factoryId, machineId: d.machineId, workShiftId: d.workShiftId,
        validFrom: { lt: to ?? new Date('9999-12-31') }, OR: [{ validTo: null }, { validTo: { gt: from } }],
      } });
      if (overlap) throw new ConflictException('Bu stanok va smenada vaqt oralig‘i ustma-ust tushgan assignment mavjud.');
      const assignment = await tx.machineMechanicAssignment.create({ data: {
        tenantId: c.tenantId, factoryId, machineId: d.machineId, mechanicId: d.mechanicId, workShiftId: d.workShiftId,
        validFrom: from, validTo: to, assignedByUserId: c.userId,
      } });
      await this.audit.createWithTransaction(tx, { tenantId: c.tenantId, factoryId, userId: c.userId, action: 'MACHINE_MECHANIC_ASSIGNED', entityType: 'MachineMechanicAssignment', entityId: assignment.id, after: assignment });
      return assignment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) };
  }

  async listRates(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c);
    return { data: await this.prisma.machinePieceRate.findMany({ where: { tenantId: c.tenantId, factoryId, deletedAt: null }, include: { product: true }, orderBy: { effectiveFrom: 'desc' } }) };
  }

  async createRate(c: RequestContext, d: CreateMachinePieceRateDto) {
    const factoryId = requireActiveFactoryId(c); const from = new Date(d.effectiveFrom); const to = d.effectiveTo ? new Date(d.effectiveTo) : null;
    const product = await this.prisma.product.findFirst({ where: { id: d.productId, tenantId: c.tenantId, deletedAt: null } });
    if (!product || (to && to <= from)) throw new BadRequestException('Mahsulot yoki sana oralig‘i noto‘g‘ri.');
    const overlap = await this.prisma.machinePieceRate.findFirst({ where: { tenantId: c.tenantId, factoryId, productId: d.productId, workRole: d.workRole, deletedAt: null, effectiveFrom: { lt: to ?? new Date('9999-12-31') }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }] } });
    if (overlap) throw new ConflictException('Bu mahsulot va rol uchun stavka sanalari ustma-ust tushgan.');
    return { data: await this.prisma.machinePieceRate.create({ data: { tenantId: c.tenantId, factoryId, productId: d.productId, workRole: d.workRole, amount: d.amount, effectiveFrom: from, effectiveTo: to } }) };
  }

  async listTasks(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c);
    const employeeFilter = c.roles.includes('Mechanic') ? { assignee: { user: { id: c.userId } } } : {};
    return { data: await this.prisma.maintenanceTask.findMany({ where: { tenantId: c.tenantId, factoryId, ...employeeFilter }, include: { machine: true, assignee: true }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] }) };
  }

  async createTask(c: RequestContext, d: CreateMaintenanceTaskDto) {
    if (c.roles.includes('Mechanic') && !c.roles.includes('Mechanic Master')) {
      throw new ForbiddenException('Taskni mexanik-master yoki boshqaruvchi beradi.');
    }
    const factoryId = requireActiveFactoryId(c);
    const [machine, mechanic] = await Promise.all([this.machineOrThrow(c.tenantId, factoryId, d.machineId), this.prisma.employee.findFirst({ where: { id: d.assigneeMechanicId, tenantId: c.tenantId, factoryId, workProfile: 'MECHANIC', status: 'ACTIVE', deletedAt: null }, include: { user: true } })]);
    if (!mechanic) throw new BadRequestException('Faol mexanik topilmadi.');
    return { data: await this.prisma.$transaction(async (tx) => {
      const task = await tx.maintenanceTask.create({ data: { tenantId: c.tenantId, factoryId, machineId: machine.id, assigneeMechanicId: mechanic.id, type: d.type, priority: d.priority, dueAt: d.dueAt ? new Date(d.dueAt) : null, description: d.description.trim(), createdByUserId: c.userId } });
      if (mechanic.user) await this.notifications.createWithTransaction(tx, { tenantId: c.tenantId, recipientUserId: mechanic.user.id, type: 'MAINTENANCE_TASK_ASSIGNED', title: 'Yangi texnik vazifa', body: `${machine.code}: ${task.description}`, sourceType: 'MaintenanceTask', sourceId: task.id, dedupeKey: `maintenance-task:${task.id}` });
      return task;
    }) };
  }

  async updateTask(c: RequestContext, id: string, d: UpdateMaintenanceTaskDto) {
    const factoryId = requireActiveFactoryId(c);
    const task = await this.prisma.maintenanceTask.findFirst({ where: { id, tenantId: c.tenantId, factoryId }, include: { assignee: { include: { user: true } } } });
    if (!task) throw new NotFoundException('Task topilmadi.');
    if (c.roles.includes('Mechanic') && task.assignee.user?.id !== c.userId) throw new NotFoundException('Task topilmadi.');
    if (d.status === MaintenanceTaskStatus.COMPLETED && !d.resolution?.trim()) throw new BadRequestException('Yakunlash uchun resolution majburiy.');
    return { data: await this.prisma.maintenanceTask.update({ where: { id }, data: { status: d.status, resolution: d.resolution?.trim(), completedAt: d.status === 'COMPLETED' ? new Date() : null, completedByUserId: d.status === 'COMPLETED' ? c.userId : null } }) };
  }

  async createSpecification(c: RequestContext, productId: string, d: CreateMeasurementSpecificationDto) {
    if (!d.metrics.length) throw new BadRequestException('Kamida bitta metrika kerak.');
    for (const m of d.metrics) if (m.min > m.target || m.target > m.max) throw new BadRequestException(`${m.code}: min <= target <= max bo‘lishi kerak.`);
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: c.tenantId, deletedAt: null } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi.');
    const latest = await this.prisma.productMeasurementSpecification.aggregate({ where: { tenantId: c.tenantId, productId }, _max: { version: true } });
    return { data: await this.prisma.productMeasurementSpecification.create({ data: { tenantId: c.tenantId, productId, version: (latest._max.version ?? 0) + 1, createdByUserId: c.userId, metrics: { create: d.metrics } }, include: { metrics: { orderBy: { displayOrder: 'asc' } } } }) };
  }

  async activateSpecification(c: RequestContext, id: string) {
    return { data: await this.prisma.$transaction(async (tx) => {
      const spec = await tx.productMeasurementSpecification.findFirst({ where: { id, tenantId: c.tenantId, status: MeasurementSpecificationStatus.DRAFT }, include: { metrics: true } });
      if (!spec || !spec.metrics.length) throw new BadRequestException('Aktivlashtiriladigan draft specification topilmadi.');
      await tx.productMeasurementSpecification.updateMany({ where: { tenantId: c.tenantId, productId: spec.productId, status: 'ACTIVE' }, data: { status: 'ARCHIVED' } });
      return tx.productMeasurementSpecification.update({ where: { id }, data: { status: 'ACTIVE', effectiveFrom: new Date(), activatedByUserId: c.userId }, include: { metrics: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) };
  }

  async configureSlot(c: RequestContext, d: ConfigureInspectionSlotDto) {
    const factoryId = requireActiveFactoryId(c);
    if (d.slotNumber > 3) throw new BadRequestException('Har smenada faqat 1, 2, 3 slot mavjud.');
    const shift = await this.prisma.workShift.findFirst({ where: { id: d.workShiftId, tenantId: c.tenantId, factoryId, deletedAt: null } });
    if (!shift) throw new BadRequestException('Smena topilmadi.');
    return { data: await this.prisma.inspectionScheduleSlot.upsert({ where: { tenantId_factoryId_workShiftId_slotNumber: { tenantId: c.tenantId, factoryId, workShiftId: d.workShiftId, slotNumber: d.slotNumber } }, create: { tenantId: c.tenantId, factoryId, ...d }, update: { minuteOffset: d.minuteOffset } }) };
  }

  async myRounds(c: RequestContext) {
    const factoryId = requireActiveFactoryId(c); await this.ensureTodayRounds(c.tenantId, factoryId);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    return { data: await this.prisma.inspectionRound.findMany({ where: { tenantId: c.tenantId, factoryId, scheduledAt: { gte: dayStart, lt: dayEnd }, ...(c.roles.includes('Mechanic') ? { mechanic: { user: { id: c.userId } } } : {}) }, include: { machine: true, productionRun: { include: { productVariant: { include: { product: true } } } }, specification: { include: { metrics: { orderBy: { displayOrder: 'asc' } } } }, measurements: true }, orderBy: { scheduledAt: 'asc' }, take: 200 }) };
  }

  async submitMeasurements(c: RequestContext, id: string, d: SubmitInspectionDto) {
    const factoryId = requireActiveFactoryId(c); const measuredAt = new Date();
    return { data: await this.prisma.$transaction(async (tx) => {
      const round = await tx.inspectionRound.findFirst({ where: { id, tenantId: c.tenantId, factoryId }, include: { mechanic: { include: { user: true } }, specification: { include: { metrics: true } } } });
      if (!round) throw new NotFoundException('Inspection round topilmadi.');
      if (c.roles.includes('Mechanic') && round.mechanic.user?.id !== c.userId) throw new NotFoundException('Inspection round topilmadi.');
      const values = new Map(d.measurements.map((m) => [m.metricId, m.value]));
      if (values.size !== round.specification.metrics.length || round.specification.metrics.some((m) => !values.has(m.id))) throw new BadRequestException('Specificationdagi barcha metrikalar bir marta yuborilishi kerak.');
      await tx.inspectionMeasurement.deleteMany({ where: { tenantId: c.tenantId, roundId: round.id } });
      const failed: Array<{ metricId: string; code: string; value: number; min: string; max: string }> = [];
      for (const metric of round.specification.metrics) {
        const value = values.get(metric.id)!; const ok = new Prisma.Decimal(value).gte(metric.min) && new Prisma.Decimal(value).lte(metric.max);
        await tx.inspectionMeasurement.create({ data: { tenantId: c.tenantId, roundId: round.id, metricId: metric.id, value, target: metric.target, min: metric.min, max: metric.max, isWithinRange: ok, measuredAt } });
        if (!ok) failed.push({ metricId: metric.id, code: metric.code, value, min: metric.min.toString(), max: metric.max.toString() });
      }
      await tx.inspectionRound.update({ where: { id: round.id }, data: { status: failed.length ? InspectionRoundStatus.ATTENTION : InspectionRoundStatus.PASSED, startedAt: round.startedAt ?? measuredAt, completedAt: measuredAt } });
      if (failed.length) await tx.qualityIssue.create({ data: { tenantId: c.tenantId, factoryId, inspectionRoundId: round.id, machineId: round.machineId, productionRunId: round.productionRunId, mechanicEmployeeId: round.mechanicEmployeeId, details: failed, recheckDueAt: new Date(measuredAt.getTime() + 30 * 60_000) } });
      if (round.mechanic.user) {
        const dayStart = new Date(measuredAt); dayStart.setHours(0, 0, 0, 0); const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
        const slotRounds = await tx.inspectionRound.findMany({ where: { tenantId: c.tenantId, factoryId, mechanicEmployeeId: round.mechanicEmployeeId, scheduleSlotId: round.scheduleSlotId, scheduledAt: { gte: dayStart, lt: dayEnd } }, include: { machine: true } });
        if (slotRounds.length > 0 && slotRounds.every((item) => ['PASSED', 'ATTENTION'].includes(item.id === round.id ? (failed.length ? 'ATTENTION' : 'PASSED') : item.status))) {
          const good = slotRounds.filter((item) => (item.id === round.id ? failed.length === 0 : item.status === 'PASSED')).map((item) => item.machine.code);
          const bad = slotRounds.filter((item) => (item.id === round.id ? failed.length > 0 : item.status === 'ATTENTION')).map((item) => item.machine.code);
          await this.notifications.createWithTransaction(tx, { tenantId: c.tenantId, recipientUserId: round.mechanic.user.id, type: 'INSPECTION_ROUND_SUMMARY', title: 'O‘lchov roundi yakunlandi', body: `Yaxshi (${good.length}): ${good.join(', ') || 'yo‘q'}. Attention (${bad.length}): ${bad.join(', ') || 'yo‘q'}.`, sourceType: 'InspectionScheduleSlot', sourceId: round.scheduleSlotId, dedupeKey: `inspection-summary:${round.mechanicEmployeeId}:${round.scheduleSlotId}:${dayStart.toISOString().slice(0, 10)}` });
        }
      }
      return { roundId: round.id, status: failed.length ? 'ATTENTION' : 'PASSED', failed };
    }) };
  }

  async listIssues(c: RequestContext) { const factoryId = requireActiveFactoryId(c); return { data: await this.prisma.qualityIssue.findMany({ where: { tenantId: c.tenantId, factoryId, status: { not: 'RESOLVED' }, ...(c.roles.includes('Mechanic') ? { mechanic: { user: { id: c.userId } } } : {}) }, include: { machine: true, mechanic: true, productionRun: true, inspectionRound: { include: { specification: { include: { metrics: { orderBy: { displayOrder: 'asc' } } } } } } }, orderBy: { recheckDueAt: 'asc' } }) }; }
  async resolveIssue(c: RequestContext, id: string, _d: ResolveQualityIssueDto) { const factoryId = requireActiveFactoryId(c); const issue = await this.prisma.qualityIssue.findFirst({ where: { id, tenantId: c.tenantId, factoryId } }); if (!issue) throw new NotFoundException('Issue topilmadi.'); return { data: await this.prisma.qualityIssue.update({ where: { id }, data: { status: QualityIssueStatus.RESOLVED, resolvedAt: new Date(), resolvedByUserId: c.userId } }) }; }
  async recheckIssue(c: RequestContext, id: string, d: SubmitInspectionDto) {
    const factoryId = requireActiveFactoryId(c); const now = new Date();
    return { data: await this.prisma.$transaction(async (tx) => {
      const issue = await tx.qualityIssue.findFirst({ where: { id, tenantId: c.tenantId, factoryId, status: { in: ['ATTENTION', 'RECHECK_DUE'] } }, include: { inspectionRound: { include: { specification: { include: { metrics: true } } } }, mechanic: { include: { user: true } }, machine: true } });
      if (!issue) throw new NotFoundException('Recheck kutilayotgan issue topilmadi.');
      if (c.roles.includes('Mechanic') && issue.mechanic.user?.id !== c.userId) throw new NotFoundException('Issue topilmadi.');
      const metrics = issue.inspectionRound.specification.metrics; const values = new Map(d.measurements.map((m) => [m.metricId, m.value]));
      if (values.size !== metrics.length || metrics.some((m) => !values.has(m.id))) throw new BadRequestException('Barcha metrikalar yuborilishi kerak.');
      const round = await tx.inspectionRound.create({ data: { tenantId: c.tenantId, factoryId, machineId: issue.machineId, productionRunId: issue.productionRunId, mechanicEmployeeId: issue.mechanicEmployeeId, specificationId: issue.inspectionRound.specificationId, scheduleSlotId: issue.inspectionRound.scheduleSlotId, scheduledAt: issue.recheckDueAt, startedAt: now, dedupeKey: `quality-recheck:${issue.id}` } });
      const failed: string[] = [];
      for (const metric of metrics) {
        const value = values.get(metric.id)!; const ok = new Prisma.Decimal(value).gte(metric.min) && new Prisma.Decimal(value).lte(metric.max);
        await tx.inspectionMeasurement.create({ data: { tenantId: c.tenantId, roundId: round.id, metricId: metric.id, value, target: metric.target, min: metric.min, max: metric.max, isWithinRange: ok, measuredAt: now } });
        if (!ok) failed.push(metric.code);
      }
      await tx.inspectionRound.update({ where: { id: round.id }, data: { status: failed.length ? 'ATTENTION' : 'PASSED', completedAt: now } });
      const updated = await tx.qualityIssue.update({ where: { id: issue.id }, data: failed.length ? { status: 'ESCALATED', details: { recheckFailedMetrics: failed } } : { status: 'RESOLVED', resolvedAt: now, resolvedByUserId: c.userId } });
      if (failed.length) {
        const masters = await tx.user.findMany({ where: { tenantId: c.tenantId, status: 'ACTIVE', deletedAt: null, roles: { some: { role: { name: 'Mechanic Master' } } }, factoryAccesses: { some: { factoryId } } }, select: { id: true } });
        for (const master of masters) await this.notifications.createWithTransaction(tx, { tenantId: c.tenantId, recipientUserId: master.id, type: 'QUALITY_RECHECK_ESCALATED', title: 'O‘lchov muammosi saqlanib qoldi', body: `${issue.machine.code}: ${failed.join(', ')}`, sourceType: 'QualityIssue', sourceId: issue.id, dedupeKey: `quality-escalated:${issue.id}:${master.id}` });
      }
      return { issue: updated, recheckRoundId: round.id, failed };
    }) };
  }
  async holdRun(c: RequestContext, id: string) { const factoryId = requireActiveFactoryId(c); const issue = await this.prisma.qualityIssue.findFirst({ where: { id, tenantId: c.tenantId, factoryId } }); if (!issue) throw new NotFoundException('Issue topilmadi.'); await this.prisma.productionRun.update({ where: { id: issue.productionRunId }, data: { status: ProductionRunStatus.HOLD } }); return { data: { productionRunId: issue.productionRunId, status: 'HOLD' } }; }

  private async ensureTodayRounds(tenantId: string, factoryId: string): Promise<void> {
    const runs = await this.prisma.productionRun.findMany({ where: { tenantId, factoryId, status: { in: ['PLANNED', 'RUNNING', 'HOLD'] } }, include: { productVariant: true, workShift: { include: { inspectionSlots: true } } } });
    const day = new Date(); day.setHours(0, 0, 0, 0);
    for (const run of runs) {
      const spec = await this.prisma.productMeasurementSpecification.findFirst({ where: { tenantId, productId: run.productVariant.productId, status: 'ACTIVE', effectiveFrom: { lte: new Date() } }, orderBy: { version: 'desc' } });
      if (!spec) continue;
      for (const slot of run.workShift.inspectionSlots) {
        const scheduledAt = new Date(day.getTime() + (run.workShift.startMinute + slot.minuteOffset) * 60_000);
        const dedupeKey = `${run.id}:${day.toISOString().slice(0, 10)}:${slot.id}`;
        await this.prisma.inspectionRound.upsert({ where: { tenantId_dedupeKey: { tenantId, dedupeKey } }, update: {}, create: { tenantId, factoryId, machineId: run.machineId, productionRunId: run.id, mechanicEmployeeId: run.mechanicEmployeeId, specificationId: spec.id, scheduleSlotId: slot.id, scheduledAt, dedupeKey } });
      }
    }
  }

  private async machineOrThrow(tenantId: string, factoryId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({ where: { id, tenantId, factoryId, deletedAt: null } });
    if (!machine) throw new NotFoundException('Stanok topilmadi.');
    return machine;
  }
}
