import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps { title?: string; description?: string; action?: React.ReactNode; className?: string; }
export function EmptyState({ title = "Ma’lumot mavjud emas", description = "Ko‘rsatish uchun yozuv yo‘q.", action, className }: EmptyStateProps) {
  return <section className={cn("panel grid min-h-64 place-items-center p-6 text-center", className)}><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Construction size={22} /></span><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div></section>;
}
