import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeJobRole,
  EmployeeStatus,
  EmployeeWorkProfile,
  MachineWorkRole,
  Prisma,
  ProductionRunStatus,
  WorkerActivitySource,
  CorrectionRequestDomain,
} from '../../prisma/client';
import { sanitizeOperatorText } from '../../common/sanitize-operator-text';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import {
  CreateDefectDto,
  CreateProductionBatchDto,
  CreateStageMovementDto,
  CreateWorkerActivityDto,
  CreateProductionRunDto,
  CreateProductionRunIntakeDto,
  ChangeProductionRunStatusDto,
  ConfigureWarehouseHandoffStageDto,
  CreateCorrectionRequestDto,
  ResolveCorrectionRequestDto,
  ShiftReconciliationDto,
  ShiftReconciliationReasonDto,
} from './production.dto';
import {
  CollectionResponse,
  DefectCreationResponse,
  DefectResponse,
  OperationsBottleneckPriority,
  OperationsStageStatus,
  ProductionBatchCreationResponse,
  ProductionOperationsSummaryResponse,
  StageMovementCreationResponse,
  StageInventoryResponse,
  StageMovementResponse,
  WorkerActivityCreationResponse,
  WorkerActivityResponse,
} from './production.types';

const RECENT_RECORD_LIMIT = 50;
const OPERATIONS_TIME_ZONE_OFFSET = '+05:00';
const OPERATIONS_TREND_DAYS = 7;
const HIGH_STAGE_QUANTITY = 1_000;
const MEDIUM_STAGE_QUANTITY = 500;
const TOP_WORKER_LIMIT = 5;

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getRuns(context: RequestContext) {
    const factoryId = requireActiveFactoryId(context);
    return { data: await this.prisma.productionRun.findMany({
      where: { tenantId: context.tenantId, factoryId },
      include: { machine: true, productVariant: { include: { product: true, color: true } }, operator: true, mechanic: true, workShift: true },
      orderBy: { createdAt: 'desc' }, take: 100,
    }) };
  }

  async createRun(context: RequestContext, dto: CreateProductionRunDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context); const now = new Date();
    return { data: await this.prisma.$transaction(async (tx) => {
      const [machine, variant, operator, shift, assignments, openRun] = await Promise.all([
        tx.machine.findFirst({ where: { id: dto.machineId, tenantId, factoryId, status: 'ACTIVE', deletedAt: null } }),
        tx.productVariant.findFirst({ where: { id: dto.productVariantId, tenantId, deletedAt: null, product: { deletedAt: null } } }),
        tx.employee.findFirst({ where: { id: dto.operatorEmployeeId, tenantId, factoryId, workProfile: EmployeeWorkProfile.MACHINE_OPERATOR, status: EmployeeStatus.ACTIVE, deletedAt: null } }),
        tx.workShift.findFirst({ where: { id: dto.workShiftId, tenantId, factoryId, deletedAt: null } }),
        tx.machineMechanicAssignment.findMany({ where: { tenantId, factoryId, machineId: dto.machineId, workShiftId: dto.workShiftId, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] }, include: { mechanic: true } }),
        tx.productionRun.findFirst({ where: { tenantId, factoryId, machineId: dto.machineId, status: { in: ['PLANNED', 'RUNNING', 'HOLD'] } } }),
      ]);
      if (!machine || !variant || !operator || !shift) throw new BadRequestException('Stanok, mahsulot varianti, operator yoki smena mos emas.');
      if (openRun) throw new ConflictException('Bu stanokda yopilmagan production run mavjud.');
      if (assignments.length !== 1 || assignments[0].mechanic.workProfile !== EmployeeWorkProfile.MECHANIC || assignments[0].mechanic.status !== EmployeeStatus.ACTIVE) throw new ConflictException('Stanok va smena uchun aynan bitta faol mexanik assignment bo‘lishi kerak.');
      const run = await tx.productionRun.create({ data: { tenantId, factoryId, machineId: machine.id, productVariantId: variant.id, operatorEmployeeId: operator.id, mechanicEmployeeId: assignments[0].mechanicId, workShiftId: shift.id, status: ProductionRunStatus.RUNNING, startedAt: now, startedByUserId: context.userId, note: dto.note?.trim() } });
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'PRODUCTION_RUN_STARTED', entityType: 'ProductionRun', entityId: run.id, after: run, metadata: { mechanicAssignmentId: assignments[0].id } });
      return run;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) };
  }

  async changeRunStatus(context: RequestContext, id: string, dto: ChangeProductionRunStatusDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context);
    const run = await this.prisma.productionRun.findFirst({ where: { id, tenantId, factoryId } });
    if (!run) throw new NotFoundException('Production run topilmadi.');
    const allowed: Record<ProductionRunStatus, ProductionRunStatus[]> = {
      PLANNED: ['RUNNING', 'CANCELLED'], RUNNING: ['HOLD', 'STOPPED', 'COMPLETED'], HOLD: ['RUNNING', 'STOPPED', 'CANCELLED'], STOPPED: ['RUNNING', 'COMPLETED'], COMPLETED: [], CANCELLED: [],
    };
    if (!allowed[run.status].includes(dto.status)) throw new ConflictException(`${run.status} dan ${dto.status} ga o‘tish mumkin emas.`);
    // Atomic compare-and-swap: guards against a second concurrent status
    // change (e.g. STOPPED and COMPLETED both fired from RUNNING) silently
    // overwriting the loser's transition instead of failing with a conflict.
    const { count } = await this.prisma.productionRun.updateMany({
      where: { id, tenantId, factoryId, status: run.status },
      data: { status: dto.status, ...(dto.status === 'COMPLETED' || dto.status === 'CANCELLED' ? { endedAt: new Date(), endedByUserId: context.userId } : {}), ...(dto.status === 'RUNNING' && !run.startedAt ? { startedAt: new Date() } : {}) },
    });
    if (count === 0) {
      const current = await this.prisma.productionRun.findFirst({ where: { id, tenantId, factoryId } });
      throw new ConflictException(`${current?.status ?? run.status} dan ${dto.status} ga o‘tish mumkin emas.`);
    }
    return { data: await this.prisma.productionRun.findFirstOrThrow({ where: { id, tenantId, factoryId } }) };
  }

  async createRunIntake(context: RequestContext, runId: string, dto: CreateProductionRunIntakeDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context); const now = new Date();
    const existing = await this.prisma.productionRunIntake.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { batch: true, activities: true } });
    if (existing) {
      if (existing.productionRunId !== runId) throw new ConflictException('Idempotency key boshqa run uchun ishlatilgan.');
      return { data: existing };
    }
    try {
      return { data: await this.prisma.$transaction(async (tx) => {
        const run = await tx.productionRun.findFirst({ where: { id: runId, tenantId, factoryId, status: ProductionRunStatus.RUNNING }, include: { productVariant: true, workShift: true } });
        if (!run) throw new ConflictException('Faqat RUNNING holatdagi run outputi qabul qilinadi.');
        const [firstStage, rates] = await Promise.all([
          tx.productionStage.findFirst({ where: { tenantId, factoryId, deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
          tx.machinePieceRate.findMany({ where: { tenantId, factoryId, productId: run.productVariant.productId, workRole: { in: [MachineWorkRole.MECHANIC, MachineWorkRole.MACHINE_OPERATOR] }, deletedAt: null, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] } }),
        ]);
        if (!firstStage) throw new ConflictException('Birinchi ishlab chiqarish bosqichi topilmadi.');
        const mechanicRate = rates.filter((r) => r.workRole === MachineWorkRole.MECHANIC);
        const operatorRate = rates.filter((r) => r.workRole === MachineWorkRole.MACHINE_OPERATOR);
        if (mechanicRate.length !== 1 || operatorRate.length !== 1) throw new ConflictException('Mexanik va operator uchun aynan bittadan faol machine piece-rate kerak.');
        const batch = await tx.productionBatch.create({ data: { tenantId, factoryId, productVariantId: run.productVariantId, productionRunId: run.id, quantity: dto.quantity, createdByUserId: context.userId } });
        await tx.stageInventory.upsert({ where: { tenantId_factoryId_productionStageId_productVariantId: { tenantId, factoryId, productionStageId: firstStage.id, productVariantId: run.productVariantId } }, create: { tenantId, factoryId, productionStageId: firstStage.id, productVariantId: run.productVariantId, quantity: dto.quantity }, update: { quantity: { increment: dto.quantity } } });
        const movement = await tx.stageMovement.create({ data: { tenantId, factoryId, sourceStageId: firstStage.id, destinationStageId: firstStage.id, productVariantId: run.productVariantId, productionBatchId: batch.id, quantity: dto.quantity, recordedByUserId: context.userId, occurredAt: now, note: dto.note?.trim() } });
        const intake = await tx.productionRunIntake.create({ data: { tenantId, factoryId, productionRunId: run.id, productionBatchId: batch.id, quantity: dto.quantity, idempotencyKey: dto.idempotencyKey, recordedByUserId: context.userId } });
        await tx.workerActivity.createMany({ data: [
          { tenantId, factoryId, employeeId: run.mechanicEmployeeId, productionStageId: firstStage.id, productVariantId: run.productVariantId, workShiftId: run.workShiftId, quantity: dto.quantity, baseSalaryRateAmount: mechanicRate[0].amount, shiftPremiumAmount: 0, salaryRateAmount: mechanicRate[0].amount, workShiftCode: run.workShift.code, activityDate: now, enteredByUserId: context.userId, source: WorkerActivitySource.MACHINE_OUTPUT, productionRunIntakeId: intake.id, machinePieceRateId: mechanicRate[0].id },
          { tenantId, factoryId, employeeId: run.operatorEmployeeId, productionStageId: firstStage.id, productVariantId: run.productVariantId, workShiftId: run.workShiftId, quantity: dto.quantity, baseSalaryRateAmount: operatorRate[0].amount, shiftPremiumAmount: 0, salaryRateAmount: operatorRate[0].amount, workShiftCode: run.workShift.code, activityDate: now, enteredByUserId: context.userId, source: WorkerActivitySource.MACHINE_OUTPUT, productionRunIntakeId: intake.id, machinePieceRateId: operatorRate[0].id },
        ] });
        await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'PRODUCTION_RUN_INTAKE_CREATED', entityType: 'ProductionRunIntake', entityId: intake.id, after: intake, metadata: { batchId: batch.id, stageMovementId: movement.id, mechanicEmployeeId: run.mechanicEmployeeId, operatorEmployeeId: run.operatorEmployeeId } });
        return tx.productionRunIntake.findUniqueOrThrow({ where: { id: intake.id }, include: { batch: true, activities: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.productionRunIntake.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey } }, include: { batch: true, activities: true } });
        if (replay?.productionRunId === runId) return { data: replay };
      }
      throw error;
    }
  }

  async createBatch(
    context: RequestContext,
    dto: CreateProductionBatchDto,
  ): Promise<ProductionBatchCreationResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    if (dto.mechanicEmployeeId && dto.mechanicEmployeeId === dto.machineOperatorEmployeeId) {
      throw new BadRequestException(
        'Mexanik va stanok operatori boshqa-boshqa xodim bo‘lishi kerak.',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const [productVariant, firstStage, mechanic, machineOperator] =
        await Promise.all([
        tx.productVariant.findFirst({
          where: {
            id: dto.productVariantId,
            tenantId,
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: productVariantSelect,
        }),
        tx.productionStage.findFirst({
          where: { tenantId, factoryId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: productionStageSelect,
        }),
        dto.mechanicEmployeeId ? tx.employee.findFirst({
          where: {
            id: dto.mechanicEmployeeId,
            tenantId,
            factoryId,
            status: EmployeeStatus.ACTIVE,
            deletedAt: null,
          },
          select: batchEmployeeSelect,
        }) : Promise.resolve(null),
        dto.machineOperatorEmployeeId ? tx.employee.findFirst({
          where: {
            id: dto.machineOperatorEmployeeId,
            tenantId,
            factoryId,
            status: EmployeeStatus.ACTIVE,
            deletedAt: null,
          },
          select: batchEmployeeSelect,
        }) : Promise.resolve(null),
      ]);

      if (!productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      if (!firstStage) {
        throw new ConflictException(
          'At least one active production stage is required to create a batch.',
        );
      }

      if (dto.mechanicEmployeeId && !mechanic) {
        throw new NotFoundException(
          'Tanlangan mexanik topilmadi yoki faol emas.',
        );
      }

      if (mechanic && mechanic.workProfile !== EmployeeWorkProfile.MECHANIC) {
        throw new ConflictException(
          `«${mechanic.name}» xodimiga Mexanik lavozimi biriktirilmagan.`,
        );
      }

      if (dto.machineOperatorEmployeeId && !machineOperator) {
        throw new NotFoundException(
          'Tanlangan stanok operatori topilmadi yoki faol emas.',
        );
      }

      if (machineOperator && machineOperator.workProfile !== EmployeeWorkProfile.MACHINE_OPERATOR) {
        throw new ConflictException(
          `«${machineOperator.name}» xodimiga Stanok operatori lavozimi biriktirilmagan.`,
        );
      }

      const batch = await tx.productionBatch.create({
        data: {
          tenantId,
          factoryId,
          productVariantId: productVariant.id,
          mechanicEmployeeId: mechanic?.id ?? null,
          machineOperatorEmployeeId: machineOperator?.id ?? null,
          quantity: dto.quantity,
          createdByUserId: context.userId,
        },
        select: productionBatchSelect,
      });

      const stageInventory = await tx.stageInventory.upsert({
        where: {
          tenantId_factoryId_productionStageId_productVariantId: {
            tenantId,
            factoryId,
            productionStageId: firstStage.id,
            productVariantId: productVariant.id,
          },
        },
        create: {
          tenantId,
          factoryId,
          productionStageId: firstStage.id,
          productVariantId: productVariant.id,
          quantity: dto.quantity,
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        select: stageInventorySelect,
      });

      const stageMovement = await tx.stageMovement.create({
        data: {
          tenantId,
          factoryId,
          // Current schema requires sourceStageId. Initial batch intake is
          // represented as first-stage -> first-stage, preserving immutable
          // history without schema churn in this write slice.
          sourceStageId: firstStage.id,
          destinationStageId: firstStage.id,
          productVariantId: productVariant.id,
          productionBatchId: batch.id,
          quantity: dto.quantity,
          recordedByUserId: context.userId,
          occurredAt: now,
          note: dto.note ?? null,
        },
        select: stageMovementSelect,
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'PRODUCTION_BATCH_CREATED',
        entityType: 'ProductionBatch',
        entityId: batch.id,
        after: batch,
        metadata: {
          mechanicEmployeeId: mechanic?.id ?? null,
          machineOperatorEmployeeId: machineOperator?.id ?? null,
          ...(dto.note ? { note: dto.note } : {}),
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STAGE_MOVEMENT_CREATED',
        entityType: 'StageMovement',
        entityId: stageMovement.id,
        after: stageMovement,
        metadata: {
          reason: 'PRODUCTION_BATCH_CREATED',
          stageInventoryId: stageInventory.id,
        },
      });

      return {
        batch,
        stageInventory: mapStageInventoryResponse(stageInventory),
        stageMovement,
      };
    });

    return { data: created };
  }

  async createStageMovement(
    context: RequestContext,
    dto: CreateStageMovementDto,
  ): Promise<StageMovementCreationResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    if (dto.sourceStageId === dto.destinationStageId) {
      throw new ConflictException('Source and destination stages must be different.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const [productVariant, stages] = await Promise.all([
        tx.productVariant.findFirst({
          where: {
            id: dto.productVariantId,
            tenantId,
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: productVariantSelect,
        }),
        tx.productionStage.findMany({
          where: {
            id: { in: [dto.sourceStageId, dto.destinationStageId] },
            tenantId,
            factoryId,
            deletedAt: null,
          },
          select: productionStageSelect,
        }),
      ]);

      if (!productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      const sourceStage = stages.find((stage) => stage.id === dto.sourceStageId);
      const destinationStage = stages.find(
        (stage) => stage.id === dto.destinationStageId,
      );

      if (!sourceStage) {
        throw new NotFoundException('Source production stage not found.');
      }

      if (!destinationStage) {
        throw new NotFoundException('Destination production stage not found.');
      }

      const nextStage = await tx.productionStage.findFirst({
        where: {
          tenantId,
          factoryId,
          deletedAt: null,
          sortOrder: { gt: sourceStage.sortOrder },
        },
        orderBy: { sortOrder: 'asc' },
        select: productionStageSelect,
      });

      if (!nextStage || destinationStage.id !== nextStage.id) {
        throw new ConflictException(
          nextStage
            ? `Mahsulot faqat keyingi «${nextStage.name}» bosqichiga o‘tkazilishi mumkin.`
            : `«${sourceStage.name}» oxirgi ishlab chiqarish bosqichi.`,
        );
      }

      const sourceStageInventoryBefore = await tx.stageInventory.findUnique({
        where: {
          tenantId_factoryId_productionStageId_productVariantId: {
            tenantId,
            factoryId,
            productionStageId: sourceStage.id,
            productVariantId: productVariant.id,
          },
        },
        select: stageInventorySelect,
      });

      if (
        !sourceStageInventoryBefore ||
        sourceStageInventoryBefore.quantity < dto.quantity
      ) {
        throw new ConflictException('Source stage does not have enough quantity.');
      }

      const destinationStageInventoryBefore = await tx.stageInventory.findUnique({
        where: {
          tenantId_factoryId_productionStageId_productVariantId: {
            tenantId,
            factoryId,
            productionStageId: destinationStage.id,
            productVariantId: productVariant.id,
          },
        },
        select: stageInventorySelect,
      });

      const sourceUpdate = await tx.stageInventory.updateMany({
        where: {
          id: sourceStageInventoryBefore.id,
          tenantId,
          factoryId,
          quantity: { gte: dto.quantity },
        },
        data: {
          quantity: { decrement: dto.quantity },
        },
      });

      if (sourceUpdate.count !== 1) {
        throw new ConflictException(
          'Manba bosqichidagi qoldiq o‘zgargan yoki miqdor yetarli emas. Ma’lumotni yangilab, qayta urinib ko‘ring.',
        );
      }

      const sourceStageInventoryAfter = await tx.stageInventory.findUniqueOrThrow({
        where: { id: sourceStageInventoryBefore.id },
        select: stageInventorySelect,
      });

      const destinationStageInventoryAfter = await tx.stageInventory.upsert({
        where: {
          tenantId_factoryId_productionStageId_productVariantId: {
            tenantId,
            factoryId,
            productionStageId: destinationStage.id,
            productVariantId: productVariant.id,
          },
        },
        create: {
          tenantId,
          factoryId,
          productionStageId: destinationStage.id,
          productVariantId: productVariant.id,
          quantity: dto.quantity,
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        select: stageInventorySelect,
      });

      const employeeIds = Array.from(
        new Set((dto.employeeIds ?? []).map((id) => id.trim()).filter(Boolean)),
      );

      if (employeeIds.length === 0) {
        throw new BadRequestException(
          'Kamida bitta ishchi tanlanishi shart (faollik yoziladi).',
        );
      }

      const employees = await tx.employee.findMany({
        where: {
          tenantId,
          factoryId,
          id: { in: employeeIds },
          status: EmployeeStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          workShift: {
            select: { id: true, code: true, name: true, premiumPerPiece: true },
          },
        },
      });

      if (employees.length !== employeeIds.length) {
        throw new NotFoundException(
          'Tanlangan ishchilardan ba’zilari topilmadi yoki nofaol.',
        );
      }

      // Manba bosqichga biriktirilgan ishchilar bo‘lishi shart.
      await this.assertEmployeesAssignedToStage(tx, {
        tenantId,
        factoryId,
        productionStageId: sourceStage.id,
        stageName: sourceStage.name,
        employees,
      });

      const quantityByEmployeeId = this.resolveWorkerQuantities({
        quantity: dto.quantity,
        employees,
        workerShares: dto.workerShares,
      });

      // Manba bosqichda ishlangan: shu bosqich stavkasi bo‘yicha faollik.
      const salaryRate = await this.findActiveSalaryRate(tx, {
        tenantId,
        factoryId,
        productionStageId: sourceStage.id,
        productVariantId: productVariant.id,
        at: now,
      });

      if (!salaryRate) {
        throw new ConflictException(
          `«${sourceStage.name}» bosqichi uchun ishbay stavka yo‘q. Avval Sozlamalar → Stavkalardan qo‘ying.`,
        );
      }

      const note = dto.note
        ? sanitizeOperatorText(dto.note, { maxLength: 500 })
        : null;

      const stageMovement = await tx.stageMovement.create({
        data: {
          tenantId,
          factoryId,
          sourceStageId: sourceStage.id,
          destinationStageId: destinationStage.id,
          productVariantId: productVariant.id,
          quantity: dto.quantity,
          recordedByUserId: context.userId,
          occurredAt: now,
          note: note && note.length > 0 ? note : null,
        },
        select: stageMovementSelect,
      });

      const activityIds: string[] = [];

      for (const employee of employees) {
        const qty = quantityByEmployeeId.get(employee.id) ?? 0;
        if (qty <= 0) continue;
        if (!employee.workShift) {
          throw new ConflictException(
            `«${employee.name}» uchun smena tanlanmagan. Avval Xodimlar bo‘limida smena biriktiring.`,
          );
        }
        const shiftPremium =
          employee.workShift.code === 'NIGHT'
            ? employee.workShift.premiumPerPiece
            : new Prisma.Decimal(0);
        const effectiveRate = salaryRate.amount.plus(shiftPremium);

        const workerActivity = await tx.workerActivity.create({
          data: {
            tenantId,
            factoryId,
            employeeId: employee.id,
            productionStageId: sourceStage.id,
            productVariantId: productVariant.id,
            workShiftId: employee.workShift.id,
            quantity: qty,
            baseSalaryRateAmount: salaryRate.amount,
            shiftPremiumAmount: shiftPremium,
            salaryRateAmount: effectiveRate,
            workShiftCode: employee.workShift.code,
            activityDate: now,
            enteredByUserId: context.userId,
          },
          select: { id: true },
        });
        activityIds.push(workerActivity.id);
      }

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STAGE_MOVEMENT_CREATED',
        entityType: 'StageMovement',
        entityId: stageMovement.id,
        after: stageMovement,
        metadata: {
          employeeIds: employees.map((employee) => employee.id),
          workerShares: employees.map((employee) => ({
            employeeId: employee.id,
            quantity: quantityByEmployeeId.get(employee.id) ?? 0,
            workShiftCode: employee.workShift?.code ?? null,
            baseSalaryRateAmount: salaryRate.amount.toString(),
            shiftPremiumAmount:
              employee.workShift?.code === 'NIGHT'
                ? employee.workShift.premiumPerPiece.toString()
                : '0',
          })),
          workerActivityIds: activityIds,
          salaryRateId: salaryRate.id,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STAGE_INVENTORY_DECREASED',
        entityType: 'StageInventory',
        entityId: sourceStageInventoryAfter.id,
        before: mapStageInventoryResponse(sourceStageInventoryBefore),
        after: mapStageInventoryResponse(sourceStageInventoryAfter),
        metadata: {
          stageMovementId: stageMovement.id,
          quantity: dto.quantity,
        },
      });

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'STAGE_INVENTORY_INCREASED',
        entityType: 'StageInventory',
        entityId: destinationStageInventoryAfter.id,
        before: destinationStageInventoryBefore
          ? mapStageInventoryResponse(destinationStageInventoryBefore)
          : null,
        after: mapStageInventoryResponse(destinationStageInventoryAfter),
        metadata: {
          stageMovementId: stageMovement.id,
          quantity: dto.quantity,
        },
      });

      return {
        sourceStageInventoryBefore: mapStageInventoryResponse(
          sourceStageInventoryBefore,
        ),
        destinationStageInventoryBefore: destinationStageInventoryBefore
          ? mapStageInventoryResponse(destinationStageInventoryBefore)
          : null,
        sourceStageInventory: mapStageInventoryResponse(sourceStageInventoryAfter),
        destinationStageInventory: mapStageInventoryResponse(
          destinationStageInventoryAfter,
        ),
        stageMovement,
        workerActivityCount: activityIds.length,
      };
    });

    return { data: created };
  }

  async createWorkerActivity(
    context: RequestContext,
    dto: CreateWorkerActivityDto,
  ): Promise<WorkerActivityCreationResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const [employee, stage, productVariant] = await Promise.all([
        tx.employee.findFirst({
          where: {
            id: dto.employeeId,
            tenantId,
            factoryId,
            status: EmployeeStatus.ACTIVE,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            status: true,
            workShift: {
              select: { id: true, code: true, name: true, premiumPerPiece: true },
            },
          },
        }),
        tx.productionStage.findFirst({
          where: {
            id: dto.stageId,
            tenantId,
            factoryId,
            deletedAt: null,
          },
          select: productionStageSelect,
        }),
        tx.productVariant.findFirst({
          where: {
            id: dto.productVariantId,
            tenantId,
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: productVariantSelect,
        }),
      ]);

      if (!employee) {
        throw new NotFoundException('Active employee not found.');
      }

      if (!employee.workShift) {
        throw new ConflictException(
          `«${employee.name}» uchun smena tanlanmagan. Avval Xodimlar bo‘limida smena biriktiring.`,
        );
      }

      if (!stage) {
        throw new NotFoundException('Production stage not found.');
      }

      if (!productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      await this.assertEmployeesAssignedToStage(tx, {
        tenantId,
        factoryId,
        productionStageId: stage.id,
        stageName: stage.name,
        employees: [{ id: employee.id, name: employee.name }],
      });

      const salaryRate = await this.findActiveSalaryRate(tx, {
        tenantId,
        factoryId,
        productionStageId: stage.id,
        productVariantId: productVariant.id,
        at: now,
      });

      if (!salaryRate) {
        throw new ConflictException(
          'Active salary rate is required before worker activity can be recorded.',
        );
      }

      const note = dto.note
        ? sanitizeOperatorText(dto.note, { maxLength: 500 })
        : undefined;
      const shiftPremium =
        employee.workShift.code === 'NIGHT'
          ? employee.workShift.premiumPerPiece
          : new Prisma.Decimal(0);
      const effectiveRate = salaryRate.amount.plus(shiftPremium);

      const workerActivity = await tx.workerActivity.create({
        data: {
          tenantId,
          factoryId,
          employeeId: employee.id,
          productionStageId: stage.id,
          productVariantId: productVariant.id,
          workShiftId: employee.workShift.id,
          quantity: dto.quantity,
          baseSalaryRateAmount: salaryRate.amount,
          shiftPremiumAmount: shiftPremium,
          salaryRateAmount: effectiveRate,
          workShiftCode: employee.workShift.code,
          activityDate: now,
          enteredByUserId: context.userId,
        },
        select: workerActivitySelect,
      });

      const response = mapWorkerActivityResponse(workerActivity);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'WORKER_ACTIVITY_CREATED',
        entityType: 'WorkerActivity',
        entityId: workerActivity.id,
        after: response,
        metadata: {
          salaryRateId: salaryRate.id,
          salaryRateScope: salaryRate.productVariantId
            ? 'PRODUCT_VARIANT'
            : 'STAGE',
          workShiftCode: employee.workShift.code,
          baseSalaryRateAmount: salaryRate.amount.toString(),
          shiftPremiumAmount: shiftPremium.toString(),
          ...(note ? { note } : {}),
        },
      });

      return response;
    });

    return { data: created };
  }

  async createDefect(
    context: RequestContext,
    dto: CreateDefectDto,
  ): Promise<DefectCreationResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const [employee, stage, productVariant] = await Promise.all([
        dto.employeeId
          ? tx.employee.findFirst({
              where: {
                id: dto.employeeId,
                tenantId,
                factoryId,
                status: EmployeeStatus.ACTIVE,
                deletedAt: null,
              },
              select: { id: true },
            })
          : Promise.resolve(null),
        dto.stageId
          ? tx.productionStage.findFirst({
              where: {
                id: dto.stageId,
                tenantId,
                factoryId,
                deletedAt: null,
              },
              select: { id: true },
            })
          : Promise.resolve(null),
        dto.productVariantId
          ? tx.productVariant.findFirst({
              where: {
                id: dto.productVariantId,
                tenantId,
                deletedAt: null,
                product: { deletedAt: null },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (dto.employeeId && !employee) {
        throw new NotFoundException('Active employee not found.');
      }

      if (dto.stageId && !stage) {
        throw new NotFoundException('Production stage not found.');
      }

      if (dto.productVariantId && !productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      const reason = sanitizeOperatorText(dto.reason, {
        maxLength: 500,
        minLength: 3,
      });
      if (reason.length < 3) {
        throw new BadRequestException(
          'Brak sababi kamida 3 ta belgidan iborat bo‘lishi kerak (HTML belgilar olib tashlanadi).',
        );
      }

      const defect = await tx.defect.create({
        data: {
          tenantId,
          factoryId,
          employeeId: employee?.id ?? null,
          productionStageId: stage?.id ?? null,
          productVariantId: productVariant?.id ?? null,
          quantity: dto.quantity,
          reason,
          reportedByUserId: context.userId,
          detectedAt: now,
        },
        select: defectSelect,
      });
      const response = mapDefectResponse(defect);

      await this.auditService.createWithTransaction(tx, {
        tenantId,
        factoryId,
        userId: context.userId,
        action: 'DEFECT_CREATED',
        entityType: 'Defect',
        entityId: defect.id,
        after: response,
      });

      return response;
    });

    return { data: created };
  }

  async getStageInventory(
    context: RequestContext,
  ): Promise<CollectionResponse<StageInventoryResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const inventory = await this.prisma.stageInventory.findMany({
      where: { tenantId, factoryId },
      orderBy: { productionStage: { sortOrder: 'asc' } },
      select: {
        id: true,
        quantity: true,
        updatedAt: true,
        productionStage: { select: { id: true, name: true, sortOrder: true } },
        productVariant: {
          select: {
            id: true,
            product: { select: { id: true, name: true, code: true } },
            color: { select: { id: true, name: true, code: true } },
            material: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return {
      data: inventory.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        updatedAt: item.updatedAt,
        stage: item.productionStage,
        productVariant: item.productVariant,
      })),
    };
  }

  async getRecentMovements(
    context: RequestContext,
  ): Promise<CollectionResponse<StageMovementResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const movements = await this.prisma.stageMovement.findMany({
      where: { tenantId, factoryId },
      orderBy: { occurredAt: 'desc' },
      take: RECENT_RECORD_LIMIT,
      select: {
        id: true,
        quantity: true,
        occurredAt: true,
        note: true,
        sourceStage: { select: { id: true, name: true, sortOrder: true } },
        destinationStage: { select: { id: true, name: true, sortOrder: true } },
        productVariant: {
          select: {
            id: true,
            product: { select: { id: true, name: true, code: true } },
            color: { select: { id: true, name: true, code: true } },
            material: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, name: true, code: true } },
          },
        },
        productionBatch: {
          select: {
            id: true,
            quantity: true,
            mechanic: { select: { id: true, name: true } },
            machineOperator: { select: { id: true, name: true } },
          },
        },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return {
      data: movements.map((movement) => ({
        id: movement.id,
        quantity: movement.quantity,
        occurredAt: movement.occurredAt,
        note: movement.note,
        sourceStage: movement.sourceStage,
        destinationStage: movement.destinationStage,
        productVariant: movement.productVariant,
        productionBatch: movement.productionBatch,
        recordedBy: movement.recordedBy,
      })),
    };
  }

  async getWorkerActivities(
    context: RequestContext,
  ): Promise<CollectionResponse<WorkerActivityResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const activities = await this.prisma.workerActivity.findMany({
      where: { tenantId, factoryId },
      orderBy: { activityDate: 'desc' },
      take: RECENT_RECORD_LIMIT,
      select: {
        id: true,
        quantity: true,
        baseSalaryRateAmount: true,
        shiftPremiumAmount: true,
        salaryRateAmount: true,
        workShiftCode: true,
        activityDate: true,
        employee: { select: { id: true, name: true, status: true } },
        productionStage: { select: { id: true, name: true, sortOrder: true } },
        productVariant: {
          select: {
            id: true,
            product: { select: { id: true, name: true, code: true } },
            color: { select: { id: true, name: true, code: true } },
            material: { select: { id: true, name: true, code: true } },
            season: { select: { id: true, name: true, code: true } },
          },
        },
        enteredBy: { select: { id: true, name: true } },
      },
    });

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        quantity: activity.quantity,
        baseSalaryRateAmount: activity.baseSalaryRateAmount.toString(),
        shiftPremiumAmount: activity.shiftPremiumAmount.toString(),
        salaryRateAmount: activity.salaryRateAmount.toString(),
        workShiftCode: activity.workShiftCode,
        activityDate: activity.activityDate,
        employee: activity.employee,
        stage: activity.productionStage,
        productVariant: activity.productVariant,
        enteredBy: activity.enteredBy,
      })),
    };
  }

  async getDefects(
    context: RequestContext,
  ): Promise<CollectionResponse<DefectResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const defects = await this.prisma.defect.findMany({
      where: { tenantId, factoryId },
      orderBy: { detectedAt: 'desc' },
      take: RECENT_RECORD_LIMIT,
      select: defectSelect,
    });

    return { data: defects.map(mapDefectResponse) };
  }

  /**
   * Backend-owned operations projection for the manager dashboard. This keeps
   * stage totals, activity totals, and bottleneck classification out of the
   * frontend, where business-critical values must not be calculated.
   */
  async getOperationsSummary(
    context: RequestContext,
  ): Promise<ProductionOperationsSummaryResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const todayKey = this.getTashkentDateKey(new Date());
    const trendDateKeys = this.getRecentTashkentDateKeys(todayKey);
    const trendStart = this.getTashkentDayStart(trendDateKeys[0]);
    const trendEnd = this.getTashkentDayStart(
      this.addDaysToTashkentDate(todayKey, 1),
    );

    const [stages, recentActivities] = await this.prisma.$transaction([
      this.prisma.productionStage.findMany({
        where: { tenantId, factoryId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          sortOrder: true,
          stageInventories: { select: { quantity: true } },
        },
      }),
      this.prisma.workerActivity.findMany({
        where: {
          tenantId,
          factoryId,
          activityDate: { gte: trendStart, lt: trendEnd },
        },
        select: {
          quantity: true,
          salaryRateAmount: true,
          activityDate: true,
          employee: { select: { id: true, name: true } },
          productionStage: { select: { id: true, name: true } },
        },
      }),
    ]);

    const stageTotals = stages.map((stage) => {
      const quantity = stage.stageInventories.reduce(
        (total, inventory) => total + inventory.quantity,
        0,
      );
      const status = this.getStageStatus(quantity);

      return {
        stageId: stage.id,
        stageName: stage.name,
        sortOrder: stage.sortOrder,
        quantity,
        status,
        isHighQuantity: status === 'HIGH',
      };
    });

    const totalInProgress = stageTotals.reduce(
      (total, stage) => total + stage.quantity,
      0,
    );
    const busiestStage = stageTotals.reduce<(typeof stageTotals)[number] | null>(
      (currentBusiest, stage) =>
        !currentBusiest || stage.quantity > currentBusiest.quantity
          ? stage
          : currentBusiest,
      null,
    );

    const todayActivities = recentActivities.filter(
      (activity) => this.getTashkentDateKey(activity.activityDate) === todayKey,
    );
    const todayProduction = todayActivities.reduce(
      (total, activity) => total + activity.quantity,
      0,
    );
    const activeWorkers = new Set(
      todayActivities.map((activity) => activity.employee.id),
    ).size;

    const topWorkerGroups = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        stageName: string;
        quantity: number;
        amount: Prisma.Decimal;
      }
    >();

    for (const activity of todayActivities) {
      const key = `${activity.employee.id}:${activity.productionStage.id}`;
      const existing = topWorkerGroups.get(key);
      const amount = activity.salaryRateAmount.mul(activity.quantity);

      if (existing) {
        existing.quantity += activity.quantity;
        existing.amount = existing.amount.plus(amount);
        continue;
      }

      topWorkerGroups.set(key, {
        employeeId: activity.employee.id,
        employeeName: activity.employee.name,
        stageName: activity.productionStage.name,
        quantity: activity.quantity,
        amount,
      });
    }

    const trendTotals = new Map(trendDateKeys.map((date) => [date, 0]));
    for (const activity of recentActivities) {
      const dateKey = this.getTashkentDateKey(activity.activityDate);
      trendTotals.set(dateKey, (trendTotals.get(dateKey) ?? 0) + activity.quantity);
    }

    return {
      data: {
        kpis: {
          todayProduction: String(todayProduction),
          totalInProgress: String(totalInProgress),
          busiestStageName:
            busiestStage && busiestStage.quantity > 0
              ? busiestStage.stageName
              : null,
          activeWorkers: String(activeWorkers),
        },
        stageTotals: stageTotals.map((stage) => ({
          ...stage,
          quantity: String(stage.quantity),
        })),
        bottlenecks: stageTotals
          .filter((stage) => stage.quantity >= MEDIUM_STAGE_QUANTITY)
          .map((stage) => ({
            stageId: stage.stageId,
            stageName: stage.stageName,
            quantity: String(stage.quantity),
            priority: this.getBottleneckPriority(stage.quantity),
          }))
          .sort((left, right) => Number(right.quantity) - Number(left.quantity)),
        topWorkers: Array.from(topWorkerGroups.values())
          .sort(
            (left, right) =>
              right.quantity - left.quantity || right.amount.comparedTo(left.amount),
          )
          .slice(0, TOP_WORKER_LIMIT)
          .map((worker) => ({
            employeeId: worker.employeeId,
            employeeName: worker.employeeName,
            stageName: worker.stageName,
            quantity: String(worker.quantity),
            amount: worker.amount.toString(),
          })),
        trend: trendDateKeys.map((date) => ({
          date,
          quantity: String(trendTotals.get(date) ?? 0),
        })),
        // Defect and approval attention rules need their own approved policy.
        attention: [],
      },
    };
  }

  async getWarehouseHandoffStage(context: RequestContext) {
    const factoryId = requireActiveFactoryId(context);
    const factory = await this.prisma.factory.findFirst({
      where: { id: factoryId, tenantId: context.tenantId, deletedAt: null },
      select: { warehouseHandoffStage: { select: { id: true, name: true, sortOrder: true, deletedAt: true } } },
    });
    if (!factory) throw new NotFoundException('Factory topilmadi.');
    return { data: factory.warehouseHandoffStage };
  }

  async configureWarehouseHandoffStage(context: RequestContext, dto: ConfigureWarehouseHandoffStageDto) {
    this.assertManager(context, 'Omborga topshirish bosqichini sozlash');
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const stage = await this.prisma.productionStage.findFirst({
      where: { id: dto.productionStageId, tenantId, factoryId, deletedAt: null },
      select: { id: true, name: true, sortOrder: true },
    });
    if (!stage) throw new BadRequestException('Tanlangan faol bosqich ushbu fabrikaga tegishli emas.');
    const before = await this.prisma.factory.findUnique({ where: { id: factoryId }, select: { warehouseHandoffStageId: true } });
    await this.prisma.$transaction(async (tx) => {
      await tx.factory.update({ where: { id: factoryId }, data: { warehouseHandoffStageId: stage.id } });
      await this.auditService.createWithTransaction(tx, {
        tenantId, factoryId, userId: context.userId,
        action: 'WAREHOUSE_HANDOFF_STAGE_CONFIGURED', entityType: 'Factory', entityId: factoryId,
        before, after: { warehouseHandoffStageId: stage.id },
      });
    });
    return { data: stage };
  }

  async getShiftReconciliations(context: RequestContext) {
    const factoryId = requireActiveFactoryId(context);
    return { data: await this.prisma.shiftReconciliation.findMany({
      where: { tenantId: context.tenantId, factoryId },
      include: { workShift: { select: { id: true, name: true, code: true } } },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }], take: 100,
    }) };
  }

  async submitShiftReconciliation(context: RequestContext, dto: ShiftReconciliationDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context);
    const workDate = this.parseWorkDate(dto.workDate);
    const readiness = await this.evaluateShiftReadiness(tenantId, factoryId, dto.workShiftId, workDate);
    if (readiness.blockers.length) throw new ConflictException('Smena topshirishga tayyor emas. To\u2018xtatadigan muammolarni bartaraf qiling.');
    return { data: await this.prisma.$transaction(async (tx) => {
      const existing = await tx.shiftReconciliation.findUnique({ where: { tenantId_factoryId_workShiftId_workDate: { tenantId, factoryId, workShiftId: dto.workShiftId, workDate } } });
      if (existing?.status === 'ACCEPTED') throw new ConflictException('Qabul qilingan smenani qayta ochib bo‘lmaydi.');
      if (existing?.status === 'READY_FOR_HANDOVER') return { ...existing, readiness };
      let record;
      if (!existing) {
        record = await tx.shiftReconciliation.create({
          data: { tenantId, factoryId, workShiftId: dto.workShiftId, workDate, status: 'READY_FOR_HANDOVER', submittedByUserId: context.userId, submittedAt: new Date() },
        });
      } else {
        // Compare-and-swap: re-checks status != ACCEPTED at write time, so an
        // accept that lands between our read above and this write can't be
        // silently reopened back to READY_FOR_HANDOVER.
        const { count } = await tx.shiftReconciliation.updateMany({
          where: { id: existing.id, tenantId, factoryId, status: { not: 'ACCEPTED' } },
          data: { status: 'READY_FOR_HANDOVER', submittedByUserId: context.userId, submittedAt: new Date(), returnReason: null },
        });
        if (count === 0) throw new ConflictException('Qabul qilingan smenani qayta ochib bo‘lmaydi.');
        record = await tx.shiftReconciliation.findUniqueOrThrow({ where: { id: existing.id } });
      }
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'SHIFT_RECONCILIATION_SUBMITTED', entityType: 'ShiftReconciliation', entityId: record.id, after: record, metadata: readiness });
      return { ...record, readiness };
    }) };
  }

  async returnShiftReconciliation(context: RequestContext, dto: ShiftReconciliationReasonDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context); const workDate = this.parseWorkDate(dto.workDate);
    const existing = await this.prisma.shiftReconciliation.findUnique({ where: { tenantId_factoryId_workShiftId_workDate: { tenantId, factoryId, workShiftId: dto.workShiftId, workDate } } });
    if (!existing || existing.status !== 'READY_FOR_HANDOVER') throw new ConflictException('Faqat topshirishga tayyor smena tuzatishga qaytariladi.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.shiftReconciliation.updateMany({ where: { id: existing.id, tenantId, factoryId, status: 'READY_FOR_HANDOVER' }, data: { status: 'OPEN', returnedByUserId: context.userId, returnedAt: new Date(), returnReason: dto.reason } });
      if (changed.count !== 1) throw new ConflictException('Smena holati boshqa foydalanuvchi tomonidan o‘zgartirilgan.');
      const record = await tx.shiftReconciliation.findUniqueOrThrow({ where: { id: existing.id } });
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'SHIFT_RECONCILIATION_RETURNED', entityType: 'ShiftReconciliation', entityId: existing.id, before: existing, after: record, metadata: { reason: dto.reason } });
      return record;
    });
    return { data: updated };
  }

  async acceptShiftReconciliation(context: RequestContext, dto: ShiftReconciliationReasonDto) {
    this.assertManager(context, 'Smenani qabul qilish');
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context); const workDate = this.parseWorkDate(dto.workDate);
    const readiness = await this.evaluateShiftReadiness(tenantId, factoryId, dto.workShiftId, workDate);
    if (readiness.blockers.length) throw new ConflictException('Smena qabul qilishga tayyor emas. To\u2018xtatadigan muammolarni bartaraf qiling.');
    const existing = await this.prisma.shiftReconciliation.findUnique({ where: { tenantId_factoryId_workShiftId_workDate: { tenantId, factoryId, workShiftId: dto.workShiftId, workDate } } });
    if (!existing || existing.status !== 'READY_FOR_HANDOVER') throw new ConflictException('Smena avval topshirishga tayyor holatiga o‘tkazilishi kerak.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.shiftReconciliation.updateMany({ where: { id: existing.id, tenantId, factoryId, status: 'READY_FOR_HANDOVER' }, data: { status: 'ACCEPTED', acceptedByUserId: context.userId, acceptedAt: new Date(), warningAcknowledgment: readiness.warnings.length ? dto.reason : null } });
      if (changed.count !== 1) throw new ConflictException('Smena holati boshqa foydalanuvchi tomonidan o‘zgartirilgan.');
      const record = await tx.shiftReconciliation.findUniqueOrThrow({ where: { id: existing.id } });
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'SHIFT_RECONCILIATION_ACCEPTED', entityType: 'ShiftReconciliation', entityId: existing.id, before: existing, after: record, metadata: { readiness, warningAcknowledgment: readiness.warnings.length ? dto.reason : null } });
      return record;
    });
    return { data: { ...updated, readiness } };
  }

  async getCorrectionRequests(context: RequestContext) {
    if (!context.permissions.includes('production.view') && !context.permissions.includes('finance.view')) {
      throw new ForbiddenException('Tuzatish so‘rovlarini ko‘rish uchun ruxsat yetarli emas.');
    }
    const factoryId = requireActiveFactoryId(context);
    const records = await this.prisma.correctionRequest.findMany({ where: { tenantId: context.tenantId, factoryId }, orderBy: { requestedAt: 'desc' }, take: 100 });
    return { data: await Promise.all(records.map((record) => this.enrichCorrectionRequest(record))) };
  }

  async createCorrectionRequest(context: RequestContext, dto: CreateCorrectionRequestDto) {
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context);
    this.assertCorrectionPermission(context, dto.domain);
    await this.assertCorrectionSourceExists(tenantId, factoryId, dto.domain, dto.sourceRecordId);
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.correctionRequest.create({ data: { tenantId, factoryId, domain: dto.domain, sourceRecordId: dto.sourceRecordId, reason: dto.reason, requestedByUserId: context.userId } });
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'CORRECTION_REQUEST_CREATED', entityType: 'CorrectionRequest', entityId: created.id, after: created });
      return created;
    });
    return { data: await this.enrichCorrectionRequest(record) };
  }

  async resolveCorrectionRequest(context: RequestContext, id: string, dto: ResolveCorrectionRequestDto) {
    this.assertManager(context, 'Tuzatish so‘rovini yopish');
    const tenantId = context.tenantId; const factoryId = requireActiveFactoryId(context);
    const existing = await this.prisma.correctionRequest.findFirst({ where: { id, tenantId, factoryId } });
    if (!existing) throw new NotFoundException('Tuzatish so‘rovi topilmadi.');
    if (existing.status === 'RESOLVED') throw new ConflictException('Tuzatish so‘rovi allaqachon yopilgan.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.correctionRequest.updateMany({ where: { id, tenantId, factoryId, status: 'OPEN' }, data: { status: 'RESOLVED', resolvedByUserId: context.userId, resolvedAt: new Date(), resolutionNote: dto.resolutionNote } });
      if (changed.count !== 1) throw new ConflictException('Tuzatish so‘rovi boshqa foydalanuvchi tomonidan yopilgan.');
      const record = await tx.correctionRequest.findUniqueOrThrow({ where: { id } });
      await this.auditService.createWithTransaction(tx, { tenantId, factoryId, userId: context.userId, action: 'CORRECTION_REQUEST_RESOLVED', entityType: 'CorrectionRequest', entityId: id, before: existing, after: record });
      return record;
    });
    return { data: await this.enrichCorrectionRequest(updated) };
  }

  private async enrichCorrectionRequest(record: { id: string; tenantId: string; factoryId: string; domain: CorrectionRequestDomain; sourceRecordId: string; reason: string; status: string; requestedByUserId: string; requestedAt: Date; resolvedByUserId: string | null; resolvedAt: Date | null; resolutionNote: string | null }) {
    const [requester, resolver] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: record.requestedByUserId, tenantId: record.tenantId }, select: { id: true, name: true } }),
      record.resolvedByUserId ? this.prisma.user.findFirst({ where: { id: record.resolvedByUserId, tenantId: record.tenantId }, select: { id: true, name: true } }) : null,
    ]);
    let source: { title: string; details: Array<{ label: string; value: string }> } = { title: 'Asl yozuv', details: [] };
    if (record.domain === CorrectionRequestDomain.PRODUCTION_MOVEMENT) {
      const item = await this.prisma.stageMovement.findFirst({ where: { id: record.sourceRecordId, tenantId: record.tenantId, factoryId: record.factoryId }, include: { sourceStage: true, destinationStage: true, productVariant: { include: { product: true, color: true } } } });
      if (item) source = { title: `${item.sourceStage.name} → ${item.destinationStage.name}`, details: [{ label: 'Mahsulot', value: `${item.productVariant.product.name} · ${item.productVariant.color.name}` }, { label: 'Miqdor', value: `${item.quantity} dona` }, { label: 'Vaqt', value: item.occurredAt.toISOString() }] };
    } else if (record.domain === CorrectionRequestDomain.WORKER_ACTIVITY) {
      const item = await this.prisma.workerActivity.findFirst({ where: { id: record.sourceRecordId, tenantId: record.tenantId, factoryId: record.factoryId }, include: { employee: true, productionStage: true, productVariant: { include: { product: true, color: true } } } });
      if (item) source = { title: `${item.employee.name} · ${item.productionStage.name}`, details: [{ label: 'Mahsulot', value: `${item.productVariant.product.name} · ${item.productVariant.color.name}` }, { label: 'Miqdor', value: `${item.quantity} dona` }, { label: 'Sana', value: item.activityDate.toISOString() }] };
    } else {
      const item = await this.prisma.supplierPayment.findFirst({ where: { id: record.sourceRecordId, tenantId: record.tenantId, allocations: { some: { purchase: { factoryId: record.factoryId } } } }, include: { supplier: true } });
      if (item) source = { title: `${item.supplier.name} to‘lovi`, details: [{ label: 'Miqdor', value: `${item.amount.toString()} so‘m` }, { label: 'Usul', value: item.method }, { label: 'Sana', value: item.paymentDate.toISOString() }] };
    }
    return { ...record, requester, resolver, source };
  }

  async getShiftReadiness(context: RequestContext, dto: ShiftReconciliationDto) {
    const factoryId = requireActiveFactoryId(context);
    return { data: await this.evaluateShiftReadiness(context.tenantId, factoryId, dto.workShiftId, this.parseWorkDate(dto.workDate)) };
  }

  async getLookupWorkShifts(context: RequestContext) {
    const factoryId = requireActiveFactoryId(context);
    return { data: await this.prisma.workShift.findMany({
      where: { tenantId: context.tenantId, factoryId, deletedAt: null },
      select: { id: true, code: true, name: true }, orderBy: { name: 'asc' },
    }) };
  }

  async getShiftContext(context: RequestContext) {
    const factoryId = requireActiveFactoryId(context);
    const user = await this.prisma.user.findFirst({
      where: { id: context.userId, tenantId: context.tenantId },
      select: { employeeId: true },
    });
    const employee = user?.employeeId ? await this.prisma.employee.findFirst({ where: { id: user.employeeId, tenantId: context.tenantId, factoryId }, select: { workShift: { select: { id: true, code: true, name: true, factoryId: true, deletedAt: true } } } }) : null;
    const shift = employee?.workShift;
    const currentWorkShift = shift && !shift.deletedAt && shift.factoryId === factoryId
      ? { id: shift.id, code: shift.code, name: shift.name }
      : null;
    return { data: { currentWorkShift, message: currentWorkShift ? null : 'Akkauntingizga faol smena biriktirilmagan. Davom etish uchun smenani tanlang.' } };
  }

  private async evaluateShiftReadiness(tenantId: string, factoryId: string, workShiftId: string, workDate: Date) {
    const shift = await this.prisma.workShift.findFirst({ where: { id: workShiftId, tenantId, factoryId, deletedAt: null } });
    if (!shift) throw new BadRequestException('Smena ushbu fabrikaga tegishli emas.');
    const factory = await this.prisma.factory.findFirst({ where: { id: factoryId, tenantId }, select: { warehouseHandoffStage: { select: { id: true, deletedAt: true } } } });
    const checks: Array<{ code: string; label: string; status: 'READY' | 'BLOCKER' | 'WARNING'; detail: string; action: string }> = [];
    const add = (code: string, label: string, status: 'READY' | 'BLOCKER' | 'WARNING', detail: string, action: string) => checks.push({ code, label, status, detail, action });
    const handoffReady = Boolean(factory?.warehouseHandoffStage && !factory.warehouseHandoffStage.deletedAt);
    add('WAREHOUSE_HANDOFF_CONFIGURED', 'Omborga topshirish bosqichi', handoffReady ? 'READY' : 'BLOCKER', handoffReady ? 'Bosqich sozlangan.' : 'Omborga topshirish bosqichi sozlanmagan.', handoffReady ? 'Amal talab qilinmaydi.' : 'Manager sozlamadan omborga topshirish bosqichini tanlashi kerak.');
    const [openRuns, openMovementCorrections] = await Promise.all([
      this.prisma.productionRun.count({ where: { tenantId, factoryId, workShiftId, status: { in: ['PLANNED', 'RUNNING', 'STOPPED', 'HOLD'] } } }),
      this.prisma.correctionRequest.count({ where: { tenantId, factoryId, domain: 'PRODUCTION_MOVEMENT', status: 'OPEN' } }),
    ]);
    add('OPEN_PRODUCTION_RUNS', 'Ochiq ishlab chiqarish jarayonlari', openRuns ? 'BLOCKER' : 'READY', openRuns ? `Yopilmagan jarayonlar soni: ${openRuns}.` : 'Barcha jarayonlar yopilgan.', openRuns ? 'Jarayonlarni yakunlang yoki bekor qiling.' : 'Amal talab qilinmaydi.');
    add('PRODUCTION_QUANTITY_CONSISTENCY', 'Ishlab chiqarish miqdori', openMovementCorrections ? 'BLOCKER' : 'READY', openMovementCorrections ? `Ochiq tuzatish so‘rovlari soni: ${openMovementCorrections}.` : 'Ochiq miqdor tuzatish so‘rovi yo‘q.', openMovementCorrections ? 'Manager bilan tuzatish so‘rovlarini yoping.' : 'Amal talab qilinmaydi.');
    if (factory?.warehouseHandoffStage) {
      const waiting = await this.prisma.stageInventory.aggregate({ where: { tenantId, factoryId, productionStageId: factory.warehouseHandoffStage.id, quantity: { gt: 0 } }, _sum: { quantity: true } });
      const quantity = waiting._sum.quantity ?? 0;
      add('WAREHOUSE_RECEIPT_COMPLETE', 'Tayyor mahsulotni omborga topshirish', quantity > 0 ? 'BLOCKER' : 'READY', quantity > 0 ? `Ombor qabul qilmagan tayyor mahsulot: ${quantity} dona.` : 'Topshirilishi kerak bo‘lgan tayyor mahsulot qolmagan.', quantity > 0 ? 'Ombor qabulini yakunlang.' : 'Amal talab qilinmaydi.');
    }
    const nextDay = new Date(workDate); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const intakes = await this.prisma.productionRunIntake.findMany({ where: { tenantId, productionRun: { factoryId, workShiftId }, createdAt: { gte: workDate, lt: nextDay } }, select: { id: true, activities: { select: { id: true } } } });
    const missingRequiredActivity = intakes.filter((intake) => intake.activities.length < 2).length;
    add('REQUIRED_WORKER_ACTIVITY', 'Majburiy ishchi faoliyati', missingRequiredActivity ? 'BLOCKER' : 'READY', missingRequiredActivity ? `Faoliyati to‘liq yozilmagan stanok qabullari: ${missingRequiredActivity}.` : 'Majburiy faoliyat yozuvlari to‘liq.', missingRequiredActivity ? 'Stanok qabullaridagi ishchi faoliyatini to‘ldiring.' : 'Amal talab qilinmaydi.');
    const defectCount = await this.prisma.defect.count({ where: { tenantId, factoryId, detectedAt: { gte: workDate, lt: nextDay } } });
    add('DEFECT_REVIEW', 'Nuqsonlar nazorati', defectCount ? 'WARNING' : 'READY', defectCount ? `Shu kundagi nuqson yozuvlari: ${defectCount}. Tizim ularning yopilganini ishonchli aniqlay olmaydi.` : 'Shu kunda nuqson yozuvi yo‘q.', defectCount ? 'Manager nuqsonlarni tekshirib, sabab bilan tasdiqlaydi.' : 'Amal talab qilinmaydi.');
    return { checks, blockers: checks.filter((item) => item.status === 'BLOCKER'), warnings: checks.filter((item) => item.status === 'WARNING'), ready: checks.filter((item) => item.status === 'READY') };
  }

  private parseWorkDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Sana YYYY-MM-DD formatida bo‘lishi kerak.');
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Sana noto‘g‘ri.');
    return date;
  }

  private assertManager(context: RequestContext, action: string) {
    if (!context.roles.includes('Manager')) throw new ForbiddenException(`${action} uchun Manager roli talab qilinadi.`);
  }

  private assertCorrectionPermission(context: RequestContext, domain: CorrectionRequestDomain) {
    const required = domain === CorrectionRequestDomain.SUPPLIER_PAYMENT ? 'finance.write' : 'production.write';
    if (!context.permissions.includes(required)) throw new ForbiddenException('Bu tuzatish so‘rovini yaratish uchun ruxsat yetarli emas.');
  }

  private async assertCorrectionSourceExists(tenantId: string, factoryId: string, domain: CorrectionRequestDomain, id: string) {
    const exists = domain === CorrectionRequestDomain.PRODUCTION_MOVEMENT
      ? await this.prisma.stageMovement.findFirst({ where: { id, tenantId, factoryId }, select: { id: true } })
      : domain === CorrectionRequestDomain.WORKER_ACTIVITY
        ? await this.prisma.workerActivity.findFirst({ where: { id, tenantId, factoryId }, select: { id: true } })
        : await this.prisma.supplierPayment.findFirst({ where: { id, tenantId, allocations: { some: { purchase: { factoryId } } } }, select: { id: true } });
    if (!exists) throw new NotFoundException('Asl yozuv ushbu fabrika va tenant doirasida topilmadi.');
  }


  private getStageStatus(quantity: number): OperationsStageStatus {
    if (quantity >= HIGH_STAGE_QUANTITY) {
      return 'HIGH';
    }

    if (quantity >= MEDIUM_STAGE_QUANTITY) {
      return 'ATTENTION';
    }

    return 'NORMAL';
  }

  private getBottleneckPriority(
    quantity: number,
  ): OperationsBottleneckPriority {
    if (quantity >= HIGH_STAGE_QUANTITY) {
      return 'HIGH';
    }

    if (quantity >= MEDIUM_STAGE_QUANTITY) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private getTashkentDateKey(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));

    return `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')}`;
  }

  private getRecentTashkentDateKeys(todayKey: string): string[] {
    return Array.from({ length: OPERATIONS_TREND_DAYS }, (_, index) =>
      this.addDaysToTashkentDate(todayKey, index - (OPERATIONS_TREND_DAYS - 1)),
    );
  }

  private addDaysToTashkentDate(dateKey: string, days: number): string {
    const date = new Date(`${dateKey}T00:00:00${OPERATIONS_TIME_ZONE_OFFSET}`);
    date.setUTCDate(date.getUTCDate() + days);

    return this.getTashkentDateKey(date);
  }

  private getTashkentDayStart(dateKey: string): Date {
    return new Date(`${dateKey}T00:00:00${OPERATIONS_TIME_ZONE_OFFSET}`);
  }

  /**
   * Active workers + stage assignments for production forms (production.view).
   */
  async getLookupEmployees(context: RequestContext) {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        factoryId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        jobRole: true,
        workProfile: true,
        workShift: {
          select: { id: true, code: true, name: true },
        },
        stageAssignments: {
          select: {
            productionStage: {
              select: { id: true, name: true, sortOrder: true },
            },
          },
          orderBy: { productionStage: { sortOrder: 'asc' } },
        },
      },
    });

    return {
      data: employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        status: employee.status,
        jobRole: employee.jobRole,
        workProfile: employee.workProfile,
        workShift: employee.workShift,
        stages: employee.stageAssignments.map((assignment) => ({
          id: assignment.productionStage.id,
          name: assignment.productionStage.name,
          sortOrder: assignment.productionStage.sortOrder,
        })),
      })),
    };
  }

  /**
   * Active product variants for production forms (production.view).
   */
  async getLookupProductVariants(context: RequestContext) {
    const tenantId = context.tenantId;
    requireActiveFactoryId(context);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        deletedAt: null,
        product: { deletedAt: null },
      },
      orderBy: [{ product: { name: 'asc' } }, { createdAt: 'asc' }],
      select: productVariantSelect,
    });

    return {
      data: variants.map((variant) => ({
        id: variant.id,
        product: variant.product,
        color: variant.color,
        material: variant.material,
        season: variant.season,
        label: `${variant.product.name} · ${variant.color.name} · ${variant.material.name} · ${variant.season.name}`,
      })),
    };
  }

  /**
   * Ishchi manba bosqichga biriktirilgan bo‘lishi shart (payroll aniqlik).
   */
  private async assertEmployeesAssignedToStage(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      factoryId: string;
      productionStageId: string;
      stageName: string;
      employees: Array<{ id: string; name: string }>;
    },
  ): Promise<void> {
    const employeeIds = input.employees.map((employee) => employee.id);
    const assignments = await tx.employeeStageAssignment.findMany({
      where: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        productionStageId: input.productionStageId,
        employeeId: { in: employeeIds },
      },
      select: { employeeId: true },
    });
    const assigned = new Set(assignments.map((row) => row.employeeId));
    const missing = input.employees.filter((employee) => !assigned.has(employee.id));

    if (missing.length > 0) {
      const names = missing.map((employee) => employee.name).join(', ');
      throw new BadRequestException(
        `«${input.stageName}» bosqichiga biriktirilmagan ishchi(lar): ${names}. Avval Xodimlar bo‘limida bosqich biriktiring.`,
      );
    }
  }

  /**
   * workerShares yuborilsa — alohida miqdorlar (yig‘indi = quantity).
   * Aks holda teng bo‘lish (qoldiq birinchi ishchilarga).
   */
  private resolveWorkerQuantities(input: {
    quantity: number;
    employees: Array<{ id: string; name: string }>;
    workerShares?: Array<{ employeeId: string; quantity: number }>;
  }): Map<string, number> {
    const employeeIds = new Set(input.employees.map((employee) => employee.id));
    const result = new Map<string, number>();

    if (input.workerShares && input.workerShares.length > 0) {
      let sum = 0;
      for (const share of input.workerShares) {
        const employeeId = share.employeeId.trim();
        if (!employeeIds.has(employeeId)) {
          throw new BadRequestException(
            'workerShares ichidagi ishchi employeeIds da bo‘lishi shart.',
          );
        }
        if (!Number.isInteger(share.quantity) || share.quantity < 1) {
          throw new BadRequestException(
            'Har bir ishchi miqdori butun va kamida 1 bo‘lishi kerak.',
          );
        }
        if (result.has(employeeId)) {
          throw new BadRequestException(
            'Bir ishchi uchun workerShares ichida faqat bitta miqdor yuborilishi mumkin.',
          );
        }
        result.set(employeeId, share.quantity);
        sum += share.quantity;
      }

      if (result.size !== employeeIds.size) {
        throw new BadRequestException(
          'Tanlangan har bir ishchi uchun miqdor yozilishi shart.',
        );
      }

      if (sum !== input.quantity) {
        throw new BadRequestException(
          `Ishchilar miqdorlari yig‘indisi (${sum}) umumiy miqdorga (${input.quantity}) teng bo‘lishi kerak.`,
        );
      }

      return result;
    }

    if (input.quantity < input.employees.length) {
      throw new BadRequestException(
        `Miqdor (${input.quantity}) ishchilar sonidan (${input.employees.length}) kam bo‘lmasligi kerak — har bir ishchiga kamida 1 dona yoziladi.`,
      );
    }

    const baseQty = Math.floor(input.quantity / input.employees.length);
    let remainder = input.quantity - baseQty * input.employees.length;
    for (const employee of input.employees) {
      const qty = baseQty + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      result.set(employee.id, qty);
    }

    return result;
  }

  private async findActiveSalaryRate(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      factoryId: string;
      productionStageId: string;
      productVariantId: string;
      at: Date;
    },
  ) {
    const baseWhere = {
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      productionStageId: input.productionStageId,
      deletedAt: null,
      effectiveFrom: { lte: input.at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.at } }],
    } satisfies Prisma.SalaryRateWhereInput;

    // Prefer stage-level rate (product variant yo‘q — asosiy model).
    const stageRate = await tx.salaryRate.findFirst({
      where: {
        ...baseWhere,
        productVariantId: null,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: salaryRateSelect,
    });

    if (stageRate) {
      return stageRate;
    }

    // Eski demo/legacy: variant-specific stavka.
    return tx.salaryRate.findFirst({
      where: {
        ...baseWhere,
        productVariantId: input.productVariantId,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: salaryRateSelect,
    });
  }
}

