import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function DataTable({
  children,
  className,
  label = "Ma’lumotlar jadvali",
}: DataTableProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <div className="mb-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground sm:hidden">
        <span>Jadvalni surish mumkin →</span>
      </div>
      <div className="panel w-full max-w-full overflow-x-auto overscroll-x-contain">
        <table
          aria-label={label}
          className="w-full min-w-[560px] text-left text-sm"
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </thead>
  );
}

export function DataTableRow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b last:border-0", className)} {...props}>
      {children}
    </tr>
  );
}

export function DataTableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-3 font-medium sm:px-5", className)}>{children}</th>
  );
}

export function DataTableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-3 sm:px-5 sm:py-4", className)}>{children}</td>;
}
