import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
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

  async createBatch(
    context: RequestContext,
    dto: CreateProductionBatchDto,
  ): Promise<ProductionBatchCreationResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const [productVariant, firstStage] = await Promise.all([
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
      ]);

      if (!productVariant) {
        throw new NotFoundException('Product variant not found.');
      }

      if (!firstStage) {
        throw new ConflictException(
          'At least one active production stage is required to create a batch.',
        );
      }

      const batch = await tx.productionBatch.create({
        data: {
          tenantId,
          factoryId,
          productVariantId: productVariant.id,
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
        metadata: dto.note ? { note: dto.note } : undefined,
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
        throw new ConflictException('Source stage does not have enough quantity.');
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
        select: { id: true, name: true },
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

        const workerActivity = await tx.workerActivity.create({
          data: {
            tenantId,
            factoryId,
            employeeId: employee.id,
            productionStageId: sourceStage.id,
            productVariantId: productVariant.id,
            quantity: qty,
            salaryRateAmount: salaryRate.amount,
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
          select: { id: true, name: true, status: true },
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

      const workerActivity = await tx.workerActivity.create({
        data: {
          tenantId,
          factoryId,
          employeeId: employee.id,
          productionStageId: stage.id,
          productVariantId: productVariant.id,
          quantity: dto.quantity,
          salaryRateAmount: salaryRate.amount,
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
        productionBatch: { select: { id: true, quantity: true } },
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
        salaryRateAmount: true,
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
        salaryRateAmount: activity.salaryRateAmount.toString(),
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
        const previous = result.get(employeeId) ?? 0;
        result.set(employeeId, previous + share.quantity);
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
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ProductionBatchSelect;

const stageMovementSelect = {
  id: true,
  quantity: true,
  occurredAt: true,
  note: true,
  sourceStage: { select: productionStageSelect },
  destinationStage: { select: productionStageSelect },
  productVariant: { select: productVariantSelect },
  productionBatch: { select: { id: true, quantity: true } },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.StageMovementSelect;

const workerActivitySelect = {
  id: true,
  quantity: true,
  salaryRateAmount: true,
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
  salaryRateAmount: Prisma.Decimal;
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
    salaryRateAmount: activity.salaryRateAmount.toString(),
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
