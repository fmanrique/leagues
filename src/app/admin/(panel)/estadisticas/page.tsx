import type { Metadata } from "next";
import { db } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import { computeStandings, computeGoleadores, computeTarjetas } from "@/lib/stats";
import { TeamBadge, PageHeader } from "@/components/admin/ui";
import TorneoSelector from "./TorneoSelector";

export const metadata: Metadata = { title: "Estadísticas" };

export default async function EstadisticasPage({ searchParams }: {
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { ligaId } = await requirePanelUser();
  const { torneo: torneoParam } = await searchParams;

  const torneos = await db.query.torneos.findMany({
    where: (tr, { eq }) => eq(tr.ligaId, ligaId),
    orderBy: (tr, { desc }) => desc(tr.fechaInicio),
    columns: { id: true, nombre: true, estado: true },
  });

  const torneoId = torneos.find((tr) => tr.id === torneoParam)?.id
    ?? torneos.find((tr) => tr.estado === "en_curso")?.id
    ?? torneos[0]?.id
    ?? null;

  const [standings, goleadores, tarjetas] = torneoId
    ? await Promise.all([
        computeStandings(torneoId),
        computeGoleadores(torneoId),
        computeTarjetas(torneoId),
      ])
    : [[], [], []];

  return (
    <div>
      <PageHeader title="Estadísticas" subtitle="Tabla general, goleo y tarjetas">
        <TorneoSelector torneos={torneos} torneoActivo={torneoId} />
      </PageHeader>

      <div className="grid xl:grid-cols-5 gap-6">
        {/* Tabla de posiciones */}
        <section className="xl:col-span-3 bg-white rounded-xl border border-ink-200 shadow-sm overflow-x-auto">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold">Tabla de posiciones</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Equipo</th>
                <th className="px-2 py-3 font-semibold text-center">JJ</th>
                <th className="px-2 py-3 font-semibold text-center">G</th>
                <th className="px-2 py-3 font-semibold text-center">E</th>
                <th className="px-2 py-3 font-semibold text-center">P</th>
                <th className="px-2 py-3 font-semibold text-center">GF</th>
                <th className="px-2 py-3 font-semibold text-center">GC</th>
                <th className="px-2 py-3 font-semibold text-center">Dif</th>
                <th className="px-4 py-3 font-semibold text-center">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {standings.map((r, i) => (
                <tr key={r.equipoId} className={i < 4 ? "bg-lima-500/5" : undefined}>
                  <td className="px-4 py-2.5 font-bold text-ink-500">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <TeamBadge nombre={r.nombre} color={r.color} size={24} />
                      <span className="font-semibold text-ink-900">{r.nombre}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center">{r.pj}</td>
                  <td className="px-2 py-2.5 text-center">{r.pg}</td>
                  <td className="px-2 py-2.5 text-center">{r.pe}</td>
                  <td className="px-2 py-2.5 text-center">{r.pp}</td>
                  <td className="px-2 py-2.5 text-center">{r.gf}</td>
                  <td className="px-2 py-2.5 text-center">{r.gc}</td>
                  <td className="px-2 py-2.5 text-center">{r.dif > 0 ? `+${r.dif}` : r.dif}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-azul-600">{r.pts}</td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-ink-400">Sin datos aún</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="xl:col-span-2 space-y-6">
          {/* Goleo */}
          <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
            <h3 className="px-5 py-4 border-b border-ink-100 font-bold">Tabla de goleo</h3>
            <ol className="divide-y divide-ink-100">
              {goleadores.map((g, i) => (
                <li key={g.jugadorId} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`w-6 text-center font-bold ${i === 0 ? "text-lima-800" : "text-ink-400"}`}>{i + 1}</span>
                  <TeamBadge nombre={g.equipo} color={g.equipoColor} size={24} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink-900 truncate">{g.nombre}</span>
                    <span className="block text-xs text-ink-500 truncate">{g.equipo}</span>
                  </span>
                  <span className="font-bold text-azul-600">{g.goles}</span>
                </li>
              ))}
              {goleadores.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-400">Sin goles registrados</li>}
            </ol>
          </section>

          {/* Tarjetas */}
          <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
            <h3 className="px-5 py-4 border-b border-ink-100 font-bold">Tarjetas</h3>
            <ol className="divide-y divide-ink-100">
              {tarjetas.map((c) => (
                <li key={c.jugadorId} className="flex items-center gap-3 px-5 py-2.5">
                  <TeamBadge nombre={c.equipo} color={c.equipoColor} size={24} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink-900 truncate">{c.nombre}</span>
                    <span className="block text-xs text-ink-500 truncate">{c.equipo}</span>
                  </span>
                  {c.amarillas > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <span className="inline-block w-3 h-4 rounded-[2px] bg-amber-400" /> {c.amarillas}
                    </span>
                  )}
                  {c.rojas > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                      <span className="inline-block w-3 h-4 rounded-[2px] bg-red-500" /> {c.rojas}
                    </span>
                  )}
                </li>
              ))}
              {tarjetas.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-400">Sin tarjetas registradas</li>}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
