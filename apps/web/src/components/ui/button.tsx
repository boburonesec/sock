import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline"; };
export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant = "default", ...props }, ref) => (
  <button ref={ref} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-75", variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90", variant === "secondary" && "bg-muted hover:bg-muted/75", variant === "outline" && "border bg-transparent hover:bg-muted", className)} {...props} />
));
Button.displayName = "Button";
