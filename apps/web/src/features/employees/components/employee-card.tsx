import { ChevronRight, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { employeeWorkProfileLabels, type Employee } from "@/lib/api/employees";

/**
 * Mobile card for one employee. Scan hierarchy is name + role + status —
 * the desktop table's "Dastur hisobi" (system account) and "Yaratilgan"
 * (created date) columns are administrative metadata that stays in the
 * table/detail drawer rather than every card. Whole card is the single tap
 * target (matches the Orders/Suppliers card pattern), so there's exactly
 * one interactive element and no nested-button ambiguity.
 */
export function EmployeeCard({
  employee,
  onSelect,
}: {
  employee: Employee;
  onSelect: (employee: Employee) => void;
}) {
  const isActive = employee.status === "ACTIVE";
  const stageNames = (employee.stages ?? []).map((stage) => stage.name).join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(employee)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
        <UserRound size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold" title={employee.name}>
            {employee.name}
          </span>
          <StatusBadge tone={isActive ? "success" : "neutral"} className="shrink-0">
            {isActive ? "Faol" : "Nofaol"}
          </StatusBadge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {employeeWorkProfileLabels[employee.workProfile]}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {employee.workShift ? <span>{employee.workShift.name}</span> : null}
          {stageNames ? <span className="truncate">{stageNames}</span> : null}
        </div>
      </div>
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
