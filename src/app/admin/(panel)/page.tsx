import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, asc, eq, gte, lte, inArray, or, ne } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireUser, requireLigaId } from "@/lib/auth";
import { fmtFechaCorta, hoyMexico, plural } from "@/lib/format";
import { ESTADO_PARTIDO, estadoInfo } from "@/lib/labels";
import { Icon, type IconName } from "@/components/admin/icons";
import { PageHeader, Badge, TeamBadge, EmptyState } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const ligaId = await requireLigaId(user);

  const torneoIds = (
    await db.select({ id: t.torneos.id }).from(t.torneos).where(eq(t.torneos.ligaId, ligaId))
  ).map((r) => r.id);

  const partidoFilter = torneoIds.length
    ? inArray(t.partidos.torneoId, torneoIds)
    : eq(t.partidos.torneoId, "00000000-0000-0000-0000-000000000000");

  const [equiposCount, jugadoresCount, torneosActivos, jugados, siguientePartido, ultimoPartido] =
    await Promise.all([
      db.select({ n: count() }).from(t.equipos).where(eq(t.equipos.ligaId, ligaId)),
      db.select({ n: count() }).from(t.jugadores)
        .innerJoin(t.equipos, eq(t.jugadores.equipoId, t.equipos.id))
        .where(eq(t.equipos.ligaId, ligaId)),
      db.select({ n: count() }).from(t.torneos)
        .where(and(eq(t.torneos.ligaId, ligaId), eq(t.torneos.estado, "en_curso"))),
      db.select({ n: count() }).from(t.partidos)
        .where(and(partidoFilter, eq(t.partidos.estado, "finalizado"))),
      // Ancla de la SIGUIENTE jornada: el partido programado más próximo
      db.query.partidos.findFirst({
        where: (p, { and, eq }) =>
          and(partidoFilter, eq(p.estado, "programado"), gte(t.partidos.fecha, hoyMexico())),
        orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
        columns: { torneoId: true, jornada: true },
      }),
      // Ancla de la ÚLTIMA jornada jugada: el resultado más reciente
      db.query.partidos.findFirst({
        where: (p, { and, eq }) => and(partidoFilter, eq(p.estado, "finalizado")),
        orderBy: [desc(t.partidos.fecha), desc(t.partidos.hora)],
        columns: { torneoId: true, jornada: true },
      }),
    ]);

  // Jornada completa de cada ancla (todos los partidos, no solo 5)
  const [proximos, recientes] = await Promise.all([
    siguientePartido
      ? db.query.partidos.findMany({
          where: (p, { and, eq }) => and(
            eq(p.torneoId, siguientePartido.torneoId),
            eq(p.jornada, siguientePartido.jornada),
            eq(p.estado, "programado"),
          ),
          orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
          with: { equipoLocal: true, equipoVisitante: true, torneo: { columns: { nombre: true } } },
        })
      : Promise.resolve([]),
    ultimoPartido
      ? db.query.partidos.findMany({
          where: (p, { and, eq }) => and(
            eq(p.torneoId, ultimoPartido.torneoId),
            eq(p.jornada, ultimoPartido.jornada),
            eq(p.estado, "finalizado"),
          ),
          orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
          with: { equipoLocal: true, equipoVisitante: true, torneo: { columns: { nombre: true } } },
        })
      : Promise.resolve([]),
  ]);

  const stats: { icon: IconName; value: number; label: string; accent: string }[] = [
    { icon: "equipos", value: equiposCount[0].n, label: "Equipos", accent: "text-azul-600 bg-azul-600/10 border-l-azul-600" },
    { icon: "jugadores", value: jugadoresCount[0].n, label: "Jugadores", accent: "text-lima-800 bg-lima-500/15 border-l-lima-500" },
    { icon: "torneos", value: torneosActivos[0].n, label: "Torneos activos", accent: "text-azul-400 bg-azul-400/10 border-l-azul-400" },
    { icon: "calendario", value: jugados[0].n, label: "Partidos jugados", accent: "text-ink-700 bg-ink-700/10 border-l-ink-700" },
  ];

  const programado = estadoInfo(ESTADO_PARTIDO, "programado");
  const finalizado = estadoInfo(ESTADO_PARTIDO, "finalizado");

  // Partidos programados con un equipo dado de baja: pendientes de asignar
  const esAdminLiga = user.rol === "superadmin" || user.rol === "admin_liga";
  let pendientesAsignar: { torneoId: string; nombre: string; n: number }[] = [];
  if (esAdminLiga && torneoIds.length) {
    const bajas = await db.select({
      torneoId: t.torneoEquipos.torneoId,
      equipoId: t.torneoEquipos.equipoId,
      jornadaRetiro: t.torneoEquipos.jornadaRetiro,
    }).from(t.torneoEquipos)
      .where(and(inArray(t.torneoEquipos.torneoId, torneoIds), eq(t.torneoEquipos.retirado, true)));
    if (bajas.length) {
      const torneosConBaja = [...new Set(bajas.map((b) => b.torneoId))];
      const progs = await db.query.partidos.findMany({
        where: (p, { and: andOp, eq: eqOp }) => andOp(
          inArray(t.partidos.torneoId, torneosConBaja), eqOp(p.estado, "programado")),
        columns: { torneoId: true, jornada: true, equipoLocalId: true, equipoVisitanteId: true },
        with: { torneo: { columns: { nombre: true } } },
      });
      const retiro = new Map(bajas.map((b) => [`${b.torneoId}|${b.equipoId}`, b.jornadaRetiro ?? 0]));
      const porTorneo = new Map<string, { nombre: string; n: number }>();
      for (const p of progs) {
        const rl = retiro.get(`${p.torneoId}|${p.equipoLocalId}`);
        const rv = retiro.get(`${p.torneoId}|${p.equipoVisitanteId}`);
        if ((rl != null && p.jornada >= rl) || (rv != null && p.jornada >= rv)) {
          const acc = porTorneo.get(p.torneoId) ?? { nombre: p.torneo.nombre, n: 0 };
          acc.n++;
          porTorneo.set(p.torneoId, acc);
        }
      }
      pendientesAsignar = [...porTorneo.entries()].map(([torneoId, v]) => ({ torneoId, ...v }));
    }
  }

  // Lo propio de cada rol, antes que el resumen general de la liga
  const hoy = hoyMexico();
  const misPartidos = user.rol === "admin_equipo" && user.equipoId
    ? await db.query.partidos.findMany({
        where: (p, { and: andOp }) => andOp(
          partidoFilter,
          or(eq(t.partidos.equipoLocalId, user.equipoId!), eq(t.partidos.equipoVisitanteId, user.equipoId!)),
          eq(t.partidos.estado, "programado"),
          gte(t.partidos.fecha, hoy),
        ),
        orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
        limit: 4,
        with: { equipoLocal: true, equipoVisitante: true, torneo: { columns: { nombre: true } } },
      })
    : [];
  const misFichas = user.rol === "arbitro" && user.arbitroId
    ? await db.query.partidos.findMany({
        where: (p, { and: andOp }) => andOp(
          partidoFilter,
          eq(t.partidos.arbitroId, user.arbitroId!),
          ne(t.partidos.estado, "finalizado"),
          ne(t.partidos.estado, "cancelado"),
          lte(t.partidos.fecha, hoy),
        ),
        orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
        limit: 5,
        with: { equipoLocal: true, equipoVisitante: true, torneo: { columns: { nombre: true } } },
      })
    : [];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen de la liga activa" />

      {pendientesAsignar.length > 0 && (
        <section className="mb-8 space-y-2">
          {pendientesAsignar.map((b) => (
            <Link
              key={b.torneoId}
              href={`/admin/torneos/${b.torneoId}/ajuste`}
              className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 hover:bg-amber-100 transition"
            >
              <Icon name="calendario" className="w-5 h-5 text-amber-700 shrink-0" />
              <span className="text-sm font-semibold text-amber-800 flex-1">
                Tienes {plural(b.n, "partido pendiente", "partidos pendientes")} de asignar
                en <strong>{b.nombre}</strong> (equipo dado de baja)
              </span>
              <span className="text-xs font-bold text-amber-700 whitespace-nowrap">Ir a asignar →</span>
            </Link>
          ))}
        </section>
      )}

      {user.rol === "admin_equipo" && user.equipoId && (
        <section className="bg-white rounded-xl border border-ink-200 border-l-4 border-l-azul-600 shadow-sm mb-8">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold">Los próximos partidos de mi equipo</h3>
          {misPartidos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400">Tu equipo no tiene partidos programados por venir.</p>
          ) : (
            <ul className="p-4 grid sm:grid-cols-2 gap-3">
              {misPartidos.map((p) => (
                <li key={p.id} className="bg-ink-50 rounded-lg p-4 border border-ink-100">
                  <div className="text-xs text-ink-500 mb-2">
                    J{p.jornada} · {fmtFechaCorta(p.fecha)} · {p.hora} · {p.torneo.nombre}
                  </div>
                  <div className="grid grid-cols-[1fr_44px_1fr] items-center gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <TeamBadge nombre={p.equipoLocal.nombre} color={p.equipoLocal.colorLocal} size={24} />
                      <span className="text-sm font-medium truncate">{p.equipoLocal.nombre}</span>
                    </span>
                    <span className="text-ink-500 text-sm font-semibold text-center">vs</span>
                    <span className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="text-sm font-medium truncate text-right">{p.equipoVisitante.nombre}</span>
                      <TeamBadge nombre={p.equipoVisitante.nombre} color={p.equipoVisitante.colorLocal} size={24} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {user.rol === "arbitro" && user.arbitroId && (
        <section className="bg-white rounded-xl border border-ink-200 border-l-4 border-l-amber-400 shadow-sm mb-8">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold flex items-center justify-between">
            <span>Mis fichas por capturar</span>
            <Link href="/admin/ficha" className="text-xs font-bold text-azul-600 hover:text-azul-800">
              Ir a Ficha Arbitral →
            </Link>
          </h3>
          {misFichas.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400">No tienes fichas pendientes de captura. 👌</p>
          ) : (
            <ul className="p-4 space-y-2">
              {misFichas.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-ink-50 rounded-lg px-4 py-2.5 border border-ink-100 text-sm">
                  <span className="text-ink-800 font-medium">
                    {p.equipoLocal.nombre} vs {p.equipoVisitante.nombre}
                  </span>
                  <span className="text-xs text-ink-500">
                    J{p.jornada} · {fmtFechaCorta(p.fecha)} {p.hora} · {p.torneo.nombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const [text, bg, border] = s.accent.split(" ");
          return (
            <div key={s.label} className={`bg-white rounded-xl p-5 border border-ink-200 border-l-4 shadow-sm ${border}`}>
              <div className={`w-10 h-10 rounded-lg ${text} ${bg} flex items-center justify-center mb-3`}>
                <Icon name={s.icon} className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-ink-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold">
            Próximos partidos
            {proximos.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-ink-500">
                J{proximos[0].jornada} · {proximos[0].torneo.nombre}
              </span>
            )}
          </h3>
          {proximos.length === 0 ? (
            <EmptyState icon="calendario" text="Sin partidos próximos" />
          ) : (
            <ul className="p-4 space-y-3">
              {proximos.map((p) => (
                <li key={p.id} className="bg-ink-50 rounded-lg p-4 border border-ink-100">
                  <div className="flex items-center justify-between text-xs text-ink-500 mb-2">
                    <span>J{p.jornada} · {fmtFechaCorta(p.fecha)} · {p.hora}</span>
                    <Badge tone={programado.tone}>{programado.label}</Badge>
                  </div>
                  <div className="grid grid-cols-[1fr_64px_1fr] items-center gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <TeamBadge nombre={p.equipoLocal.nombre} color={p.equipoLocal.colorLocal} />
                      <span className="text-sm font-medium truncate">{p.equipoLocal.nombre}</span>
                    </span>
                    <span className="text-ink-500 text-sm font-semibold text-center">vs</span>
                    <span className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="text-sm font-medium truncate text-right">{p.equipoVisitante.nombre}</span>
                      <TeamBadge nombre={p.equipoVisitante.nombre} color={p.equipoVisitante.colorLocal} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold">
            Últimos resultados
            {recientes.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-ink-500">
                J{recientes[0].jornada} · {recientes[0].torneo.nombre}
              </span>
            )}
          </h3>
          {recientes.length === 0 ? (
            <EmptyState icon="estadisticas" text="Sin resultados aún" />
          ) : (
            <ul className="p-4 space-y-3">
              {recientes.map((p) => {
                const lWin = (p.golesLocal ?? 0) > (p.golesVisitante ?? 0);
                const vWin = (p.golesVisitante ?? 0) > (p.golesLocal ?? 0);
                return (
                  <li key={p.id} className="bg-ink-50 rounded-lg p-3 border border-ink-100">
                    <div className="flex items-center justify-between text-xs text-ink-500 mb-2">
                      <span>J{p.jornada} · {fmtFechaCorta(p.fecha)}</span>
                      <Badge tone={finalizado.tone}>{finalizado.label}</Badge>
                    </div>
                    <div className="grid grid-cols-[1fr_64px_1fr] items-center gap-2">
                      <span className={`flex items-center gap-2 min-w-0 ${lWin ? "text-ink-900 font-semibold" : "text-ink-500"}`}>
                        <TeamBadge nombre={p.equipoLocal.nombre} color={p.equipoLocal.colorLocal} size={24} />
                        <span className="text-sm truncate">{p.equipoLocal.nombre}</span>
                      </span>
                      <span className="font-bold whitespace-nowrap text-center">{p.golesLocal} - {p.golesVisitante}</span>
                      <span className={`flex items-center gap-2 min-w-0 justify-end ${vWin ? "text-ink-900 font-semibold" : "text-ink-500"}`}>
                        <span className="text-sm truncate text-right">{p.equipoVisitante.nombre}</span>
                        <TeamBadge nombre={p.equipoVisitante.nombre} color={p.equipoVisitante.colorLocal} size={24} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
