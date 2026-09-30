import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_CAROUSEL_SLIDES } from "@/lib/landing-media";

export const metadata: Metadata = {
  title: "About Us — Padel Lab",
  description:
    "Padel Lab combines coaching, structured training, and a modern platform for every step of your padel journey.",
};

const slides = HERO_CAROUSEL_SLIDES;
const missionBg = slides[0];
/** Sharper Unsplash fetch for full-bleed band (Next still optimizes; larger source helps). */
const missionBgSrc = missionBg.src.replace("w=2400", "w=3840").replace("q=85", "q=92");

/** Local asset: community padel hero (from your template image). */
const HERO_COMMUNITY = "/marketing/about-hero-community.png";

const navLinks: Array<{
  href: string;
  label: string;
  chevron?: boolean;
  active?: boolean;
}> = [
  { href: "/option-b", label: "Home" },
  { href: "/option-b/about", label: "About Us", active: true },
  { href: "/register/student", label: "Members" },
  { href: "/option-b/about#programs", label: "Programs" },
  { href: "#", label: "All pages", chevron: true },
];

function AboutCourtGraphic() {
  return (
    <svg
      viewBox="0 0 320 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[17rem] text-zinc-400 sm:max-w-xs"
      aria-hidden
    >
      <defs>
        <linearGradient id="aboutCourtFill" x1="32" y1="0" x2="288" y2="380" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fafafa" />
          <stop offset="1" stopColor="#e4e4e7" />
        </linearGradient>
        <linearGradient id="aboutCourtAccent" x1="160" y1="40" x2="160" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18181b" stopOpacity="0.06" />
          <stop offset="0.45" stopColor="#18181b" stopOpacity="0" />
          <stop offset="0.55" stopColor="#18181b" stopOpacity="0" />
          <stop offset="1" stopColor="#18181b" stopOpacity="0.07" />
        </linearGradient>
      </defs>
      <rect x="20" y="28" width="280" height="324" rx="14" fill="url(#aboutCourtFill)" stroke="currentColor" strokeWidth="1.75" className="text-zinc-300" />
      <rect x="20" y="28" width="280" height="324" rx="14" fill="url(#aboutCourtAccent)" />
      {/* net / center line */}
      <line x1="160" y1="36" x2="160" y2="344" stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" />
      {/* service lines */}
      <line x1="28" y1="118" x2="292" y2="118" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="28" y1="262" x2="292" y2="262" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="96" y1="118" x2="96" y2="262" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
      <line x1="224" y1="118" x2="224" y2="262" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
      {/* corner marks (glass suggestion) */}
      <circle cx="160" cy="190" r="5" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

export default function OptionBAboutPage() {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased">
      {/* —— Hero (template Netplay) —— */}
      <section className="relative isolate flex min-h-[min(100dvh,52rem)] flex-col overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0">
          <Image
            src={HERO_COMMUNITY}
            alt="Group of players on an outdoor padel court"
            fill
            className="object-cover object-center brightness-[0.82]"
            sizes="100vw"
            priority
            unoptimized
          />
        </div>

        <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 [text-shadow:0_1px_18px_rgba(0,0,0,0.45)]">
          <Link href="/option-b" className="flex items-center gap-2.5" aria-label="Padel Lab home">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-base font-black text-zinc-950 shadow-md shadow-black/25">
              P
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">Padel Lab</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-wide text-white/75 md:flex" aria-label="Main">
            {navLinks.map(({ href, label, chevron, active }) => (
              <Link
                key={label}
                href={href}
                className={active ? "text-white" : "transition hover:text-white"}
              >
                <span className="inline-flex items-center gap-1">
                  {label}
                  {chevron ? <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden /> : null}
                </span>
              </Link>
            ))}
          </nav>
          <Link
            href="#contact"
            className="rounded-full border border-white/20 bg-black/45 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            Contacts
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-16 pt-4 sm:px-8 sm:pb-20">
          <div className="max-w-3xl pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">About Padel Lab</p>
            <h1 className="mt-3 font-display text-[clamp(2.1rem,5.5vw,3.5rem)] font-bold leading-[1.06] tracking-tight">
              Padel is a sport that brings people together.
            </h1>
          </div>
        </div>

      </section>

      {/* —— About Us (copy + court graphic) —— */}
      <section id="about" className="scroll-mt-20 border-b border-zinc-200 bg-zinc-50/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            <div className="relative order-2 mx-auto w-full max-w-md lg:order-1 lg:mx-0 lg:max-w-none">
              <div
                className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-sm ring-1 ring-zinc-950/[0.03] sm:p-10"
                aria-hidden
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-zinc-200/40 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-zinc-300/25 blur-2xl" />
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Padel Lab</p>
                <div className="relative mt-6 flex justify-center lg:justify-start">
                  <AboutCourtGraphic />
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">About Us</h2>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-600 sm:text-lg">
                <p className="font-medium text-zinc-800">At Padel Lab, we go beyond the game.</p>
                <p>
                  Created to help players improve with purpose, Padel Lab combines professional coaching, structured
                  training programs, and a modern platform designed to support every step of your padel journey.
                </p>
                <p>
                  From personalized lessons and player evaluations to events, schedules, and performance tracking, Padel
                  Lab is built for players who want to train smarter, stay active, and evolve continuously. Whether
                  you&apos;re starting for fun, improving your fitness, or taking your game to the next level — Padel Lab
                  gives you the tools, guidance, and community to grow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* —— Our Mission (full-width band) —— */}
      <section className="relative min-h-[22rem] overflow-hidden sm:min-h-[26rem]">
        <Image
          src={missionBgSrc}
          alt={missionBg.alt}
          fill
          className="object-cover brightness-[0.45]"
          style={{ objectPosition: missionBg.objectPosition ?? "center" }}
          sizes="100vw"
          quality={92}
        />
        <div className="absolute inset-0 bg-zinc-950/78" aria-hidden />
        <div className="relative z-10 mx-auto flex min-h-[22rem] max-w-3xl flex-col items-center justify-center px-5 py-20 text-center sm:min-h-[26rem] sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">Our Mission</p>
          <h2 className="mt-5 font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
            We value discipline, consistency, and technical growth. Our goal is to help every player become their best
            on the court.
          </h2>
          <Button className="mt-10 h-12 rounded-full border-0 bg-white px-8 text-sm font-semibold text-zinc-950 hover:bg-zinc-100" asChild>
            <Link href="/register/student">Join us</Link>
          </Button>
        </div>
      </section>

      {/* —— Programs anchor (light strip) —— */}
      <section id="programs" className="scroll-mt-20 bg-zinc-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <h2 className="font-display text-2xl font-bold text-zinc-900 sm:text-3xl">Ready to train with purpose?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Create your student account to access scheduling, evaluations, and everything Padel Lab offers.
          </p>
          <Button className="mt-8 h-11 rounded-full border-0 bg-zinc-900 px-8 text-sm font-semibold text-white hover:bg-zinc-800" asChild>
            <Link href="/register/student" className="inline-flex items-center gap-2">
              Become a student
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <footer id="contact" className="border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-zinc-500 sm:flex-row sm:px-8">
          <span className="font-display font-semibold text-zinc-800">Padel Lab</span>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/option-b" className="font-medium text-zinc-700 hover:text-zinc-900">
              Option B home
            </Link>
            <Link href="/" className="font-medium text-zinc-700 hover:text-zinc-900">
              Main site
            </Link>
            <Link href="/login" className="font-medium text-zinc-700 hover:text-zinc-900">
              Sign in
            </Link>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
