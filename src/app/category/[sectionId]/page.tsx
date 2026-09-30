import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PADEL_ACTIVITY_SECTIONS } from "@/lib/padel-activities";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ sectionId: string }> };

export function generateStaticParams() {
  return PADEL_ACTIVITY_SECTIONS.map((s) => ({ sectionId: s.id }));
}

export default async function CategoriaServicosPage({ params }: Props) {
  const { sectionId } = await params;
  const section = PADEL_ACTIVITY_SECTIONS.find((s) => s.id === sectionId);
  if (!section) notFound();

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Link
            href="/#categorias"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-[2rem]">{section.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Focos que pode escolher ao pedir uma aula nesta categoria ({section.activities.length}{" "}
            {section.activities.length === 1 ? "opção" : "opções"} no catálogo inicial).
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ul className="grid gap-3 sm:grid-cols-2">
          {section.activities.map((act, index) => (
            <li key={act.id}>
              <div
                className={cn(
                  "flex h-full min-h-[4.25rem] items-start gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4",
                  "shadow-sm shadow-black/20 transition hover:border-emerald-800/60 hover:bg-zinc-900/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-950/80 font-display text-sm font-bold tabular-nums text-emerald-400/90",
                    "ring-1 ring-emerald-800/40",
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[15px] font-medium leading-snug text-zinc-100">{act.label}</p>
                  {act.hasSides ? (
                    <p className="mt-2">
                      <span className="inline-flex rounded-md bg-zinc-800/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/95">
                        Direita e revés (D / R)
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
