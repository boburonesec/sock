import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({ title, description, actionLabel }: { title: string; description: string; actionLabel?: string }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{actionLabel && <Button><Plus size={18} />{actionLabel}</Button>}</div>;
}
