"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LandingSlide } from "@/lib/landing-media";

const DEFAULT_INTERVAL_MS = 6500;

type Props = {
  slides: LandingSlide[];
  /** Time each slide stays visible */
  intervalMs?: number;
};

export function HeroImageCarousel({ slides, intervalMs = DEFAULT_INTERVAL_MS }: Props) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs, reduceMotion]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      {slides.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt=""
          fill
          role="presentation"
          priority={i === 0}
          className={`object-cover transition-opacity duration-[1100ms] ease-out motion-reduce:transition-none ${
            i === index
              ? "opacity-100 motion-safe:animate-landing-ken-burns"
              : "opacity-0"
          }`}
          style={{ objectPosition: slide.objectPosition ?? "center" }}
          sizes="100vw"
          unoptimized
        />
      ))}
    </div>
  );
}
