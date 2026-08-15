import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLigaPublica, getEquiposPublicos } from "@/lib/public-data";
import { SectionTitle, TeamMark } from "@/components/public/shared";

export const revalidate = 60;

export const metadata: Metadata = { title: "Equipos" };

const RAMA_LABEL: Record<string, string> = {
  varonil: "Varonil",
  femenil: "Femenil",
  mixto: "Mixto",
};

export default async function EquiposPage({ params }: {
  params: Promise<{ liga: string }>;
}) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const equipos = await getEquiposPublicos(liga.id);

  return (
    <div>
      <SectionTitle>Equipos</SectionTitle>

      {equipos.length === 0 ? (
        <p className="text-ink-500 text-sm bg-white rounded-xl border border-ink-200 p-6 text-center">
          Aún no hay equipos registrados
        </p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {equipos.map((e) => (
            <Link
              key={e.id}
              href={`/${slug}/equipos/${e.id}`}
              className="group bg-white rounded-xl border border-ink-200 shadow-sm p-5 flex items-center gap-4 transition-shadow hover:shadow-md"
            >
              <TeamMark equipo={e} size={48} />
              <div className="min-w-0 flex-1">
                <p
                  className="font-bold text-ink-900 truncate transition-colors group-hover:[color:var(--lg-primario)]"
                >
                  {e.nombre}
                </p>
                <p className="text-xs text-ink-500 mt-0.5">{RAMA_LABEL[e.rama] ?? e.rama}</p>
                <p className="flex items-center gap-1.5 mt-2 text-[11px] text-ink-400">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full border border-ink-200"
                    style={{ backgroundColor: e.colorLocal }}
                    title="Color local"
                  />
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full border border-ink-200"
                    style={{ backgroundColor: e.colorVisitante }}
                    title="Color visitante"
                  />
                  <span className="ml-1">Local / Visitante</span>
                </p>
              </div>
              <span className="text-ink-300 group-hover:translate-x-0.5 transition-transform" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
