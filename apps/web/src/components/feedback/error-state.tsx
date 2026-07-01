import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
interface ErrorStateProps { title?: string; description?: string; action?: React.ReactNode; className?: string; }
export function ErrorState({ title = "Xatolik yuz berdi", description = "Sahifani qayta yuklab ko‘ring.", action, className }: ErrorStateProps) { return <section role="alert" className={cn("panel grid min-h-48 place-items-center p-6 text-center", className)}><div><AlertCircle className="mx-auto text-rose-500" size={28}/><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div></section>; }
