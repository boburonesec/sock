import { cn } from "@/lib/utils";
interface LoadingStateProps { label?: string; className?: string; }
export function LoadingState({ label = "Yuklanmoqda...", className }: LoadingStateProps) { return <div role="status" className={cn("grid min-h-40 place-items-center text-center", className)}><div><span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary"/><p className="mt-3 text-sm text-muted-foreground">{label}</p></div></div>; }
