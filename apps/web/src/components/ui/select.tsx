import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// `pr-8` (vs. the `pl-3` left padding) reserves room for the browser's own
// native dropdown arrow so long option text (e.g. "Model · Rang · Material ·
// Mavsum") never renders under it; `truncate` ellipsizes the closed-state
// label instead of letting it collide with the arrow — the full text is
// still visible in the opened option list, which browsers size to content.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => <select ref={ref} className={cn("flex h-11 w-full truncate rounded-lg border bg-background py-2 pl-3 pr-8 text-base outline-none transition-colors focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm", className)} {...props}>{children}</select>);
Select.displayName = "Select";
