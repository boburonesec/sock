export type AttendanceStatus = 'COMPLETE' | 'OPEN' | 'MISSING_CHECK_OUT';

export interface AttendanceOverviewResponse {
  data: {
    month: string;
    integration: {
      status: 'WAITING_FOR_TRUNKET';
      message: string;
    };
    totals: {
      activeEmployees: string;
      attendedDays: string;
      completedDays: string;
      missingCheckoutDays: string;
      openDays: string;
    };
    employees: Array<{
      employeeId: string;
      employeeName: string;
      shiftCode: 'DAY' | 'NIGHT' | null;
      shiftName: string | null;
      attendedDays: string;
      completedDays: string;
      missingCheckoutDays: string;
      openDays: string;
    }>;
    records: Array<{
      id: string;
      workDate: string;
      checkInAt: Date;
      checkOutAt: Date | null;
      durationMinutes: number | null;
      status: AttendanceStatus;
      employee: { id: string; name: string };
      shift: {
        id: string;
        code: 'DAY' | 'NIGHT';
        name: string;
        startTime: string;
        endTime: string;
      };
    }>;
  };
}
