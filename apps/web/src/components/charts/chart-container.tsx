import { cn } from "@/lib/utils";
interface ChartContainerProps { children: React.ReactNode; className?: string; label?: string; }
export function ChartContainer({ children, className, label = "Grafik" }: ChartContainerProps) { return <div role="img" aria-label={label} className={cn("h-64 w-full", className)}>{children}</div>; }
