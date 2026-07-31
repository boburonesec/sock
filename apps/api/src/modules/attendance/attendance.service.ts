import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../identity/request-context/request-context.types';
import { requireActiveFactoryId } from '../identity/request-context/request-context.utils';
import { AttendanceQueryDto } from './attendance.dto';
import { AttendanceOverviewResponse, AttendanceStatus } from './attendance.types';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    context: RequestContext,
    query: AttendanceQueryDto,
  ): Promise<AttendanceOverviewResponse> {
    const tenantId = context.tenantId;
    const factoryId = requireActiveFactoryId(context);
    const [year, month] = query.month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const [employees, records] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where: {
          tenantId,
          factoryId,
          deletedAt: null,
          OR: [
            { status: 'ACTIVE' },
            { attendanceRecords: { some: { workDate: { gte: monthStart, lt: monthEnd } } } },
          ],
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          status: true,
          workShift: { select: { code: true, name: true } },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          tenantId,
          factoryId,
          workDate: { gte: monthStart, lt: monthEnd },
          ...(query.employeeId ? { employeeId: query.employeeId } : {}),
          ...(query.shiftCode ? { shiftCode: query.shiftCode } : {}),
        },
        orderBy: [{ workDate: 'desc' }, { checkInAt: 'desc' }],
        select: attendanceSelect,
      }),
    ]);

    const now = new Date();
    const mappedRecords = records.map((record) => {
      const status = this.getStatus(record, now);
      return {
        id: record.id,
        workDate: record.workDate.toISOString().slice(0, 10),
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        durationMinutes: record.checkOutAt
          ? Math.max(
              0,
              Math.floor(
                (record.checkOutAt.getTime() - record.checkInAt.getTime()) / 60_000,
              ),
            )
          : null,
        status,
        employee: record.employee,
        shift: {
          id: record.workShift.id,
          code: record.shiftCode,
          name: record.shiftName,
          startTime: this.minuteToTime(record.shiftStartMinute),
          endTime: this.minuteToTime(record.shiftEndMinute),
        },
      };
    });

    const byEmployee = new Map<string, typeof mappedRecords>();
    for (const record of mappedRecords) {
      const list = byEmployee.get(record.employee.id) ?? [];
      list.push(record);
      byEmployee.set(record.employee.id, list);
    }
    const employeeRows = employees
      .filter((employee) => !query.employeeId || employee.id === query.employeeId)
      .filter(
        (employee) => !query.shiftCode || employee.workShift?.code === query.shiftCode,
      )
      .map((employee) => {
        const rows = byEmployee.get(employee.id) ?? [];
        return {
          employeeId: employee.id,
          employeeName: employee.name,
          shiftCode: employee.workShift?.code ?? null,
          shiftName: employee.workShift?.name ?? null,
          attendedDays: String(new Set(rows.map((row) => row.workDate)).size),
          completedDays: String(rows.filter((row) => row.status === 'COMPLETE').length),
          missingCheckoutDays: String(
            rows.filter((row) => row.status === 'MISSING_CHECK_OUT').length,
          ),
          openDays: String(rows.filter((row) => row.status === 'OPEN').length),
        };
      });

    return {
      data: {
        month: query.month,
        integration: {
          status: 'WAITING_FOR_TRUNKET',
          message:
            'Kirish-chiqish yozuvlari Trunket FaceID formati tasdiqlangach avtomatik keladi.',
        },
        totals: {
          activeEmployees: String(
            employees.filter(
              (employee) =>
                employee.status === 'ACTIVE' &&
                (!query.employeeId || employee.id === query.employeeId) &&
                (!query.shiftCode || employee.workShift?.code === query.shiftCode),
            ).length,
          ),
          attendedDays: String(
            new Set(mappedRecords.map((row) => `${row.employee.id}:${row.workDate}`)).size,
          ),
          completedDays: String(
            mappedRecords.filter((row) => row.status === 'COMPLETE').length,
          ),
          missingCheckoutDays: String(
            mappedRecords.filter((row) => row.status === 'MISSING_CHECK_OUT').length,
          ),
          openDays: String(mappedRecords.filter((row) => row.status === 'OPEN').length),
        },
        employees: employeeRows,
        records: mappedRecords,
      },
    };
  }

  private getStatus(
    record: Prisma.AttendanceRecordGetPayload<{ select: typeof attendanceSelect }>,
    now: Date,
  ): AttendanceStatus {
    if (record.checkOutAt) return 'COMPLETE';
    const dateKey = record.workDate.toISOString().slice(0, 10);
    const endDate =
      record.shiftEndMinute <= record.shiftStartMinute
        ? this.addUtcDate(dateKey, 1)
        : dateKey;
    const expectedEnd = new Date(
      `${endDate}T${this.minuteToTime(record.shiftEndMinute)}:00+05:00`,
    );
    return now.getTime() >= expectedEnd.getTime() ? 'MISSING_CHECK_OUT' : 'OPEN';
  }

  private addUtcDate(dateKey: string, days: number): string {
    const value = new Date(`${dateKey}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private minuteToTime(minute: number): string {
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }
}

const attendanceSelect = {
  id: true,
  workDate: true,
  checkInAt: true,
  checkOutAt: true,
  shiftCode: true,
  shiftName: true,
  shiftStartMinute: true,
  shiftEndMinute: true,
  employee: { select: { id: true, name: true } },
  workShift: { select: { id: true } },
} satisfies Prisma.AttendanceRecordSelect;
