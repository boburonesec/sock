import { apiClient } from "./client";
import type { ApiDateTime } from "./types";

export interface AttendanceOverview {
  month: string;
  integration: { status: "WAITING_FOR_TRUNKET"; message: string };
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
    shiftCode: "DAY" | "NIGHT" | null;
    shiftName: string | null;
    attendedDays: string;
    completedDays: string;
    missingCheckoutDays: string;
    openDays: string;
  }>;
  records: Array<{
    id: string;
    workDate: string;
    checkInAt: ApiDateTime;
    checkOutAt: ApiDateTime | null;
    durationMinutes: number | null;
    status: "COMPLETE" | "OPEN" | "MISSING_CHECK_OUT";
    employee: { id: string; name: string };
    shift: { id: string; code: "DAY" | "NIGHT"; name: string; startTime: string; endTime: string };
  }>;
}

export const attendanceApi = {
  getOverview: (month: string) =>
    apiClient<{ data: AttendanceOverview }>(`/attendance/overview?month=${encodeURIComponent(month)}`),
};
