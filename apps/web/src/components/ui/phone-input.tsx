"use client";

import {
  forwardRef,
  useCallback,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { formatUzPhone, formatUzPhoneInput } from "@/lib/phone";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> {
  /** When true, input displays empty string instead of +998 until user focuses */
  startEmpty?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      placeholder = "+998 90 123 45 67",
      disabled,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledValue !== undefined;

    const displayValue = isControlled
      ? controlledValue
        ? String(controlledValue).includes(" ")
          ? String(controlledValue)
          : formatUzPhone(String(controlledValue))
        : ""
      : undefined;

    const initialDefault = defaultValue
      ? formatUzPhone(String(defaultValue))
      : undefined;

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        const formatted = formatUzPhoneInput(raw);
        event.target.value = formatted;

        if (onChange) {
          onChange(event);
        }
      },
      [onChange],
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        if (!event.target.value) {
          event.target.value = "+998 ";
          if (onChange) {
            onChange(event as unknown as ChangeEvent<HTMLInputElement>);
          }
        }
        if (onFocus) onFocus(event);
      },
      [onChange, onFocus],
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        const trimmed = event.target.value.trim();
        // If user left just the prefix (+998), clear it to empty string so optional validation succeeds
        if (trimmed === "+998" || trimmed === "+") {
          event.target.value = "";
          if (onChange) {
            onChange(event as unknown as ChangeEvent<HTMLInputElement>);
          }
        }
        if (onBlur) onBlur(event);
      },
      [onChange, onBlur],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        const val = (event.currentTarget.value || "").trim();
        if (event.key === "Backspace" && (val === "+998" || val === "+998 ")) {
          event.preventDefault();
          event.currentTarget.value = "";
          if (onChange) {
            const target = event.currentTarget;
            target.value = "";
            onChange({
              ...event,
              target,
              currentTarget: target,
            } as unknown as ChangeEvent<HTMLInputElement>);
          }
        }
        if (onKeyDown) onKeyDown(event);
      },
      [onChange, onKeyDown],
    );

    const inputProps: InputHTMLAttributes<HTMLInputElement> = {
      ...props,
      type: "tel",
      inputMode: "tel",
      autoComplete: "tel",
      placeholder,
      disabled,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: cn(
        "flex h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ),
    };

    if (isControlled) {
      inputProps.value = displayValue;
    } else if (initialDefault !== undefined) {
      inputProps.defaultValue = initialDefault;
    }

    return <input ref={ref} {...inputProps} />;
  },
);

PhoneInput.displayName = "PhoneInput";
