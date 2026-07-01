import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
const tones: Record<StatusTone, string> = { neutral: "bg-muted text-muted-foreground", info: "bg-blue-500/15 text-blue-500", success: "bg-emerald-500/15 text-emerald-500", warning: "bg-amber-500/15 text-amber-500", danger: "bg-rose-500/15 text-rose-500" };
interface StatusBadgeProps { children: React.ReactNode; tone?: StatusTone; className?: string; }
export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) { return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>; }
