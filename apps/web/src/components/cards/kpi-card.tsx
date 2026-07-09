import { cn } from "@/lib/utils";

type Accent = "primary" | "success" | "warning" | "danger" | "neutral";

const accents: Record<Accent, string> = {
  primary: "border-l-primary",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  danger: "border-l-rose-500",
  neutral: "border-l-muted-foreground",
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  description?: string;
  accent?: Accent;
  className?: string;
}

export function KpiCard({
  label,
  value,
  description,
  accent = "primary",
  className,
}: KpiCardProps) {
  return (
    <article
      className={cn(
        "panel min-w-0 border-l-4 p-4 sm:p-5",
        accents[accent],
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-xl font-bold tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
        {value}
      </p>
      {description ? (
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </article>
  );
}
