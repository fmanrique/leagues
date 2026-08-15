import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneoDefault, getPartidosPublicos, getCanchasDesports } from "@/lib/public-data";
import { hoyMexico } from "@/lib/format";
import { computeStandings, computeGoleadores } from "@/lib/stats";
import { fetchScheduleDesports, slotDePartido, videoVigente } from "@/lib/desports";
import { MatchCard, SectionTitle, TeamMark } from "@/components/public/shared";

export default async function LigaHome({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { liga: slug } = await params;
  const { torneo: torneoParam } = await searchParams;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) {
    return (
      <p className="text-center py-20 text-ink-500">
        Esta liga aún no tiene torneos publicados.
      </p>
    );
  }

  const [partidos, tabla, goleo] = await Promise.all([
    getPartidosPublicos(torneo.id),
    computeStandings(torneo.id),
    computeGoleadores(torneo.id, 5),
  ]);

  const hoy = hoyMexico();
  // Siguiente jornada COMPLETA: la del primer partido programado por venir
  // (si ya no hay futuros, la del primer programado pendiente)
  const programados = partidos.filter((p) => p.estado === "programado");
  const anclaProx = programados.find((p) => p.fecha >= hoy) ?? programados[0];
  const proximosFallback = anclaProx
    ? programados.filter((p) => p.jornada === anclaProx.jornada)
    : [];
  // Última jornada jugada COMPLETA
  const finalizados = partidos.filter((p) => p.estado === "finalizado");
  const anclaRec = finalizados[finalizados.length - 1];
  const recientes = anclaRec
    ? finalizados.filter((p) => p.jornada === anclaRec.jornada)
    : [];
  const lider = tabla[0];

  // Link al video de cada resultado reciente: la URL manual del partido tiene
  // prioridad; sin ella se resuelve automáticamente con el horario de cámaras
  // DE/SPORTS. Solo aquí (no en calendario): los videos viven ~1 semana.
  const videos = new Map<string, string>();
  for (const p of recientes) {
    if (p.videoUrl) videos.set(p.id, p.videoUrl);
  }
  const faltantes = recientes.filter((p) => !videos.has(p.id) && videoVigente(p.fecha, hoy));
  if (liga.desportsLigaId && faltantes.length) {
    const [schedule, courts] = await Promise.all([
      fetchScheduleDesports(liga.desportsLigaId),
      getCanchasDesports(liga.id),
    ]);
    if (schedule) {
      for (const p of faltantes) {
        if (!p.cancha) continue;
        const slot = slotDePartido(schedule.slots, {
          fecha: p.fecha,
          hora: p.hora,
          desportsCourt: courts.get(p.cancha) ?? null,
        });
        if (slot) videos.set(p.id, slot.url);
      }
    }
  }

  return (
    <div className="space-y-10">
      {/* Hero del torneo */}
      <section
        className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ backgroundColor: "var(--lg-secundario)" }}
      >
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20"
          style={{ backgroundColor: "var(--lg-primario)" }}
        />
        <div
          className="absolute -right-4 bottom-[-4rem] w-40 h-40 rounded-full opacity-15"
          style={{ backgroundColor: "var(--lg-acento)" }}
        />
        {/* Logo DE/SPORTS en grande al lado derecho */}
        <div className="hidden md:block absolute right-8 lg:right-12 top-1/2 -translate-y-1/2">
          <Image
            src="/brand/logo-blanco.png"
            alt="DE/SPORTS — Juega hoy, revívelo siempre"
            width={320}
            height={67}
            className="w-56 lg:w-80 h-auto drop-shadow-lg"
          />
        </div>
        <div className="relative md:pr-64 lg:pr-96">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--lg-acento)" }}>
            {torneo.estado === "en_curso" ? "Torneo en curso" : "Torneo finalizado"}
          </p>
          <h1 className="brand-title text-3xl md:text-4xl mb-4">{torneo.nombre}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/85">
            <span><strong className="text-white">{tabla.length}</strong> equipos</span>
            <span><strong className="text-white">{partidos.filter((p) => p.estado === "finalizado").length}</strong> partidos jugados</span>
            <span>
              <strong className="text-white">
                {partidos.reduce((s, p) => s + (p.golesLocal ?? 0) + (p.golesVisitante ?? 0), 0)}
              </strong>{" "}
              goles
            </span>
            {lider && lider.pj > 0 && (
              <span className="flex items-center gap-1.5">
                Líder: <TeamMark equipo={{ id: lider.equipoId, nombre: lider.nombre, colorLocal: lider.color, logoUrl: lider.logoUrl }} size={20} />
                <Link href={`/${slug}/equipos/${lider.equipoId}?torneo=${torneo.id}`} className="font-bold text-white hover:underline">{lider.nombre}</Link>
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <SectionTitle
              action={<Link href={`/${slug}/calendario?torneo=${torneo.id}`} className="text-sm font-bold hover:underline" style={{ color: "var(--lg-primario)" }}>Ver calendario →</Link>}
            >
              {proximosFallback.length > 0 && proximosFallback[0].fecha < hoy ? "Partidos pendientes" : "Próximos partidos"}{proximosFallback.length > 0 && <span className="text-ink-400 font-semibold text-base"> · Jornada {proximosFallback[0].jornada}</span>}
            </SectionTitle>
            {proximosFallback.length === 0 ? (
              <p className="text-ink-500 text-sm bg-white rounded-xl border border-ink-200 p-6 text-center">Sin partidos programados</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {proximosFallback.map((p) => <MatchCard key={p.id} p={p} slug={slug} torneoId={torneo.id} />)}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>
              Últimos resultados{recientes.length > 0 && <span className="text-ink-400 font-semibold text-base"> · Jornada {recientes[0].jornada}</span>}
            </SectionTitle>
            {recientes.length === 0 ? (
              <p className="text-ink-500 text-sm bg-white rounded-xl border border-ink-200 p-6 text-center">Aún no hay resultados</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {recientes.map((p) => <MatchCard key={p.id} p={p} slug={slug} torneoId={torneo.id} videoUrl={videos.get(p.id)} />)}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <SectionTitle
              action={<Link href={`/${slug}/tabla?torneo=${torneo.id}`} className="text-sm font-bold hover:underline" style={{ color: "var(--lg-primario)" }}>Completa →</Link>}
            >
              Tabla
            </SectionTitle>
            <div className="bg-white rounded-xl border border-ink-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                    <th className="px-3 py-2.5 font-semibold">#</th>
                    <th className="px-2 py-2.5 font-semibold">Equipo</th>
                    <th className="px-2 py-2.5 font-semibold text-center">JJ</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {tabla.map((r, i) => (
                    <tr key={r.equipoId}>
                      <td className="px-3 py-2 font-bold text-ink-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <span className="flex items-center gap-2">
                          <TeamMark equipo={{ id: r.equipoId, nombre: r.nombre, colorLocal: r.color, logoUrl: r.logoUrl }} size={24} />
                          <Link href={`/${slug}/equipos/${r.equipoId}?torneo=${torneo.id}`} className="font-semibold text-ink-900 truncate hover:underline">{r.nombre}</Link>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-ink-600">{r.pj}</td>
                      <td className="px-3 py-2 text-center font-bold" style={{ color: "var(--lg-primario)" }}>{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <SectionTitle
              action={<Link href={`/${slug}/goleo?torneo=${torneo.id}`} className="text-sm font-bold hover:underline" style={{ color: "var(--lg-primario)" }}>Completo →</Link>}
            >
              Goleo
            </SectionTitle>
            <ol className="bg-white rounded-xl border border-ink-200 shadow-sm divide-y divide-ink-100">
              {goleo.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-400">Sin goles registrados</li>}
              {goleo.map((g, i) => (
                <li key={g.jugadorId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-5 text-center font-bold ${i === 0 ? "" : "text-ink-400"}`} style={i === 0 ? { color: "var(--lg-primario)" } : undefined}>
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink-900 truncate">{g.nombre}</span>
                    <Link href={`/${slug}/equipos/${g.equipoId}?torneo=${torneo.id}`} className="block text-xs text-ink-500 truncate hover:underline">{g.equipo}</Link>
                  </span>
                  <span className="font-bold" style={{ color: "var(--lg-primario)" }}>{g.goles}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
