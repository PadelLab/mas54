import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Repeat2,
  Shield,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { LandingDemoRadar } from "@/components/landing/landing-demo-radar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HERO_CAROUSEL_SLIDES } from "@/lib/landing-media";

export const metadata: Metadata = {
  title: "Padel Lab — Opção C",
  description:
    "Landing premium: progresso, avaliação na agenda do clube e experiência do aluno — tudo em um só painel.",
};

const SHELL =
  "mx-auto w-full max-w-[min(100%,90rem)] px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8";

const heroSlide = HERO_CAROUSEL_SLIDES[2];
const aboutImage = HERO_CAROUSEL_SLIDES[1];
const communityImage = HERO_CAROUSEL_SLIDES[5];

const navItems = [
  { href: "#sobre", label: "Sobre" },
  { href: "#experiencia", label: "Experiência" },
  { href: "#avaliacao", label: "Avaliação" },
  { href: "#servicos", label: "Serviços" },
] as const;

const evaluationSteps = [
  {
    step: "01",
    title: "Registro após a aula",
    body: "No final de cada sessão, o professor registra sua performance de forma rápida e padronizada — sem papel nem folhas soltas.",
  },
  {
    step: "02",
    title: "Dimensões técnicas",
    body: "Seu perfil combina várias habilidades (consistência, leitura tática, controle, saque, resistência e posicionamento) em uma escala clara.",
  },
  {
    step: "03",
    title: "Overall e histórico",
    body: "Uma nota global resume a evolução geral e você pode acompanhar a tendência ao longo das semanas na sua área de aluno.",
  },
  {
    step: "04",
    title: "Feedback escrito",
    body: "Comentários personalizados por aula ajudam você a entender o que repetir, o que corrigir e o próximo foco de treino.",
  },
];

const experienceCards = [
  {
    slideIndex: 3,
    title: "Indicadores contínuos",
    subtitle: "Overall e histórico para você perceber tendências — não só o resultado do último treino.",
  },
  {
    slideIndex: 4,
    title: "Pedidos e confirmações",
    subtitle: "Você acompanha pedidos, estados e próximos passos sem saltar entre ferramentas diferentes.",
  },
  {
    slideIndex: 5,
    title: "Foco em cada tema",
    subtitle: "Categorias de atividades para você empilhar blocos de treino alinhados com o seu plano.",
  },
] as const;

const services = [
  {
    icon: Shield,
    title: "Defesa",
    description:
      "Paredes, lobs altos, recuperação de bolas difíceis e posicionamento defensivo com repetição guiada.",
    href: "/category/defensa",
    slideIndex: 3,
  },
  {
    icon: ArrowLeftRight,
    title: "Transição",
    description:
      "Do fundo à rede: bloqueios, recuperação de lobs e controle do ponto quando a janela se abre.",
    href: "/category/transicion",
    slideIndex: 1,
  },
  {
    icon: Zap,
    title: "Ataque",
    description:
      "Bandeja, víbora, smashes e decisões ofensivas sob pressão — para você fechar mais pontos com critério.",
    href: "/category/ataque",
    slideIndex: 2,
  },
  {
    icon: Repeat2,
    title: "Saque e devolução",
    description:
      "Como você inicia e responde ao ponto: direção, profundidade, variação e leitura do adversário.",
    href: "/category/servicios",
    slideIndex: 0,
  },
] as const;

const featurePillars = [
  { id: "treino", label: "Experiência de treino", active: false },
  { id: "comunidade", label: "Ritmo entre aulas", active: true },
  { id: "qualidade", label: "Qualidade da informação", active: false },
  { id: "satisfacao", label: "Satisfação e clareza", active: false },
] as const;

