"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePreferences } from "@/contexts/preferences-context";
import type { LandingPartner } from "@/lib/landing-partners";

type Props = {
  partners: readonly LandingPartner[];
};

function isDarkUi(theme: "light" | "dark" | "system") {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function PartnerMark({ partner, dark }: { partner: LandingPartner; dark: boolean }) {
  const src = dark ? partner.srcDark ?? partner.src : partner.srcLight ?? partner.src;
  if (src) {
    return (
      <Image
        src={src}
        alt={partner.name}
        width={180}
        height={48}
        className="landing-partner-logo h-9 w-auto max-w-[10.5rem] object-contain object-center opacity-90 transition duration-300 group-hover:opacity-100 sm:h-11 sm:max-w-[12rem]"
        unoptimized
      />
    );
  }
  return (
    <span className="whitespace-nowrap font-display text-lg font-medium tracking-tight text-zinc-400 transition group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-200 sm:text-xl">
      {partner.name}
    </span>
  );
}

export function PartnerMarquee({ partners }: Props) {
  const { theme, hydrated } = usePreferences();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const apply = () => setDark(isDarkUi(theme));
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, hydrated]);

  if (partners.length === 0) return null;

  const loop = reduceMotion ? partners : [...partners, ...partners, ...partners];

  return (
    <div className="relative overflow-hidden" aria-label="Nuestros partners">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] landing-marquee-fade-l w-12 sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] landing-marquee-fade-r w-12 sm:w-20" />
      <div
        className={
          reduceMotion
            ? "flex flex-wrap items-center justify-center gap-x-12 gap-y-4 py-2"
            : "landing-marquee-track flex w-max items-center gap-16 py-2 sm:gap-24"
        }
      >
        {loop.map((partner, i) => (
          <div
            key={`${partner.name}-${i}`}
            className="group flex shrink-0 items-center justify-center px-1 transition duration-300 hover:scale-105"
          >
            <PartnerMark partner={partner} dark={dark} />
          </div>
        ))}
      </div>
    </div>
  );
}
