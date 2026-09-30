"use client";

import { CalendarDays, ClipboardCheck, Clock, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { MetricStatCard } from "@/components/metric-stat-card";
import { LESSON_STATUSES, type LessonStatusFilter } from "./lessons-shared";

export const STATUS_CARD: Record<LessonStatusFilter, { icon: typeof Clock; iconClass: string }> = {
  pending: {
    icon: Clock,
    iconClass: "bg-[#fff0e6] text-[#e85d04]",
  },
  confirmed: {
    icon: CalendarDays,
    iconClass: "bg-[#e6f7ee] text-[#16a34a]",
  },
  declined: {
    icon: XCircle,
    iconClass: "bg-[#fde8e8] text-[#e11d48]",
  },
  completed: {
    icon: ClipboardCheck,
    iconClass: "bg-[#eee8fb] text-[#7c5cbf]",
  },
};

export function LessonStatusStatCards({
  counts,
  hrefFor,
}: {
  counts: Record<LessonStatusFilter, number>;
  hrefFor: (status: LessonStatusFilter) => string;
}) {
  const t = useTranslations("AdminLessons");

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {LESSON_STATUSES.map((key) => {
        const { icon: Icon, iconClass } = STATUS_CARD[key];
        return (
          <MetricStatCard
            key={key}
            href={hrefFor(key)}
            icon={<Icon className="h-[18px] w-[18px]" strokeWidth={2} />}
            iconClass={iconClass}
            label={t(`status.${key}`)}
            value={counts[key]}
          />
        );
      })}
    </div>
  );
}
