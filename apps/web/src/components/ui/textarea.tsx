import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea ref={ref} className={cn("flex min-h-24 w-full rounded-lg border bg-background px-3 py-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm", className)} {...props} />);
Textarea.displayName = "Textarea";
