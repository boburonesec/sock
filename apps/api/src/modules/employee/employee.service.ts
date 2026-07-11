import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
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

    const employee = await this.prisma.$transaction(async (tx) => {
      const stageIds = await this.resolveStageIds(
        tx,
        tenantId,
        factoryId,
        dto.stageIds ?? [],
      );

      const createdEmployee = await tx.employee.create({
        data: {
          tenantId,
          factoryId,
          name,
          status: EmployeeStatus.ACTIVE,
          stageAssignments: {
            create: stageIds.map((productionStageId) => ({
              tenantId,
              factoryId,
              productionStageId,
            })),
          },
        },
        select: employeeSelect,
      });

      const response = mapEmployee(createdEmployee);

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_CREATED',
        entityId: createdEmployee.id,
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

      if (dto.stageIds !== undefined) {
        const stageIds = await this.resolveStageIds(
          tx,
          tenantId,
          factoryId,
          dto.stageIds,
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
        data: { name },
        select: employeeSelect,
      });
      const after = mapEmployee(updatedEmployee);

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_UPDATED',
        entityId: updatedEmployee.id,
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
  createdAt: true,
  updatedAt: true,
  stageAssignments: {
    select: {
      productionStage: {
        select: { id: true, name: true, sortOrder: true },
      },
    },
    orderBy: { productionStage: { sortOrder: 'asc' as const } },
  },
} satisfies Prisma.EmployeeSelect;

function mapEmployee(
  employee: Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>,
): EmployeeResponse {
  return {
    id: employee.id,
    name: employee.name,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    stages: employee.stageAssignments.map((assignment) => ({
      id: assignment.productionStage.id,
      name: assignment.productionStage.name,
      sortOrder: assignment.productionStage.sortOrder,
    })),
  };
}
