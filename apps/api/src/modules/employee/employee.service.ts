import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeCompensationType,
  EmployeeJobRole,
  EmployeeStatus,
  EmployeeWorkProfile,
  Prisma,
  UserStatus,
} from '../../prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import {
  CollectionResponse,
  EmployeeResponse,
  SingleResponse,
} from './employee.types';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getEmployees(
    context: RequestContext,
  ): Promise<CollectionResponse<EmployeeResponse>> {
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
      select: employeeSelect,
    });

    return { data: employees.map(mapEmployee) };
  }

  async createEmployee(
    context: RequestContext,
    dto: CreateEmployeeDto,
  ): Promise<SingleResponse<EmployeeResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Name is required.');
    }

    this.validateProfileRules(dto, false);
    const employee = await this.prisma.$transaction(async (tx) => {
      const stageIds = await this.resolveStageIds(
        tx,
        tenantId,
        factoryId,
        dto.stageIds ?? [],
      );
      const workShiftId = await this.resolveWorkShiftId(
        tx,
        tenantId,
        factoryId,
        dto.workShiftId,
      );

      // Nested create: Prisma infers employeeId/tenantId/factoryId from parent
      // Employee; only productionStageId is accepted on nested input.
      const createdEmployee = await tx.employee.create({
        data: {
          tenantId,
          factoryId,
          name,
          jobRole: this.toLegacyJobRole(dto.workProfile),
          workProfile: dto.workProfile,
          compensationType: dto.compensationType,
          workShiftId,
          status: EmployeeStatus.ACTIVE,
          stageAssignments: {
            create: stageIds.map((productionStageId) => ({
              productionStageId,
            })),
          },
        },
        select: employeeSelect,
      });

      if (dto.account) {
        await this.createAccount(tx, context, createdEmployee.id, name, dto.account);
      }
      if (dto.compensationType === EmployeeCompensationType.SALARIED) {
        await this.createSalaryAgreement(
          tx,
          context,
          createdEmployee.id,
          dto.monthlySalaryAmount!,
          dto.salaryEffectiveFrom,
        );
      }

      const hydrated = await tx.employee.findUniqueOrThrow({
        where: { id: createdEmployee.id },
        select: employeeSelect,
      });

      const response = mapEmployee(hydrated);

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_CREATED',
        entityId: hydrated.id,
        after: response,
      });

      return response;
    });

    return { data: employee };
  }

  async updateEmployee(
    context: RequestContext,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<SingleResponse<EmployeeResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Name is required.');
    }

    this.validateProfileRules(dto, true);
    const employee = await this.prisma.$transaction(async (tx) => {
      const existingEmployee = await tx.employee.findFirst({
        where: {
          id: employeeId,
          tenantId,
          factoryId,
          deletedAt: null,
        },
        select: employeeSelect,
      });

      if (!existingEmployee) {
        throw new NotFoundException('Employee not found.');
      }

      const existingRoleNames = existingEmployee.user?.roles.map((entry) => entry.role.name) ?? [];
      const accountRequiredProfiles = new Set<EmployeeWorkProfile>([
        EmployeeWorkProfile.MECHANIC,
        EmployeeWorkProfile.MECHANIC_MASTER,
        EmployeeWorkProfile.STAFF,
      ]);
      const accountRequired = accountRequiredProfiles.has(dto.workProfile);
      if (accountRequired && !existingEmployee.user && !dto.account) {
        throw new BadRequestException('Bu ish profili uchun account majburiy.');
      }
      if (!accountRequired && existingEmployee.user) {
        throw new BadRequestException('Accountsiz profilga o‘tishdan oldin User account bog‘lanishini olib tashlash kerak.');
      }
      if (dto.workProfile === EmployeeWorkProfile.MECHANIC && existingEmployee.user && !existingRoleNames.includes('Mechanic')) {
        throw new BadRequestException('Mexanik accountida Mechanic roli bo‘lishi kerak.');
      }
      if (dto.workProfile === EmployeeWorkProfile.MECHANIC_MASTER && existingEmployee.user && !existingRoleNames.includes('Mechanic Master')) {
        throw new BadRequestException('Mexanik-master accountida Mechanic Master roli bo‘lishi kerak.');
      }
      if (dto.workProfile === EmployeeWorkProfile.STAGE_WORKER && (dto.stageIds ?? existingEmployee.stageAssignments).length === 0) {
        throw new BadRequestException('Stage worker kamida bitta bosqichga biriktirilishi kerak.');
      }

      const before = mapEmployee(existingEmployee);
      const workShiftId = await this.resolveWorkShiftId(
        tx,
        tenantId,
        factoryId,
        dto.workShiftId,
      );

      if (dto.stageIds !== undefined || dto.workProfile !== EmployeeWorkProfile.STAGE_WORKER) {
        const stageIds = await this.resolveStageIds(
          tx,
          tenantId,
          factoryId,
          dto.workProfile === EmployeeWorkProfile.STAGE_WORKER ? (dto.stageIds ?? []) : [],
        );
        await tx.employeeStageAssignment.deleteMany({
          where: { tenantId, factoryId, employeeId: existingEmployee.id },
        });
        if (stageIds.length > 0) {
          await tx.employeeStageAssignment.createMany({
            data: stageIds.map((productionStageId) => ({
              tenantId,
              factoryId,
              employeeId: existingEmployee.id,
              productionStageId,
            })),
          });
        }
      }

      const updatedEmployee = await tx.employee.update({
        where: { id: existingEmployee.id },
        data: {
          name,
          jobRole: this.toLegacyJobRole(dto.workProfile),
          workProfile: dto.workProfile,
          compensationType: dto.compensationType,
          workShiftId,
        },
        select: employeeSelect,
      });
      if (dto.account && !updatedEmployee.user) {
        await this.createAccount(tx, context, updatedEmployee.id, name, dto.account);
      }
      if (
        dto.compensationType === EmployeeCompensationType.SALARIED &&
        dto.monthlySalaryAmount !== undefined
      ) {
        await tx.employeeSalaryAgreement.updateMany({
          where: {
            tenantId,
            factoryId,
            employeeId: updatedEmployee.id,
            effectiveTo: null,
            effectiveFrom: { lt: new Date() },
          },
          data: { effectiveTo: new Date() },
        });
        await this.createSalaryAgreement(
          tx,
          context,
          updatedEmployee.id,
          dto.monthlySalaryAmount,
          dto.salaryEffectiveFrom,
        );
      }
      if (dto.compensationType === EmployeeCompensationType.PIECE_RATE) {
        await tx.employeeSalaryAgreement.updateMany({
          where: { tenantId, factoryId, employeeId: updatedEmployee.id, effectiveTo: null, effectiveFrom: { lt: new Date() } },
          data: { effectiveTo: new Date() },
        });
      }
      const hydrated = await tx.employee.findUniqueOrThrow({
        where: { id: updatedEmployee.id },
        select: employeeSelect,
      });
      const after = mapEmployee(hydrated);

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_UPDATED',
        entityId: hydrated.id,
        before,
        after,
      });

      return after;
    });

    return { data: employee };
  }

  async inactivateEmployee(
    context: RequestContext,
    employeeId: string,
  ): Promise<SingleResponse<EmployeeResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const employee = await this.prisma.$transaction(async (tx) => {
      const existingEmployee = await tx.employee.findFirst({
        where: {
          id: employeeId,
          tenantId,
          factoryId,
          deletedAt: null,
        },
        select: employeeSelect,
      });

      if (!existingEmployee) {
        throw new NotFoundException('Employee not found.');
      }

      const before = mapEmployee(existingEmployee);
      const updatedEmployee = await tx.employee.update({
        where: { id: existingEmployee.id },
        data: { status: EmployeeStatus.INACTIVE },
        select: employeeSelect,
      });
      const after = mapEmployee(updatedEmployee);

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_INACTIVATED',
        entityId: updatedEmployee.id,
        before,
        after,
      });

      return after;
    });

    return { data: employee };
  }

  private async resolveStageIds(
    tx: Prisma.TransactionClient,
    tenantId: string,
    factoryId: string,
    stageIds: string[],
  ): Promise<string[]> {
    const unique = Array.from(new Set(stageIds.filter(Boolean)));
    if (unique.length === 0) {
      return [];
    }

    const stages = await tx.productionStage.findMany({
      where: {
        tenantId,
        factoryId,
        id: { in: unique },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (stages.length !== unique.length) {
      throw new BadRequestException(
        'One or more production stages were not found in this factory.',
      );
    }

    return stages.map((stage) => stage.id);
  }

  private async resolveWorkShiftId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    factoryId: string,
    workShiftId?: string,
  ): Promise<string | null> {
    if (!workShiftId) {
      return null;
    }
    const shift = await tx.workShift.findFirst({
      where: { id: workShiftId, tenantId, factoryId, deletedAt: null },
      select: { id: true },
    });
    if (!shift) {
      throw new BadRequestException('Tanlangan smena bu fabrikada topilmadi.');
    }
    return shift.id;
  }

  private validateProfileRules(
    dto: CreateEmployeeDto | UpdateEmployeeDto,
    isUpdate: boolean,
  ): void {
    const stageIds = dto.stageIds ?? [];
    const hasAccount = Boolean(dto.account);
    const profile = dto.workProfile;
    const compensation = dto.compensationType;

    if (profile === EmployeeWorkProfile.STAGE_WORKER) {
      if (compensation !== EmployeeCompensationType.PIECE_RATE || hasAccount || (!isUpdate && stageIds.length === 0)) {
        throw new BadRequestException('Stage worker ishbay bo‘lishi, accountsiz va kamida bitta bosqichga biriktirilishi kerak.');
      }
    } else if (stageIds.length > 0) {
      throw new BadRequestException('Bosqich faqat STAGE_WORKER profiliga biriktiriladi.');
    }

    if (profile === EmployeeWorkProfile.MACHINE_OPERATOR) {
      if (compensation !== EmployeeCompensationType.PIECE_RATE || hasAccount) {
        throw new BadRequestException('Stanok operatori ishbay va accountsiz bo‘lishi kerak.');
      }
    }
    if (profile === EmployeeWorkProfile.MECHANIC) {
      if (compensation !== EmployeeCompensationType.PIECE_RATE || (!isUpdate && !hasAccount) || (hasAccount && dto.account?.roleName !== 'Mechanic')) {
        throw new BadRequestException('Mexanik uchun ishbay compensation va Mechanic account roli majburiy.');
      }
    }
    if (profile === EmployeeWorkProfile.MECHANIC_MASTER) {
      if (compensation !== EmployeeCompensationType.SALARIED || (!isUpdate && !hasAccount) || (hasAccount && dto.account?.roleName !== 'Mechanic Master')) {
        throw new BadRequestException('Mexanik-master oylik va Mechanic Master account rolida bo‘lishi kerak.');
      }
    }
    if (profile === EmployeeWorkProfile.STAFF) {
      if (compensation !== EmployeeCompensationType.SALARIED || (!isUpdate && !hasAccount) || (hasAccount && ['Mechanic', 'Mechanic Master'].includes(dto.account?.roleName ?? ''))) {
        throw new BadRequestException('Staff oylik va staff account rolida bo‘lishi kerak.');
      }
    }
    if (!isUpdate && compensation === EmployeeCompensationType.SALARIED && dto.monthlySalaryAmount === undefined) {
      throw new BadRequestException('Oylik xodim uchun monthlySalaryAmount majburiy.');
    }
  }

  private toLegacyJobRole(profile: EmployeeWorkProfile): EmployeeJobRole {
    if (profile === EmployeeWorkProfile.MACHINE_OPERATOR) return EmployeeJobRole.MACHINE_OPERATOR;
    if (profile === EmployeeWorkProfile.MECHANIC || profile === EmployeeWorkProfile.MECHANIC_MASTER) return EmployeeJobRole.MECHANIC;
    return EmployeeJobRole.STAGE_WORKER;
  }

  private async createAccount(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    employeeId: string,
    name: string,
    account: NonNullable<CreateEmployeeDto['account']>,
  ): Promise<void> {
    const email = account.email.trim().toLowerCase();
    const [existing, role] = await Promise.all([
      tx.user.findUnique({ where: { tenantId_email: { tenantId: context.tenantId, email } } }),
      tx.role.findUnique({ where: { tenantId_name: { tenantId: context.tenantId, name: account.roleName } } }),
    ]);
    if (existing && !existing.deletedAt) throw new ConflictException('Bu email bilan account mavjud.');
    if (!role || role.deletedAt) throw new ConflictException('Tanlangan role sozlanmagan.');

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { name, employeeId, status: UserStatus.ACTIVE, deletedAt: null },
        })
      : await tx.user.create({
          data: { tenantId: context.tenantId, employeeId, name, email, status: UserStatus.ACTIVE },
        });
    await tx.userCredential.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: context.tenantId } },
      create: { tenantId: context.tenantId, userId: user.id, passwordHash: await argon2.hash(account.password) },
      update: { passwordHash: await argon2.hash(account.password), passwordUpdatedAt: new Date() },
    });
    await tx.userRole.deleteMany({ where: { tenantId: context.tenantId, userId: user.id } });
    await tx.userRole.create({ data: { tenantId: context.tenantId, userId: user.id, roleId: role.id } });
    await tx.userFactoryAccess.deleteMany({ where: { tenantId: context.tenantId, userId: user.id } });
    await tx.userFactoryAccess.create({
      data: { tenantId: context.tenantId, userId: user.id, factoryId: requireActiveFactoryId(context) },
    });
  }

  private async createSalaryAgreement(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    employeeId: string,
    monthlyAmount: number,
    effectiveFrom?: string,
  ): Promise<void> {
    const from = effectiveFrom ? new Date(effectiveFrom) : new Date();
    if (Number.isNaN(from.getTime())) throw new BadRequestException('salaryEffectiveFrom noto‘g‘ri.');
    await tx.employeeSalaryAgreement.create({
      data: {
        tenantId: context.tenantId,
        factoryId: requireActiveFactoryId(context),
        employeeId,
        monthlyAmount,
        effectiveFrom: from,
        createdByUserId: context.userId,
      },
    });
  }

  private async createAuditLog(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    input: {
      action: 'EMPLOYEE_CREATED' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_INACTIVATED';
      entityId: string;
      before?: EmployeeResponse;
      after?: EmployeeResponse;
    },
  ): Promise<void> {
    await this.auditService.createWithTransaction(tx, {
      tenantId: context.tenantId,
      factoryId: context.activeFactoryId,
      userId: context.userId,
      action: input.action,
      entityType: 'Employee',
      entityId: input.entityId,
      before: input.before,
      after: input.after,
    });
  }
}

