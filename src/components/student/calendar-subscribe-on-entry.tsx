"use client";

import {
  consumeCalendarSubscribeFlag,
  openPhoneCalendarSubscription,
  shouldOpenCalendarSubscribe,
} from "@/lib/calendar-subscribe-client";
import { useEffect } from "react";

/** Opens the phone calendar subscription after signup/login (enabled by default). */
export function CalendarSubscribeOnEntry() {
  useEffect(() => {
    if (!shouldOpenCalendarSubscribe()) return;
    consumeCalendarSubscribeFlag();
    void openPhoneCalendarSubscription();
  }, []);
  return null;
}
