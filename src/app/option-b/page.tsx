import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Unsplash: a-close-up-of-a-billiards-ball-and-a-bill-0mANKAqH87U (Oskar Hagberg) */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1657704358775-ed705c7388d2?auto=format&fit=crop&w=2400&q=88";

const LIME = "#CCFF00";

const navLinks = [
  { href: "/option-b", label: "Início" },
  { href: "/option-b/about", label: "About Us" },
  { href: "/register/student", label: "Aula experimental" },
  { href: "#", label: "Comunidade padel" },
  { href: "#", label: "Equipamento", chevron: true },
];

export default function LandingOptionBPage() {
  return (
    <section className="relative isolate min-h-dvh overflow-hidden bg-zinc-950 text-white">
      <Image
        src={HERO_IMAGE}
        alt="Close-up de bola de bilhar"
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/65 to-black/35" aria-hidden />
      <div className="absolute inset-0 bg-black/25" aria-hidden />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:py-6">
          <Link href="/option-b" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 overflow-hidden rounded-full border border-white/20 shadow-sm" aria-hidden>
              <span className="h-full w-1/2 bg-[#f5e000]" />
              <span className="h-full w-1/2 bg-white" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">Padel Lab</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-white/90 lg:flex" aria-label="Principal">
            {navLinks.map(({ href, label, chevron }) => (
              <Link key={label} href={href} className="inline-flex items-center gap-1 transition hover:text-white">
                {label}
                {chevron ? <ChevronDown className="h-4 w-4 opacity-80" aria-hidden /> : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/" className="hidden text-sm text-white/50 hover:text-white/80 xl:inline">
              Versão principal
            </Link>
            <Button
              className="h-10 gap-2 rounded-full border-0 px-5 text-sm font-semibold text-zinc-950 shadow-lg transition hover:brightness-105"
              style={{ backgroundColor: LIME }}
              asChild
            >
              <Link href="/register/student" className="inline-flex items-center">
                Cadastre-se agora
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </Link>
            </Button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-24 pt-8 sm:px-8 lg:pb-32 lg:pt-0">
          <div className="max-w-xl lg:max-w-2xl">
            <h1 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white">
              Cada jogo de padel traz novos amigos e mais diversão.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
              O padel é o esporte ideal para você se manter em forma e se divertir. Junte-se à nossa comunidade, viva a
              emoção e conheça novos amigos.
            </p>
            <Button
              className="mt-10 h-12 gap-2 rounded-full border-0 px-8 text-base font-semibold text-zinc-950 shadow-lg transition hover:brightness-105"
              style={{ backgroundColor: LIME }}
              asChild
            >
              <Link href="/register/student">Experimente o padel hoje</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
