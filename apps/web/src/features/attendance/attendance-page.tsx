"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceApi } from "@/lib/api/attendance";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTimeForUser } from "@/lib/format";
import { AttendanceRecordCard } from "./components/attendance-record-card";
import { AttendanceStatus } from "./components/attendance-status";
import { EmployeeSummaryCard } from "./components/employee-summary-card";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AttendancePage() {
  const [month, setMonth] = useState(currentMonth);
  const query = useQuery({
    queryKey: queryKeys.attendance.overview(month),
    queryFn: () => attendanceApi.getOverview(month),
  });
  const overview = query.data?.data;

  return (
    <div>
      <PageHeader
        title="Ishga kelib-ketish"
        description="Xodimlarning oylik davomat hisoboti, kirish va chiqish holatlari"
      />
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-56">
          <label htmlFor="attendanceMonth" className="mb-2 block text-sm font-medium">Hisobot oyi</label>
          <Input id="attendanceMonth" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">Kun faqat kirish va chiqish ikkalasi bo‘lsa to‘liq hisoblanadi.</p>
      </div>
      {query.isPending ? <LoadingState label="Davomat yuklanmoqda..." /> : null}
      {query.error ? <ErrorState title="Davomat yuklanmadi" description={query.error instanceof Error ? query.error.message : "Xatolik yuz berdi."} action={<Button variant="outline" onClick={() => query.refetch()}>Qayta urinish</Button>} /> : null}
      {overview ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            <span className="font-semibold">FaceID integratsiyasi kutilmoqda.</span> {overview.integration.message}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Faol xodimlar" value={overview.totals.activeEmployees} accent="primary" />
            <KpiCard label="Kelgan kunlar" value={overview.totals.attendedDays} accent="success" />
            <KpiCard label="To‘liq yopilgan" value={overview.totals.completedDays} accent="success" />
            <KpiCard label="Kun yopilmagan" value={overview.totals.missingCheckoutDays} description={`${overview.totals.openDays} ta smena hali davom etmoqda`} accent="danger" />
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Xodimlar bo‘yicha</h2>
            <ResponsiveDataList
              items={overview.employees}
              getKey={(employee) => employee.employeeId}
              renderCard={(employee) => <EmployeeSummaryCard employee={employee} />}
              ariaLabel="Xodimlar davomat hisoboti"
              emptyTitle="Xodimlar topilmadi"
              emptyDescription="Tanlangan oy uchun faol xodim yo‘q."
            >
            <DataTable label="Xodimlar davomat hisoboti">
              <DataTableHead><DataTableRow><DataTableHeader>Xodim</DataTableHeader><DataTableHeader>Smena</DataTableHeader><DataTableHeader>Kelgan kun</DataTableHeader><DataTableHeader>To‘liq</DataTableHeader><DataTableHeader>Yopilmagan</DataTableHeader></DataTableRow></DataTableHead>
              <tbody>
                {overview.employees.length ? overview.employees.map((employee) => (
                  <DataTableRow key={employee.employeeId}>
                    <DataTableCell className="font-semibold">{employee.employeeName}</DataTableCell>
                    <DataTableCell>{employee.shiftName ?? <StatusBadge tone="warning">Tanlanmagan</StatusBadge>}</DataTableCell>
                    <DataTableCell>{employee.attendedDays}</DataTableCell>
                    <DataTableCell>{employee.completedDays}</DataTableCell>
                    <DataTableCell>{Number(employee.missingCheckoutDays) > 0 ? <StatusBadge tone="danger">{employee.missingCheckoutDays} kun</StatusBadge> : "0"}</DataTableCell>
                  </DataTableRow>
                )) : <EmptyTableState colSpan={5} title="Xodimlar topilmadi" description="Tanlangan oy uchun faol xodim yo‘q." />}
              </tbody>
            </DataTable>
            </ResponsiveDataList>
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Kirish-chiqish tafsilotlari</h2>
            <ResponsiveDataList
              items={overview.records}
              getKey={(record) => record.id}
              renderCard={(record) => <AttendanceRecordCard record={record} />}
              ariaLabel="Davomat yozuvlari"
              emptyTitle="Davomat yozuvlari yo‘q"
              emptyDescription="Trunket integratsiyasidan yozuvlar kelgach shu yerda ko‘rinadi."
            >
            <DataTable label="Davomat yozuvlari">
              <DataTableHead><DataTableRow><DataTableHeader>Sana</DataTableHeader><DataTableHeader>Xodim</DataTableHeader><DataTableHeader>Smena</DataTableHeader><DataTableHeader>Kirish</DataTableHeader><DataTableHeader>Chiqish</DataTableHeader><DataTableHeader>Holat</DataTableHeader></DataTableRow></DataTableHead>
              <tbody>
                {overview.records.length ? overview.records.map((record) => (
                  <DataTableRow key={record.id}>
                    <DataTableCell>{record.workDate.split("-").reverse().join(".")}</DataTableCell>
                    <DataTableCell className="font-semibold">{record.employee.name}</DataTableCell>
                    <DataTableCell>{record.shift.name}</DataTableCell>
                    <DataTableCell>{formatDateTimeForUser(record.checkInAt)}</DataTableCell>
                    <DataTableCell>{record.checkOutAt ? formatDateTimeForUser(record.checkOutAt) : "—"}</DataTableCell>
                    <DataTableCell><AttendanceStatus status={record.status} /></DataTableCell>
                  </DataTableRow>
                )) : <EmptyTableState colSpan={6} title="Davomat yozuvlari yo‘q" description="Trunket integratsiyasidan yozuvlar kelgach shu yerda ko‘rinadi." />}
              </tbody>
            </DataTable>
            </ResponsiveDataList>
          </section>
        </div>
      ) : null}
    </div>
  );
}
