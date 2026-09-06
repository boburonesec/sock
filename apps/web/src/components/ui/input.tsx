import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, step, ...props }, ref) => {
    const derivedInputMode =
      inputMode ??
      (type === "number"
        ? step && step.toString().includes(".")
          ? "decimal"
          : "numeric"
        : undefined);

    return (
      <input
        ref={ref}
        type={type}
        inputMode={derivedInputMode}
        step={step}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
