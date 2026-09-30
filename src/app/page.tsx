import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Instagram,
  MessageSquareQuote,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { HeroImageCarousel } from "@/components/landing/hero-image-carousel";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { PartnerMarquee } from "@/components/landing/partner-marquee";
import { HERO_CAROUSEL_SLIDES } from "@/lib/landing-media";
import { LANDING_PARTNERS } from "@/lib/landing-partners";

const ABOUT_IMAGE = {
  src: "/marketing/about-padel-pair.jpg",
  alt: "Dos jugadores de pádel sonriendo con sus palas en la pista",
  objectPosition: "center 40%",
} as const;

const coaches = [
  {
    name: "Javier Funes",
    role: "Coach",
    src: "/marketing/coach-javier-funes.jpg",
    alt: "Javier Funes, coach de pádel en la pista",
    objectPosition: "center 22%",
  },
  {
    name: "Ale Battipede",
    role: "Coach",
    src: "/marketing/coach-ale-battipede.jpg",
    alt: "Ale Battipede, coach de pádel en la pista",
    objectPosition: "center 22%",
  },
] as const;

const pillars = [
  {
    icon: CalendarDays,
    title: "Pedí tus clases",
    text: "Elegí a tu coach y el horario que mejor se adapte a vos. Enviá tu pedido en segundos.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Seguí tu progreso",
    text: "Mirá tu Overall después de cada clase y seguí tu evolución con claridad.",
  },
  {
    icon: MessageSquareQuote,
    title: "Recibí feedback",
    text: "Después de cada clase, tu coach deja observaciones claras para que sepas qué trabajar en el próximo entrenamiento.",
  },
] as const;

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-400">{children}</p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="mt-5 font-display text-[clamp(1.85rem,3.5vw,2.75rem)] font-semibold tracking-[-0.035em] text-[var(--ink)]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.8] text-zinc-500">{description}</p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page relative isolate antialiased [--brand:#2E5BFF]">
      <LandingHeader />

      {/* Hero */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden text-white">
        <div className="absolute inset-0">
          <HeroImageCarousel slides={HERO_CAROUSEL_SLIDES} intervalMs={6200} />
          <div
            className="absolute inset-0 z-[1] bg-[linear-gradient(115deg,rgba(8,10,16,0.9)_0%,rgba(8,10,16,0.55)_48%,rgba(8,10,16,0.3)_100%)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_65%_55%_at_85%_15%,rgba(46,91,255,0.24),transparent_58%)]"
            aria-hidden
          />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[74rem] flex-1 flex-col justify-center px-4 pb-16 pt-24 sm:px-10 sm:pb-28 sm:pt-28 lg:px-12">
          <div className="max-w-[22rem] motion-safe:animate-landing-rise sm:max-w-md lg:max-w-xl">
            <h1 className="font-display text-[2.6rem] font-semibold leading-[0.9] tracking-[-0.05em] sm:text-6xl lg:text-[4.35rem] xl:text-[4.75rem]">
              <span className="block">Entrena.</span>
              <span className="block">Mide.</span>
              <span className="block text-accent">Mejora.</span>
            </h1>
            <div className="mt-8 lg:mt-10">
              <Link
                href="/register/student"
                className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-[#111827] transition hover:bg-zinc-100 sm:h-12 sm:px-7 sm:text-[15px]"
              >
                Empezar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="partners" className="landing-surface border-b py-7 sm:py-8" style={{ borderColor: "var(--landing-line)" }}>
        <div className="mx-auto w-full max-w-[74rem] px-5 sm:px-8 lg:px-12">
          <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-400">
            Nuestros partners
          </p>
          <PartnerMarquee partners={LANDING_PARTNERS} />
        </div>
      </section>

      <section
        id="trayectoria"
        className="landing-surface scroll-mt-6 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
      >
        <div className="mx-auto grid w-full max-w-[74rem] items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <LandingReveal className="lg:col-span-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-400">
              Sobre nosotros
            </p>
            <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(1.85rem,3.5vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-[var(--ink)]">
              Formamos jugadores más <span className="text-accent">fuertes</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-[1.85] text-zinc-500 sm:text-[16px]">
              En +54 somos una academia de pádel con más de 10 años formando jugadores y compartiendo
              nuestra pasión por el juego. Combinamos coaches con experiencia, una metodología clara y
              seguimiento personalizado para que cada alumno avance, disfrute el proceso y alcance su
              mejor nivel.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t pt-7 sm:gap-6" style={{ borderColor: "var(--landing-line)" }}>
              {[
                { value: "+10", label: "Años enseñando" },
                { value: "1:1", label: "Seguimiento cercano" },
                { value: "360°", label: "Visión de tu progreso" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </LandingReveal>
          <LandingReveal variant="media" delayMs={80} className="lg:col-span-5">
            <div className="relative mx-auto aspect-[288/365] w-full max-w-[22.5rem] overflow-hidden rounded-[2rem] bg-zinc-100 sm:max-w-[26rem] lg:ml-auto lg:max-w-[28rem] dark:bg-zinc-800">
              <Image
                src={ABOUT_IMAGE.src}
                alt={ABOUT_IMAGE.alt}
                fill
                className="object-cover"
                style={{ objectPosition: ABOUT_IMAGE.objectPosition }}
                sizes="(min-width: 1024px) 28rem, 26rem"
              />
            </div>
          </LandingReveal>
        </div>
      </section>

      <section id="por-que" className="landing-surface-muted scroll-mt-6">
        <div className="mx-auto grid max-w-[74rem] items-center gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-0 lg:px-12 lg:py-32">
          <LandingReveal className="lg:pr-16 xl:pr-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-400">
              Por qué +54
            </p>
            <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(1.85rem,3.5vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--ink)]">
              Una academia para crecer en la <span className="text-accent">cancha.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-[1.85] text-zinc-500">
              Un lugar donde entrenar, compartir y disfrutar del pádel van de la mano.
            </p>
          </LandingReveal>
          <LandingReveal
            delayMs={80}
            className="lg:border-l lg:pl-16 xl:pl-20"
            style={{ borderColor: "var(--landing-line)" }}
          >
            <div className="flex items-center gap-5">
              <p className="font-display text-[clamp(4.25rem,9vw,7rem)] font-semibold leading-none tracking-[-0.06em] text-[var(--ink)]">
                +10
              </p>
              <p className="text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em] text-zinc-400">
                Años
                <br />
                de experiencia
              </p>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section
        id="como-funciona"
        className="landing-surface scroll-mt-6 px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
      >
        <div className="mx-auto w-full max-w-[74rem]">
          <LandingReveal>
            <SectionHeader
              eyebrow="Cómo funciona"
              title={
                <>
                  Entrená con foco. <span className="text-accent">Mejorá</span> con seguimiento.
                </>
              }
            />
          </LandingReveal>
          <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8 lg:mt-16 lg:gap-12">
            {pillars.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <LandingReveal delayMs={80 * i}>
                  <div className="group text-center transition duration-500 motion-safe:hover:-translate-y-1.5 sm:text-left">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-zinc-700 transition duration-500 group-hover:border-accent/40 group-hover:text-accent sm:mx-0" style={{ borderColor: "var(--landing-line)", backgroundColor: "var(--landing-bg)", color: "var(--landing-ink)" }}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-[15px]">{text}</p>
                  </div>
                </LandingReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="evolucion" className="landing-surface-muted scroll-mt-6">
        <div className="mx-auto grid max-w-[74rem] gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-12 lg:items-start lg:gap-16 lg:px-12 lg:py-32">
          <LandingReveal className="lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-400">
              Tu evolución
            </p>
            <h2 className="mt-5 max-w-[14ch] font-display text-[clamp(1.85rem,3.5vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--ink)]">
              Ves cómo mejorás, <span className="text-accent">clase a clase.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-[1.85] text-zinc-500">
              Mirá cómo evoluciona tu juego, entendé tu Overall y encontrá el próximo foco para seguir
              avanzando.
            </p>
          </LandingReveal>
          <ol className="lg:col-span-7">
            {[
              {
                n: "01",
                title: "Overall",
                text: "Una mirada simple de cómo venís en tu proceso.",
              },
              {
                n: "02",
                title: "Mapa técnico",
                text: "La evolución de tu juego, clase a clase.",
              },
              {
                n: "03",
                title: "Comentarios del coach",
                text: "Observaciones concretas para tu próximo entrenamiento.",
              },
            ].map(({ n, title, text }, i) => (
              <li key={title} className="border-t last:border-b" style={{ borderColor: "var(--landing-line)" }}>
                <LandingReveal delayMs={80 * i}>
                  <div className="grid gap-3 py-8 transition duration-500 motion-safe:hover:translate-x-1 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:items-start sm:gap-6 lg:py-9">
                    <span className="font-display text-sm font-semibold tracking-[0.12em] text-accent">
                      {n}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
                        {title}
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 sm:text-[15px]">
                        {text}
                      </p>
                    </div>
                  </div>
                </LandingReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="coaches" className="landing-surface scroll-mt-6 px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto w-full max-w-[74rem]">
          <LandingReveal className="mx-auto max-w-xl text-center">
            <SectionEyebrow>Equipo de coaches</SectionEyebrow>
            <h2 className="mt-5 font-display text-[clamp(1.85rem,3.5vw,2.75rem)] font-semibold tracking-[-0.035em] text-[var(--ink)]">
              Conocé al <span className="text-accent">equipo</span>
            </h2>
            <p className="mt-4 text-[15px] italic leading-[1.8] text-zinc-500">
              Profesionales experimentados dedicados a tu crecimiento.
            </p>
          </LandingReveal>
          <ul className="mx-auto mt-12 grid max-w-[22rem] grid-cols-2 gap-3 sm:mt-14 sm:max-w-lg sm:gap-5">
            {coaches.map((coach, i) => (
              <li key={coach.name}>
                <LandingReveal delayMs={100 * i} variant="media">
                  <article className="landing-media-zoom relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-100 sm:rounded-3xl dark:bg-zinc-800">
                    <Image
                      src={coach.src}
                      alt={coach.alt}
                      fill
                      className="object-cover"
                      style={{ objectPosition: coach.objectPosition }}
                      sizes="(min-width: 640px) 14rem, 42vw"
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
                      <p className="font-display text-[15px] font-semibold tracking-tight text-white sm:text-lg">
                        {coach.name}
                      </p>
                      <p className="mt-0.5 text-xs font-normal text-white/85 sm:text-sm">{coach.role}</p>
                    </div>
                  </article>
                </LandingReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#111827] px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_100%_50%,rgba(46,91,255,0.18),transparent_55%)]"
          aria-hidden
        />
        <LandingReveal className="relative mx-auto flex w-full max-w-[74rem] flex-col items-start justify-between gap-10 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.65rem)] font-semibold tracking-[-0.035em]">
              Solo aparecé. Nosotros nos ocupamos del resto.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-[1.8] text-white/50">
              Todo listo para que llegues, juegues y disfrutes.
            </p>
          </div>
          <Link
            href="/register/student"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#111827] transition hover:bg-zinc-100 sm:w-auto sm:shrink-0"
          >
            Crear cuenta
          </Link>
        </LandingReveal>
      </section>

      <footer className="landing-surface border-t" style={{ borderColor: "var(--landing-line)", color: "var(--landing-subtle)" }}>
        <div className="mx-auto grid max-w-[74rem] gap-12 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:px-12 lg:py-16">
          <div className="space-y-4">
            <BrandLogo href="/" imgClassName="h-10" />
            <p className="max-w-xs text-sm leading-relaxed">
              Todo listo para que llegues, juegues y disfrutes.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Navegación</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/" className="transition hover:text-[var(--ink)]">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#trayectoria" className="transition hover:text-[var(--ink)]">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="#por-que" className="transition hover:text-[var(--ink)]">
                  Por qué +54
                </Link>
              </li>
              <li>
                <Link href="#como-funciona" className="transition hover:text-[var(--ink)]">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="#evolucion" className="transition hover:text-[var(--ink)]">
                  Tu evolución
                </Link>
              </li>
              <li>
                <Link href="#coaches" className="transition hover:text-[var(--ink)]">
                  Coaches
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-[var(--ink)]">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/register/student" className="transition hover:text-[var(--ink)]">
                  Crear cuenta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Síguenos</h3>
            <div className="mt-4">
              <a
                href="https://www.instagram.com/mas54_academiadepadel/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[var(--brand)] hover:text-white"
                style={{ backgroundColor: "var(--landing-muted)", color: "var(--landing-ink)" }}
              >
                <Instagram className="h-5 w-5" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--landing-line)" }}>
          <div className="mx-auto max-w-[74rem] px-5 py-5 text-xs text-zinc-400 sm:px-8 lg:px-12">
            <span>© {new Date().getFullYear()} +54</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
