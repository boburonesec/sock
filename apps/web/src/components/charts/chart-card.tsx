import { cn } from "@/lib/utils";
interface ChartCardProps { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; }
export function ChartCard({ title, description, action, children, className }: ChartCardProps) { return <article className={cn("panel p-5", className)}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div><div className="mt-5">{children}</div></article>; }
