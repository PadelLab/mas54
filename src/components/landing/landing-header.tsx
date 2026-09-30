"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [hidden, setHidden] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const heroH = window.innerHeight * 0.72;
      setOverHero(y < heroH);
      if (y < 16) {
        setHidden(false);
      } else if (y > lastY.current + 6) {
        setHidden(true);
      } else if (y < lastY.current - 6) {
        setHidden(false);
      }
      lastY.current = y;
    };
    lastY.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        hidden && "-translate-y-full",
        overHero ? "border-b border-transparent bg-transparent" : "landing-header-solid border-b shadow-sm backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex w-full max-w-[74rem] items-center justify-between gap-3 px-4 py-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:py-5 lg:px-12 lg:py-6">
        <BrandLogo
          href="/"
          variant={overHero ? "white" : undefined}
          priority
          imgClassName="h-8 max-w-[6.75rem] sm:h-12 sm:max-w-[12rem] lg:h-14"
        />
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/login"
            className={cn(
              "min-h-10 px-2.5 py-2 text-[13px] font-medium transition sm:px-3.5",
              overHero
                ? "text-white/70 hover:text-white"
                : "text-[var(--landing-subtle)] hover:text-[var(--landing-ink)]",
            )}
          >
            Entrar
          </Link>
          <Link
            href="/register/student"
            className={cn(
              "inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition sm:h-10 sm:px-4 sm:text-[13px]",
              overHero
                ? "bg-white text-[#111827] hover:bg-zinc-100"
                : "bg-[var(--landing-ink)] text-[var(--landing-bg)] hover:opacity-90",
            )}
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