export default function OptionCLandingPage() {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.22] dark:opacity-[0.12]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(24, 24, 27, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(24, 24, 27, 0.05) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      {/* Hero + overlaid nav */}
      <section className="relative z-10 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-50">
          <div className={cn("pointer-events-auto flex h-16 items-center justify-between sm:h-[4.25rem]", SHELL)}>
            <Link href="/option-c" className="font-display text-lg font-bold tracking-tight text-white drop-shadow-sm">
              Padel<span className="text-accent"> Lab</span>
            </Link>
            <nav className="hidden items-center gap-7 text-sm font-medium text-white/85 md:flex" aria-label="Seções">
              {navItems.map(({ href, label }) => (
                <Link key={href} href={href} className="transition hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                Entrar
              </Link>
              <Button
                className="h-10 rounded-full border-0 bg-accent px-4 text-sm font-semibold text-white shadow-md shadow-black/25 hover:brightness-105 sm:px-5"
                asChild
              >
                <Link href="/register/student" className="inline-flex items-center gap-1.5">
                  Criar conta
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="absolute inset-0 min-h-[min(100dvh,44rem)] sm:min-h-[40rem] lg:min-h-[44rem]">
          <Image
            src={heroSlide.src}
            alt={heroSlide.alt}
            fill
            className="object-cover"
            style={{ objectPosition: heroSlide.objectPosition ?? "center" }}
            sizes="100vw"
            priority
            quality={90}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/78 to-zinc-950/55"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_75%_0%,rgba(232,93,4,0.18),transparent)]"
            aria-hidden
          />
        </div>

        <div
          className={cn(
            "relative z-10 flex min-h-[min(100dvh,44rem)] flex-col justify-end pb-16 pt-28 sm:min-h-[40rem] sm:pb-20 sm:pt-32 lg:min-h-[44rem] lg:pb-24 lg:pt-36",
            SHELL,
          )}
        >
          <div className="mb-8 inline-flex max-w-full items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 pr-4 text-sm text-white/95 shadow-lg shadow-black/20 backdrop-blur-md sm:mb-10">
            <div className="flex -space-x-2" aria-hidden>
              {["bg-emerald-400", "bg-amber-400", "bg-sky-400"].map((c) => (
                <span
                  key={c}
                  className={cn("inline-flex h-8 w-8 rounded-full border-2 border-zinc-900/40 ring-2 ring-white/20", c)}
                />
              ))}
            </div>
            <span className="font-medium tracking-tight">Treine com método — divirta-se na quadra.</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent-soft">Opção C · experiência completa</p>
          <h1 className="mt-4 max-w-[min(100%,42rem)] font-display text-[clamp(2.1rem,5.2vw,3.5rem)] font-bold leading-[1.04] tracking-tight text-white">
            Jogue. Evolua. Veja o progresso — o Padel Lab junta aulas, dados e agenda em um só lugar.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">
            Você segue o feedback aula a aula, consulta o radar técnico e gerencia agendamentos na agenda do clube — menos ruído,
            mais clareza para treinar com consistência.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              className="h-12 rounded-full border-0 bg-accent px-8 text-base font-semibold text-white shadow-lg shadow-black/25 hover:brightness-105"
              asChild
            >
              <Link href="/register/student">Começar como aluno</Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-full border-white/25 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/15"
              asChild
            >
              <Link href="#sobre">Descubra a história</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About + stats (two columns) */}
      <section id="sobre" className="relative z-10 scroll-mt-20 border-b border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-900/40 sm:py-24">
        <div className={SHELL}>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative aspect-[4/5] min-h-[18rem] w-full overflow-hidden rounded-[1.5rem] shadow-2xl shadow-zinc-900/15 ring-1 ring-zinc-900/5 sm:aspect-[3/4] lg:aspect-auto lg:min-h-[28rem]">
              <Image
                src={aboutImage.src}
                alt={aboutImage.alt}
                fill
                className="object-cover"
                style={{ objectPosition: aboutImage.objectPosition ?? "center" }}
                sizes="(min-width: 1024px) 42vw, 100vw"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Sobre o Padel Lab</p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.35rem] dark:text-white">
                Feito para quem leva o padel a sério — e quer ver o trabalho refletido em números e na agenda.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
                Coaching estruturado, avaliações alinhadas entre professores e uma área de aluno onde você vê pedidos,
                programação e evolução técnica — para não perder o fio da meada entre treinos.
              </p>
              <dl className="mt-10 grid gap-6 sm:grid-cols-3">
                {[
                  { k: "6 eixos", d: "Radar técnico", s: "Consistência, tática, controle, saque, resistência e posição." },
                  { k: "1 painel", d: "Tudo reunido", s: "Progresso, pedidos de aula e indicadores no mesmo fluxo." },
                  { k: "Após cada aula", d: "Feedback estruturado", s: "Registro imediato com comentários quando fizer sentido." },
                ].map((row) => (
                  <div key={row.d}>
                    <dt className="font-display text-2xl font-bold text-accent">{row.k}</dt>
                    <dd className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{row.d}</dd>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{row.s}</p>
                  </div>
                ))}
              </dl>
              <Button
                className="mt-10 h-12 rounded-full border-0 bg-zinc-900 px-8 text-base font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                asChild
              >
                <Link href="#avaliacao">Ver como avaliamos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Experience — facilities-style grid */}
      <section
        id="experiencia"
        className="relative z-10 scroll-mt-20 border-b border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:py-24"
      >
        <div className={SHELL}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Na plataforma</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                Onde cada sessão, pedido e métrica ganha contexto — sem folhas soltas nem telas desligadas.
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                aria-hidden
              >
                <ChevronLeft className="h-5 w-5" />
              </span>
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                aria-hidden
              >
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experienceCards.map((card) => {
              const slide = HERO_CAROUSEL_SLIDES[card.slideIndex];
              return (
                <li key={card.title} className="group">
                  <article className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-zinc-200/90 bg-zinc-50 shadow-sm transition hover:border-accent/30 hover:shadow-lg hover:shadow-zinc-900/[0.06] dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="relative aspect-[5/4] w-full overflow-hidden">
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        style={{ objectPosition: slide.objectPosition ?? "center" }}
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent opacity-80" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">{card.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{card.subtitle}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Community — split */}
      <section className="relative z-10 border-b border-zinc-200 dark:border-zinc-800">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[22rem] lg:min-h-[26rem]">
            <Image
              src={communityImage.src}
              alt={communityImage.alt}
              fill
              className="object-cover"
              style={{ objectPosition: communityImage.objectPosition ?? "center" }}
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-zinc-950/25" aria-hidden />
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-auto sm:max-w-sm">
              <div className="rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl shadow-black/25 backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Rede de treino</p>
                <p className="mt-2 font-display text-lg font-bold text-zinc-900 dark:text-white">
                  Professores registram; você vê o impacto no radar e no overall.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center bg-zinc-950 px-6 py-14 text-white sm:px-10 lg:px-16 lg:py-20">
            <Users className="h-10 w-10 text-accent" aria-hidden />
            <h2 className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Uma comunidade em torno da quadra — com dados que ligam alunos e equipe técnica.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Menos fricção entre pedir aulas, receber feedback e planejar o próximo foco. O Padel Lab traz o ritmo do
              clube para o mesmo painel em que você acompanha sua evolução.
            </p>
            <Button
              className="mt-10 h-12 w-fit rounded-full border-0 bg-white px-8 text-base font-semibold text-zinc-950 hover:bg-zinc-100"
              asChild
            >
              <Link href="/register/student">Criar conta de aluno</Link>
            </Button>
            <div className="mt-12 grid max-w-md gap-4 sm:grid-cols-2">
              {[
                { label: "Alunos com histórico", value: "Aulas + radar", bar: "w-[88%]" },
                { label: "Professores com registro", value: "Fluxo guiado", bar: "w-[92%]" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{m.label}</p>
                  <p className="mt-1 font-display text-lg font-bold text-white">{m.value}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={cn("h-full rounded-full bg-accent", m.bar)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights + testimonial */}
      <section className="relative z-10 border-b border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-900/35 sm:py-24">
        <div className={SHELL}>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">O que você sente no app</p>
              <ul className="mt-8 space-y-4" role="list">
                {featurePillars.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "font-display text-2xl font-semibold tracking-tight transition sm:text-3xl",
                      p.active ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600",
                    )}
                  >
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.5rem] ring-1 ring-zinc-900/5">
                <Image
                  src={HERO_CAROUSEL_SLIDES[2].src}
                  alt={HERO_CAROUSEL_SLIDES[2].alt}
                  fill
                  className="object-cover"
                  style={{ objectPosition: HERO_CAROUSEL_SLIDES[2].objectPosition ?? "center" }}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
              </div>
              <div className="absolute -bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md lg:-bottom-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 shrink-0 text-accent" aria-hidden />
                    <div>
                      <p className="font-display text-2xl font-bold">4.9</p>
                      <p className="text-xs text-zinc-500">Ilustrativo · foco em clareza do progresso</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
                    &ldquo;O que mais valorizo é ver o radar e o overall depois de cada bloco de aulas — deixa de ser
                    opinião solta e passo a treinar com objetivos.&rdquo;
                  </blockquote>
                  <p className="mt-4 text-xs font-semibold text-zinc-500">Inês M. · aluna (exemplo)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans / CTAs in cards */}
      <section className="relative z-10 bg-white py-16 dark:bg-zinc-950 sm:py-24">
        <div className={SHELL}>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="group relative flex min-h-[17rem] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-zinc-950 p-8 text-white shadow-xl sm:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Começar</p>
                <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Conta de aluno</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                  Acesso à área do aluno: pedidos, programação, radar, overall e histórico de avaliações — ideal para
                  quem treina de forma regular no clube.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-3xl font-bold text-white">Grátis</p>
                  <p className="text-sm text-zinc-500">Criar conta</p>
                </div>
                <Link
                  href="/register/student"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  Registrar
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <span
                className="pointer-events-none absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80"
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" />
              </span>
            </article>

            <article className="relative flex min-h-[17rem] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-zinc-200 shadow-lg dark:border-zinc-800">
              <Image
                src={HERO_CAROUSEL_SLIDES[0].src}
                alt={HERO_CAROUSEL_SLIDES[0].alt}
                fill
                className="object-cover"
                style={{ objectPosition: HERO_CAROUSEL_SLIDES[0].objectPosition ?? "center" }}
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/35" />
              <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white sm:p-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Ir mais fundo</p>
                  <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Aulas por categorias</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                    Escolha o tema da sessão — defesa, transição, ataque ou saque/devolução — e alinhe com o plano do seu
                    professor.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl font-bold">Por aula</p>
                    <p className="text-sm text-white/70">Agendamento na agenda do clube</p>
                  </div>
                  <Link
                    href="#servicos"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    Ver serviços
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
              <span
                className="pointer-events-none absolute bottom-6 right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white"
                aria-hidden
              >
                <ArrowRight className="h-5 w-5" />
              </span>
            </article>
          </div>
        </div>
      </section>

      {/* Assessment */}
      <section
        id="avaliacao"
        className="relative z-10 scroll-mt-20 border-y border-zinc-800 bg-zinc-950 py-16 text-zinc-100 sm:py-24"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-600/15 blur-[110px]" />
        </div>

        <div className={cn("relative", SHELL)}>
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Avaliação do aluno</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Como funciona, passo a passo</h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg">
              Cada aula deixa um rastro claro: o professor registra, você vê o impacto no radar e no overall — evolução com
              base em fatos, não em achismos.
            </p>
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <ol className="space-y-0">
              {evaluationSteps.map(({ step, title, body }, i) => (
                <li key={step} className="relative border-l border-zinc-700/80 py-6 pl-8 first:pt-0 last:pb-0 sm:pl-10">
                  <span
                    className="absolute left-0 top-8 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-[10px] font-bold text-accent sm:top-9"
                    aria-hidden
                  >
                    {step}
                  </span>
                  <h3 className="font-display text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">{body}</p>
                  {i === evaluationSteps.length - 1 ? (
                    <p className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
                      <Target className="h-4 w-4 shrink-0" aria-hidden />
                      Treine com objetivos — meça, ajuste, repita.
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-6">
              <div className="rounded-2xl bg-white p-4 dark:bg-zinc-950 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <BarChart3 className="h-5 w-5 text-accent" aria-hidden />
                  Mapa técnico (exemplo)
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Valores ilustrativos — seu gráfico reflete suas aulas reais.
                </p>
                <div className="mt-4">
                  <LandingDemoRadar className="border-zinc-200 shadow-none dark:border-zinc-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="relative z-10 scroll-mt-20 bg-zinc-50 py-16 dark:bg-zinc-900/30 sm:py-24">
        <div className={SHELL}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Categorias</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Escolha o foco de cada bloco de treino — alinhe com o que você precisa evoluir agora.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
              Defesa, transição, ataque ou saque e devolução: sessões pensadas para você trabalhar um tema de cada vez, com
              linguagem comum entre aluno e professor.
            </p>
          </div>

          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:gap-6">
            {services.map(({ icon: Icon, title, description, href, slideIndex }) => {
              const slide = HERO_CAROUSEL_SLIDES[slideIndex];
              return (
                <li key={title}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-zinc-200/90 bg-white shadow-sm transition hover:border-accent/25 hover:shadow-lg hover:shadow-zinc-900/[0.06] dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
                  >
                    <div className="relative aspect-[16/10] shrink-0 sm:aspect-auto sm:w-[42%] sm:min-h-[11rem]">
                      <Image
                        src={slide.src}
                        alt=""
                        fill
                        className="object-cover"
                        style={{ objectPosition: slide.objectPosition ?? "center" }}
                        sizes="(min-width: 640px) 20vw, 100vw"
                        aria-hidden
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent transition group-hover:bg-accent/15">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                        {description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                        Ver categoria
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200 bg-zinc-50 py-14 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className={SHELL}>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-display text-xl font-bold text-zinc-900 dark:text-white">Fique por dentro das novidades</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Ainda não temos newsletter — enquanto isso, crie uma conta e explore a área de aluno com dados de exemplo no
                onboarding do clube.
              </p>
              <Button className="mt-6 h-11 rounded-full border-0 bg-accent px-6 text-sm font-semibold text-white hover:brightness-105" asChild>
                <Link href="/register/student">Criar conta</Link>
              </Button>
            </div>
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>Portugal · plataforma pensada para clubes e escolas de padel.</span>
              </p>
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>
                  Suporte via fluxos do app — comece em{" "}
                  <Link href="/login" className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-white">
                    Entrar
                  </Link>
                  .
                </span>
              </p>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500 sm:flex-row">
            <span className="font-display font-semibold text-zinc-800 dark:text-zinc-200">
              Padel<span className="text-accent"> Lab</span>
            </span>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/" className="font-medium hover:text-zinc-900 dark:hover:text-white">
                Site principal
              </Link>
              <Link href="/option-b" className="font-medium hover:text-zinc-900 dark:hover:text-white">
                Opção B
              </Link>
              <Link href="#sobre" className="font-medium hover:text-zinc-900 dark:hover:text-white">
                Sobre
              </Link>
              <Link href="/login" className="font-medium hover:text-zinc-900 dark:hover:text-white">
                Entrar
              </Link>
            </div>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
