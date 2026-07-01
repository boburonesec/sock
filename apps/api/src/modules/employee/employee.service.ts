import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { CollectionResponse, EmployeeResponse, SingleResponse } from './employee.types';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getEmployees(context: RequestContext): Promise<CollectionResponse<EmployeeResponse>> {
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data: employees };
  }

  async createEmployee(
    context: RequestContext,
    dto: CreateEmployeeDto,
  ): Promise<SingleResponse<EmployeeResponse>> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);

    const employee = await this.prisma.$transaction(async (tx) => {
      const createdEmployee = await tx.employee.create({
        data: {
          tenantId,
          factoryId,
          name: dto.name,
          status: EmployeeStatus.ACTIVE,
        },
        select: employeeSelect,
      });

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_CREATED',
        entityId: createdEmployee.id,
        after: createdEmployee,
      });

      return createdEmployee;
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

      const updatedEmployee = await tx.employee.update({
        where: {
          id: existingEmployee.id,
        },
        data: {
          name: dto.name,
        },
        select: employeeSelect,
      });

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_UPDATED',
        entityId: updatedEmployee.id,
        before: existingEmployee,
        after: updatedEmployee,
      });

      return updatedEmployee;
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

      const updatedEmployee = await tx.employee.update({
        where: {
          id: existingEmployee.id,
        },
        data: {
          status: EmployeeStatus.INACTIVE,
        },
        select: employeeSelect,
      });

      await this.createAuditLog(tx, context, {
        action: 'EMPLOYEE_INACTIVATED',
        entityId: updatedEmployee.id,
        before: existingEmployee,
        after: updatedEmployee,
      });

      return updatedEmployee;
    });

    return { data: employee };
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
} satisfies Prisma.EmployeeSelect;
