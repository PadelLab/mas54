"use client";

import { ListSearchField, ListToolbar } from "@/components/list-search-field";
import { AppDateRangePicker, EMPTY_DATE_FILTER, type ScheduleDateFilter } from "@/components/schedule/app-date-range-picker";
import { ScheduleDaySection, ScheduleEmpty, rowMatchesDateFilter } from "@/components/schedule/schedule-timeline";
import { useAuth } from "@/contexts/auth-context";
import { foldEventSearch } from "@/lib/events-shared";
import { lessonActivityCategoryAndFocusLine } from "@/lib/lesson-activity-display";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import type { Court, Lesson, User } from "@/lib/types";
import { tSafe } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminLessonRow } from "./admin-lesson-row";
import { formatLessonDayHeading, groupLessonsByDate, sortLessonsByDateTime } from "./lessons-shared";

export function LessonsListByDate({
  lessons,
  users,
  courts,
  onUpdateStatus,
  onBeginComplete,
  onRemove,
  canDelete = true,
}: {
  lessons: Lesson[];
  users: User[];
  courts: Court[];
  onUpdateStatus: (id: string, status: Lesson["status"], reason?: string) => void;
  onBeginComplete: (lesson: Lesson) => void;
  onRemove: (id: string) => void;
  canDelete?: boolean;
}) {
  const locale = useLocale();
  const intlLocale = appLocaleToIntlLocale(locale);
  const t = useTranslations("AdminLessons");
  const tProg = useTranslations("StudentSchedule");
  const tTypes = useTranslations("LessonTypes");
  const tAct = useTranslations("LessonActivityDisplay");
  const { lessonActivityCatalog } = useAuth();
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>(EMPTY_DATE_FILTER);
  const [query, setQuery] = useState("");

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const courtById = useMemo(() => new Map(courts.map((c) => [c.id, c])), [courts]);

  const filtered = useMemo(() => {
    const dated = lessons.filter((l) => rowMatchesDateFilter(l.date, dateFilter));
    const q = foldEventSearch(query);
    if (!q) return sortLessonsByDateTime(dated);
    const drShort = tAct("drShort");
    return sortLessonsByDateTime(
      dated.filter((l) => {
        const student = userById.get(l.studentId);
        const coach = userById.get(l.coachId);
        const court = courtById.get(l.courtId);
        const { category, focusLine } = lessonActivityCategoryAndFocusLine(
          l,
          lessonActivityCatalog,
          (k) => tTypes(k),
          drShort,
        );
        return foldEventSearch(
          `${focusLine} ${category ?? ""} ${student?.name ?? ""} ${coach?.name ?? ""} ${court?.name ?? ""} ${l.time} ${t(`status.${l.status}`)}`,
        ).includes(q);
      }),
    );
  }, [lessons, dateFilter, query, userById, courtById, lessonActivityCatalog, t, tTypes, tAct]);

  const byDate = groupLessonsByDate(filtered);
  const searching = foldEventSearch(query).length > 0;

  return (
    <div className="space-y-6">
      <ListToolbar
        leading={
          <ListSearchField
            className="w-full max-w-lg"
            placeholder={t("searchPlaceholder")}
            onQueryChange={setQuery}
          />
        }
        trailing={
          <AppDateRangePicker
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            intlLocale={intlLocale}
            selectDateLabel={tProg("selectDate")}
            clearDateLabel={tProg("clearDate")}
            dateRangeHint={tProg("dateRangeHint")}
          />
        }
      />
      {filtered.length === 0 ? (
        <ScheduleEmpty
          title={searching ? t("emptySearchTitle") : tSafe(tProg, "emptyFilteredTitle", "emptyFiltered")}
          description={searching ? t("emptySearch") : tProg("emptyFiltered")}
        />
      ) : (
        <div className="space-y-10">
          {byDate.map(({ date, items }) => (
            <ScheduleDaySection key={date} heading={formatLessonDayHeading(date, locale)}>
              {items.map((l) => (
                <AdminLessonRow
                  key={l.id}
                  lesson={l}
                  student={userById.get(l.studentId)}
                  coach={userById.get(l.coachId)}
                  court={courtById.get(l.courtId)}
                  onUpdateStatus={onUpdateStatus}
                  onBeginComplete={onBeginComplete}
                  onRemove={onRemove}
                  canDelete={canDelete}
                />
              ))}
            </ScheduleDaySection>
          ))}
        </div>
      )}
    </div>
  );
}
