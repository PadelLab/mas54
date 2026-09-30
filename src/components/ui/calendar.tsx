"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      {...props}
      className={cn("schedule-day-picker", className)}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", chevronClass)} {...iconProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", chevronClass)} {...iconProps} />
          ),
        ...components,
      }}
    />
  );
}
