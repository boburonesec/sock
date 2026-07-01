import { cn } from "@/lib/utils";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, description, action, children, className }: InfoCardProps) {
  return <article className={cn("panel p-5", className)}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div><div className="mt-5">{children}</div></article>;
}