const employeeSelect = {
  id: true,
  name: true,
  status: true,
  jobRole: true,
  workProfile: true,
  compensationType: true,
  createdAt: true,
  updatedAt: true,
  workShift: {
    select: {
      id: true,
      code: true,
      name: true,
      startMinute: true,
      endMinute: true,
      premiumPerPiece: true,
    },
  },
  stageAssignments: {
    select: {
      productionStage: {
        select: { id: true, name: true, sortOrder: true },
      },
    },
    orderBy: { productionStage: { sortOrder: 'asc' as const } },
  },
  user: {
    select: {
      id: true,
      email: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  },
  salaryAgreements: {
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' as const },
    take: 1,
    select: { id: true, monthlyAmount: true, effectiveFrom: true, effectiveTo: true },
  },
} satisfies Prisma.EmployeeSelect;

function mapEmployee(
  employee: Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>,
): EmployeeResponse {
  return {
    id: employee.id,
    name: employee.name,
    status: employee.status,
    jobRole: employee.jobRole,
    workProfile: employee.workProfile,
    compensationType: employee.compensationType,
    account: employee.user
      ? {
          id: employee.user.id,
          email: employee.user.email,
          roleNames: employee.user.roles.map((entry) => entry.role.name),
        }
      : null,
    salaryAgreement: employee.salaryAgreements[0]
      ? {
          ...employee.salaryAgreements[0],
          monthlyAmount: employee.salaryAgreements[0].monthlyAmount.toString(),
        }
      : null,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    stages: employee.stageAssignments.map((assignment) => ({
      id: assignment.productionStage.id,
      name: assignment.productionStage.name,
      sortOrder: assignment.productionStage.sortOrder,
    })),
    workShift: employee.workShift
      ? {
          ...employee.workShift,
          premiumPerPiece: employee.workShift.premiumPerPiece.toString(),
        }
      : null,
  };
}
