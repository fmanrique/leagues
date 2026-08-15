import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLigaPublica, getEquiposPublicos, getTorneoDefault,
  getPartidosPublicos, getPlantillaPublica,
} from "@/lib/public-data";
import { computeStandings } from "@/lib/stats";
import { MatchCard, SectionTitle, TeamMark } from "@/components/public/shared";

export const revalidate = 60;

const RAMA_LABEL: Record<string, string> = {
  varonil: "Varonil",
  femenil: "Femenil",
  mixto: "Mixto",
};

async function getEquipoDeLiga(slug: string, equipoId: string) {
  const liga = await getLigaPublica(slug);
  if (!liga) return null;
  const equipos = await getEquiposPublicos(liga.id);
  const equipo = equipos.find((e) => e.id === equipoId);
  if (!equipo) return null;
  return { liga, equipo };
}

export async function generateMetadata({ params }: {
  params: Promise<{ liga: string; equipoId: string }>;
}): Promise<Metadata> {
  const { liga: slug, equipoId } = await params;
  const data = await getEquipoDeLiga(slug, equipoId);
  if (!data) return {};
  return { title: data.equipo.nombre };
}

export default async function EquipoDetallePage({ params, searchParams }: {
  params: Promise<{ liga: string; equipoId: string }>;
  searchParams: Promise<{ torneo?: string }>;
}) {
  const [{ liga: slug, equipoId }, { torneo: torneoParam }] = await Promise.all([params, searchParams]);
  const data = await getEquipoDeLiga(slug, equipoId);
  if (!data) notFound();
  const { liga, equipo } = data;

  // Respeta el torneo que el visitante está viendo (p. ej. uno del archivo)
  const torneo = await getTorneoDefault(liga.id, torneoParam);
  const [plantilla, tabla, partidos] = await Promise.all([
    getPlantillaPublica(equipo.id),
    torneo ? computeStandings(torneo.id) : Promise.resolve([]),
    torneo ? getPartidosPublicos(torneo.id) : Promise.resolve([]),
  ]);

  const fila = tabla.find((r) => r.equipoId === equipo.id);
  const posicion = fila ? tabla.indexOf(fila) + 1 : null;
  const partidosEquipo = partidos.filter(
    (p) => p.local.id === equipo.id || p.visitante.id === equipo.id,
  );

  const stats = fila
    ? [
        { label: "JJ", valor: fila.pj },
        { label: "G", valor: fila.pg },
        { label: "E", valor: fila.pe },
        { label: "P", valor: fila.pp },
        { label: "GF", valor: fila.gf },
        { label: "GC", valor: fila.gc },
        { label: "Pts", valor: fila.pts, destacado: true },
      ]
    : [];

  return (
    <div className="space-y-10">
      {/* Header del equipo */}
      <section className="bg-white rounded-2xl border border-ink-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <TeamMark equipo={equipo} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="brand-title text-2xl md:text-3xl text-ink-900 leading-tight">
              {equipo.nombre}
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              {RAMA_LABEL[equipo.rama] ?? equipo.rama}
              {torneo && fila && posicion ? ` · ${posicion}° en ${torneo.nombre}` : ""}
            </p>
          </div>
          <Link
            href={`/${slug}/equipos`}
            className="text-sm font-bold hover:underline"
            style={{ color: "var(--lg-primario)" }}
          >
            ← Todos los equipos
          </Link>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-ink-100 bg-ink-50 px-2 py-2.5 text-center"
                style={s.destacado
                  ? { backgroundColor: "color-mix(in srgb, var(--lg-acento) 10%, transparent)" }
                  : undefined}
              >
                <p
                  className="brand-title text-xl leading-none"
                  style={{ color: s.destacado ? "var(--lg-primario)" : undefined }}
                >
                  {s.valor}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Plantilla */}
        <section>
          <SectionTitle>Plantilla</SectionTitle>
          {plantilla.length === 0 ? (
            <p className="text-ink-500 text-sm bg-white rounded-xl border border-ink-200 p-6 text-center">
              Plantilla no publicada
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-ink-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                    <th className="px-3 py-3 font-semibold">Jugador</th>
                    <th className="px-4 py-3 font-semibold">Posición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {plantilla.map((j) => (
                    <tr key={j.id}>
                      <td className="px-4 py-2.5 text-center font-bold" style={{ color: "var(--lg-primario)" }}>
                        {j.numero ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-ink-900">
                        {`${j.nombre} ${j.apellidoPaterno}`.trim()}
                      </td>
                      <td className="px-4 py-2.5 text-ink-600 capitalize">{j.posicion ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Partidos del torneo */}
        <section>
          <SectionTitle>{torneo ? `Partidos · ${torneo.nombre}` : "Partidos"}</SectionTitle>
          {partidosEquipo.length === 0 ? (
            <p className="text-ink-500 text-sm bg-white rounded-xl border border-ink-200 p-6 text-center">
              Sin partidos en el torneo actual
            </p>
          ) : (
            <div className="space-y-3">
              {partidosEquipo.map((p) => <MatchCard key={p.id} p={p} slug={slug} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
