import { cn } from "@/lib/utils";

export type Priority = "low" | "medium" | "high" | "critical";
const labels: Record<Priority, string> = { low: "Past", medium: "O‘rta", high: "Yuqori", critical: "Juda yuqori" };
const tones: Record<Priority, string> = { low: "bg-muted text-muted-foreground", medium: "bg-blue-500/15 text-blue-500", high: "bg-amber-500/15 text-amber-500", critical: "bg-rose-500/15 text-rose-500" };
interface PriorityBadgeProps { priority: Priority; children?: React.ReactNode; className?: string; }
export function PriorityBadge({ priority, children, className }: PriorityBadgeProps) { return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[priority], className)}>{children ?? labels[priority]}</span>; }
