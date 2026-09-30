"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger after the first visible element. */
  delayMs?: number;
  variant?: "copy" | "media";
  style?: CSSProperties;
};

export function LandingReveal({ children, className, delayMs = 0, variant = "copy", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dirRef = useRef<"down" | "up">("down");
  const [visible, setVisible] = useState(false);
  const [dir, setDir] = useState<"down" | "up">("down");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      dirRef.current = y > lastY ? "down" : "up";
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setDir(dirRef.current);
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        variant === "media" ? "landing-reveal-media" : "landing-reveal-copy",
        dir === "up" ? "is-from-up" : "is-from-down",
        visible && "is-visible",
        className,
      )}
      style={{ "--landing-reveal-delay": `${delayMs}ms`, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}
