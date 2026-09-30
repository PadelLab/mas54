import {
  AUTH_CONTROL_CLASS,
  AUTH_FIELD_LABEL_CLASS,
  CONTROL_FOCUS_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_TEXTAREA_CLASS,
  LIST_CONTROL_CLASS,
} from "@/components/list-search-field";
import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, FORM_FIELD_LABEL_CLASS, LIST_CONTROL_CLASS };

/** @deprecated Prefer LIST_CONTROL_CLASS; kept for legacy native selects. */
export const formControlFocusClass = CONTROL_FOCUS_CLASS;

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(LIST_CONTROL_CLASS, className)} {...props} />;
  },
);
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(FORM_FIELD_LABEL_CLASS, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FORM_TEXTAREA_CLASS, className)} {...props} />;
}
