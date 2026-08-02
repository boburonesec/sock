import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { PayrollItem } from "@/lib/api/finance";
import { labelStatus, payrollItemStatusLabel } from "@/lib/status-labels";

const statusTone: Record<string, StatusTone> = {
  CALCULATED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CARRIED_FORWARD: "neutral",
  DRAFT: "neutral",
  UNPAID: "warning",
  CLOSED: "success",
};

export function PayrollDetailsTable({ details }: { details: PayrollItem[] }) {
  return (
    <>
    <div className="space-y-3 md:hidden" aria-label="Xodimlar ish haqi tafsilotlari">
      {details.length > 0 ? details.map((detail) => (
        <article key={detail.id} className="rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">{detail.employee.name}</p>
            <StatusBadge tone={statusTone[detail.status] ?? "neutral"}>{labelStatus(payrollItemStatusLabel, detail.status)}</StatusBadge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Yakuniy oylik</dt><dd className="font-semibold">{detail.finalAmount} so‘m</dd></div>
            <div><dt className="text-muted-foreground">Qoldiq</dt><dd className="font-semibold">{detail.remainingAmount} so‘m</dd></div>
            <div><dt className="text-muted-foreground">Ishlangan</dt><dd>{detail.workedAmount} so‘m</dd></div>
            <div><dt className="text-muted-foreground">To‘langan</dt><dd>{detail.paidAmount} so‘m</dd></div>
            <div><dt className="text-muted-foreground">Bonus</dt><dd>{detail.bonusAmount} so‘m</dd></div>
            <div><dt className="text-muted-foreground">Jarima / avans</dt><dd>{detail.penaltyAmount} / {detail.advanceAmount} so‘m</dd></div>
          </dl>
        </article>
      )) : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Tanlangan davr uchun xodimlar ma’lumoti topilmadi.</div>}
    </div>
    <div className="hidden md:block">
    <DataTable label="Xodimlar ish haqi tafsilotlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Xodim</DataTableHeader>
          <DataTableHeader>Ishlangan</DataTableHeader>
          <DataTableHeader>Bonus</DataTableHeader>
          <DataTableHeader>Jarima</DataTableHeader>
          <DataTableHeader>Avans</DataTableHeader>
          <DataTableHeader>Yakuniy oylik</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qoldiq</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {details.length > 0 ? (
          details.map((detail) => (
            <DataTableRow key={detail.id}>
              <DataTableCell className="font-semibold">
                {detail.employee.name}
              </DataTableCell>
              <DataTableCell>{detail.workedAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.bonusAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.penaltyAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.advanceAmount} so‘m</DataTableCell>
              <DataTableCell className="font-semibold">
                {detail.finalAmount} so‘m
              </DataTableCell>
              <DataTableCell>{detail.paidAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.remainingAmount} so‘m</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[detail.status] ?? "neutral"}>
                  {labelStatus(payrollItemStatusLabel, detail.status)}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={9}
            title="Ish haqi tafsilotlari mavjud emas"
            description="Tanlangan davr uchun xodimlar bo‘yicha ma’lumot topilmadi."
          />
        )}
      </tbody>
    </DataTable>
    </div>
    </>
  );
}
