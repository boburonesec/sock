import { cn } from "@/lib/utils";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function PageSection({ children, className, title, description }: PageSectionProps) {
  return <section className={cn("min-w-0 w-full max-w-full space-y-4", className)}>{(title || description) && <div><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>}{children}</section>;
}
