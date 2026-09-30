"use client";

import { ChevronDown, Globe } from "lucide-react";
import { usePreferences } from "@/contexts/preferences-context";
import { countryLabelFromCode, isIsoCountryCode, ISO_COUNTRY_CODES_SORTED } from "@/lib/iso-regions";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/input";
import { LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { useMemo } from "react";

type Props = {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  required?: boolean;
  /** Classes for the <select> (e.g. theme borders). */
  selectClassName?: string;
  /** Extra classes on `Label`. */
  labelClassName?: string;
  /**
   * Signup: hide the native arrow; globe icon on the left and chevron on the right, aligned with other fields.
   */
  signupSelectUi?: boolean;
};

export function NationalitySelect({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  selectClassName,
  labelClassName,
  signupSelectUi,
}: Props) {
  const { effectiveLocale } = usePreferences();
  const locale = effectiveLocale;

  const sortedOptions = useMemo(() => {
    const rows = ISO_COUNTRY_CODES_SORTED.map((code) => ({
      code,
      label: countryLabelFromCode(code, locale),
    }));
    rows.sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: "base" }));
    return rows;
  }, [locale]);

  const trimmed = value.trim();
  const selectValue =
    trimmed === "" ? "" : isIsoCountryCode(trimmed) ? trimmed.toUpperCase() : trimmed;

  const defaultSelectClass = cn(LIST_CONTROL_CLASS, "mt-0 font-normal");

  const chevronClass =
    "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400";

  const globeClass =
    "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent dark:text-lime-400/90";

  const hideLabel = Boolean(labelClassName?.includes("sr-only"));

  return (
    <div className={cn("min-w-0", hideLabel && "flex flex-col gap-0")}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      {signupSelectUi ? (
        <div className="relative mt-2 min-w-0">
          <Globe className={globeClass} aria-hidden />
          <select
            id={id}
            required={required}
            className={cn(
              defaultSelectClass,
              "mt-0 appearance-none pl-11 pr-10",
              selectClassName,
            )}
            value={selectValue}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{placeholder}</option>
            {trimmed && !isIsoCountryCode(trimmed) ? (
              <option value={trimmed}>{trimmed}</option>
            ) : null}
            {sortedOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className={chevronClass} aria-hidden />
        </div>
      ) : (
        <div className="relative min-w-0">
          <select
            id={id}
            required={required}
            className={cn(defaultSelectClass, "appearance-none pr-10", selectClassName)}
            value={selectValue}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{placeholder}</option>
            {trimmed && !isIsoCountryCode(trimmed) ? (
              <option value={trimmed}>{trimmed}</option>
            ) : null}
            {sortedOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className={chevronClass} aria-hidden />
        </div>
      )}
    </div>
  );
}
