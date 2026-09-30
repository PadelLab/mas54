"use client";

import { cn } from "@/lib/utils";
import { Input, Label } from "@/components/ui/input";
import { forwardRef, useId, useImperativeHandle, useRef, type InputHTMLAttributes } from "react";

export type BirthDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
  /** Extra classes on `Label` (field label, associated via `htmlFor`). */
  labelClassName?: string;
};

function openNativeDatePicker(input: HTMLInputElement) {
  input.focus({ preventScroll: true });
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* InvalidStateError in some browsers if the gesture is not accepted */
    }
  }
  /* Fallback: in browsers without showPicker, a programmatic click sometimes opens the native UI */
  input.click();
}

/**
 * Birth date: the label uses `pointerdown` + `preventDefault` so it does not compete with
 * native label behavior (which can block `showPicker` on `click`). The dark-theme icon
 * remains in `globals.css`.
 */
export const BirthDateInput = forwardRef<HTMLInputElement, BirthDateInputProps>(
  function BirthDateInput({ label, labelClassName, id: idProp, className, ...rest }, ref) {
    const genId = useId();
    const inputId = idProp ?? `birth-date-${genId.replace(/:/g, "")}`;
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current!, []);

    return (
      <div className="flex min-w-0 flex-col justify-end">
        <Label
          htmlFor={inputId}
          className={cn("cursor-pointer touch-manipulation select-none", labelClassName)}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const input = innerRef.current;
            if (!input) return;
            e.preventDefault();
            openNativeDatePicker(input);
          }}
        >
          {label}
        </Label>
        <Input
          ref={innerRef}
          id={inputId}
          type="date"
          className={cn("mt-0 box-border h-12 min-h-12 max-h-12 py-0 leading-none", className)}
          {...rest}
        />
      </div>
    );
  },
);

BirthDateInput.displayName = "BirthDateInput";
