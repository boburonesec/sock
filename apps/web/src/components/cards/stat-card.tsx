import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  detail?: string;
  className?: string;
}

export function StatCard({ label, value, icon, detail, className }: StatCardProps) {
  return <article className={cn("panel p-5", className)}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div>{icon && <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>}</div>{detail && <p className="mt-3 text-xs text-muted-foreground">{detail}</p>}</article>;
}
