import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function DataTable({ children, className, label = "Ma’lumotlar jadvali" }: DataTableProps) {
  return <div className={cn("panel overflow-x-auto", className)}><table aria-label={label} className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}

export function DataTableHead({ children }: { children: React.ReactNode }) { return <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">{children}</thead>; }
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
export function DataTableHeader({ children }: { children: React.ReactNode }) { return <th className="px-5 py-3 font-medium">{children}</th>; }
export function DataTableCell({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={cn("px-5 py-4", className)}>{children}</td>; }