const productVariantSelect = {
  id: true,
  product: { select: { id: true, name: true, code: true } },
  color: { select: { id: true, name: true, code: true } },
  material: { select: { id: true, name: true, code: true } },
  season: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ProductVariantSelect;

const productionStageSelect = {
  id: true,
  name: true,
  sortOrder: true,
} satisfies Prisma.ProductionStageSelect;

const stageInventorySelect = {
  id: true,
  quantity: true,
  updatedAt: true,
  productionStage: { select: productionStageSelect },
  productVariant: { select: productVariantSelect },
} satisfies Prisma.StageInventorySelect;

const productionBatchSelect = {
  id: true,
  quantity: true,
  createdAt: true,
  productVariant: { select: productVariantSelect },
  mechanic: { select: { id: true, name: true } },
  machineOperator: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ProductionBatchSelect;

const batchEmployeeSelect = {
  id: true,
  name: true,
  jobRole: true,
  workProfile: true,
} satisfies Prisma.EmployeeSelect;

const stageMovementSelect = {
  id: true,
  quantity: true,
  occurredAt: true,
  note: true,
  sourceStage: { select: productionStageSelect },
  destinationStage: { select: productionStageSelect },
  productVariant: { select: productVariantSelect },
  productionBatch: {
    select: {
      id: true,
      quantity: true,
      mechanic: { select: { id: true, name: true } },
      machineOperator: { select: { id: true, name: true } },
    },
  },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.StageMovementSelect;

const workerActivitySelect = {
  id: true,
  quantity: true,
  baseSalaryRateAmount: true,
  shiftPremiumAmount: true,
  salaryRateAmount: true,
  workShiftCode: true,
  activityDate: true,
  employee: { select: { id: true, name: true, status: true } },
  productionStage: { select: productionStageSelect },
  productVariant: { select: productVariantSelect },
  enteredBy: { select: { id: true, name: true } },
} satisfies Prisma.WorkerActivitySelect;

const defectSelect = {
  id: true,
  quantity: true,
  reason: true,
  detectedAt: true,
  employee: { select: { id: true, name: true, status: true } },
  productionStage: { select: productionStageSelect },
  productVariant: { select: productVariantSelect },
  reportedBy: { select: { id: true, name: true } },
} satisfies Prisma.DefectSelect;

const salaryRateSelect = {
  id: true,
  amount: true,
  productVariantId: true,
} satisfies Prisma.SalaryRateSelect;

function mapStageInventoryResponse(inventory: {
  id: string;
  quantity: number;
  updatedAt: Date;
  productionStage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: {
    id: string;
    product: { id: string; name: string; code: string | null };
    color: { id: string; name: string; code: string | null };
    material: { id: string; name: string; code: string | null };
    season: { id: string; name: string; code: string | null };
  };
}): StageInventoryResponse {
  return {
    id: inventory.id,
    quantity: inventory.quantity,
    updatedAt: inventory.updatedAt,
    stage: inventory.productionStage,
    productVariant: inventory.productVariant,
  };
}

function mapWorkerActivityResponse(activity: {
  id: string;
  quantity: number;
  baseSalaryRateAmount: Prisma.Decimal;
  shiftPremiumAmount: Prisma.Decimal;
  salaryRateAmount: Prisma.Decimal;
  workShiftCode: 'DAY' | 'NIGHT' | null;
  activityDate: Date;
  employee: {
    id: string;
    name: string;
    status: EmployeeStatus;
  };
  productionStage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: {
    id: string;
    product: { id: string; name: string; code: string | null };
    color: { id: string; name: string; code: string | null };
    material: { id: string; name: string; code: string | null };
    season: { id: string; name: string; code: string | null };
  };
  enteredBy: {
    id: string;
    name: string;
  };
}): WorkerActivityResponse {
  return {
    id: activity.id,
    quantity: activity.quantity,
    baseSalaryRateAmount: activity.baseSalaryRateAmount.toString(),
    shiftPremiumAmount: activity.shiftPremiumAmount.toString(),
    salaryRateAmount: activity.salaryRateAmount.toString(),
    workShiftCode: activity.workShiftCode,
    activityDate: activity.activityDate,
    employee: activity.employee,
    stage: activity.productionStage,
    productVariant: activity.productVariant,
    enteredBy: activity.enteredBy,
  };
}

function mapDefectResponse(defect: {
  id: string;
  quantity: number;
  reason: string;
  detectedAt: Date;
  employee: {
    id: string;
    name: string;
    status: EmployeeStatus;
  } | null;
  productionStage: {
    id: string;
    name: string;
    sortOrder: number;
  } | null;
  productVariant: {
    id: string;
    product: { id: string; name: string; code: string | null };
    color: { id: string; name: string; code: string | null };
    material: { id: string; name: string; code: string | null };
    season: { id: string; name: string; code: string | null };
  } | null;
  reportedBy: {
    id: string;
    name: string;
  };
}): DefectResponse {
  return {
    id: defect.id,
    quantity: defect.quantity,
    reason: defect.reason,
    detectedAt: defect.detectedAt,
    employee: defect.employee,
    stage: defect.productionStage,
    productVariant: defect.productVariant,
    reportedBy: defect.reportedBy,
  };
}
