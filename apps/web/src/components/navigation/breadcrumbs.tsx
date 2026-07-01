import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface BreadcrumbItem { label: string; href?: string; }
interface BreadcrumbsProps { items: BreadcrumbItem[]; }
export function Breadcrumbs({ items }: BreadcrumbsProps) { return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">{index > 0 && <ChevronRight size={15}/>} {item.href && index < items.length - 1 ? <Link href={item.href} className="hover:text-foreground">{item.label}</Link> : <span className={index === items.length - 1 ? "text-foreground" : undefined}>{item.label}</span>}</li>)}</ol></nav>; }
