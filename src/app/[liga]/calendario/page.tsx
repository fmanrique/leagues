import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneoDefault, getPartidosPublicos } from "@/lib/public-data";
import { MatchCard, SectionTitle, fmtFechaLarga } from "@/components/public/shared";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPublico({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string; jornada?: string }>;
}) {
  const { liga: slug } = await params;
  const { torneo: torneoParam, jornada: jornadaParam } = await searchParams;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) {
    return <p className="text-center py-20 text-ink-500">Aún no hay calendario publicado.</p>;
  }

  const partidos = await getPartidosPublicos(torneo.id);
  const jornadas = [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b);

  // Jornada por defecto: la primera con partidos pendientes; si no, la última
  const pendiente = partidos.find((p) => p.estado === "programado")?.jornada;
  const jornadaSel = jornadaParam && jornadas.includes(Number(jornadaParam))
    ? Number(jornadaParam)
    : pendiente ?? jornadas[jornadas.length - 1];

  const delDia = partidos.filter((p) => p.jornada === jornadaSel);
  const porFecha = new Map<string, typeof delDia>();
  for (const p of delDia) {
    const arr = porFecha.get(p.fecha) ?? [];
    arr.push(p);
    porFecha.set(p.fecha, arr);
  }

  return (
    <div>
      <SectionTitle
        action={
          <Link
            href={`/${slug}/rol?torneo=${torneo.id}&jornada=${jornadaSel}`}
            className="text-sm font-bold px-4 py-2 rounded-xl text-white whitespace-nowrap"
            style={{ backgroundColor: "var(--lg-primario)" }}
          >
            Rol de juegos ↗
          </Link>
        }
      >
        Calendario · {torneo.nombre}
      </SectionTitle>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {jornadas.map((j) => (
          <Link
            key={j}
            href={`/${slug}/calendario?torneo=${torneo.id}&jornada=${j}`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              j === jornadaSel
                ? "text-white border-transparent"
                : "bg-white border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
            style={j === jornadaSel ? { backgroundColor: "var(--lg-primario)" } : undefined}
          >
            J{j}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {[...porFecha.entries()].map(([fecha, lista]) => (
          <section key={fecha}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500 mb-3 capitalize">
              {fmtFechaLarga(fecha)}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {lista.map((p) => <MatchCard key={p.id} p={p} slug={slug} torneoId={torneo.id} />)}
            </div>
          </section>
        ))}
        {delDia.length === 0 && (
          <p className="text-center py-16 text-ink-500">Sin partidos en esta jornada</p>
        )}
      </div>
    </div>
  );
}
