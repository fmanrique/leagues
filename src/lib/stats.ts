import { eq } from "drizzle-orm";
import { db, tables as t } from "@/db";

export interface StandingRow {
  equipoId: string; nombre: string; color: string; logoUrl: string | null;
  retirado: boolean;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dif: number; pts: number;
}

export interface GoleadorRow {
  jugadorId: string; equipoId: string; nombre: string; equipo: string; equipoColor: string; equipoLogoUrl: string | null; goles: number;
}

export interface TarjetasRow {
  jugadorId: string; equipoId: string; nombre: string; equipo: string; equipoColor: string; equipoLogoUrl: string | null;
  amarillas: number; rojas: number;
}

/** Tabla de posiciones de un torneo (solo partidos finalizados). */
export async function computeStandings(torneoId: string): Promise<StandingRow[]> {
  const [inscritos, partidos] = await Promise.all([
    db.query.torneoEquipos.findMany({
      where: (te, { eq: eqOp }) => eqOp(te.torneoId, torneoId),
      with: { equipo: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } } },
    }),
    db.query.partidos.findMany({
      where: (p, { and, eq: eqOp }) => and(eqOp(p.torneoId, torneoId), eqOp(p.estado, "finalizado")),
      columns: { equipoLocalId: true, equipoVisitanteId: true, golesLocal: true, golesVisitante: true },
    }),
  ]);

  const table = new Map<string, StandingRow>();
  for (const i of inscritos) {
    table.set(i.equipo.id, {
      equipoId: i.equipo.id,
      // La baja conserva su historial en la tabla, marcada y al final
      nombre: i.retirado ? `${i.equipo.nombre} (baja)` : i.equipo.nombre,
      color: i.equipo.colorLocal,
      logoUrl: i.equipo.logoUrl,
      retirado: i.retirado,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dif: 0, pts: 0,
    });
  }
  for (const p of partidos) {
    const l = table.get(p.equipoLocalId);
    const v = table.get(p.equipoVisitanteId);
    if (!l || !v || p.golesLocal == null || p.golesVisitante == null) continue;
    l.pj++; v.pj++;
    l.gf += p.golesLocal; l.gc += p.golesVisitante;
    v.gf += p.golesVisitante; v.gc += p.golesLocal;
    if (p.golesLocal > p.golesVisitante) { l.pg++; l.pts += 3; v.pp++; }
    else if (p.golesLocal < p.golesVisitante) { v.pg++; v.pts += 3; l.pp++; }
    else { l.pe++; v.pe++; l.pts++; v.pts++; }
  }
  return [...table.values()]
    .map((r) => ({ ...r, dif: r.gf - r.gc }))
    .sort((a, b) =>
      Number(a.retirado) - Number(b.retirado) ||
      b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || a.nombre.localeCompare(b.nombre));
}

/** Tabla de goleo del torneo. */
export async function computeGoleadores(torneoId: string, limit = 15): Promise<GoleadorRow[]> {
  const goles = await db
    .select({ jugadorId: t.goles.jugadorId })
    .from(t.goles)
    .innerJoin(t.partidos, eq(t.goles.partidoId, t.partidos.id))
    .where(eq(t.partidos.torneoId, torneoId));

  const conteo = new Map<string, number>();
  for (const g of goles) conteo.set(g.jugadorId, (conteo.get(g.jugadorId) ?? 0) + 1);
  if (conteo.size === 0) return [];

  const jugadores = await db.query.jugadores.findMany({
    where: (j, { inArray: inArr }) => inArr(j.id, [...conteo.keys()]),
    with: { equipo: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } } },
    columns: { id: true, nombre: true, apellidoPaterno: true },
  });

  return jugadores
    .map((j) => ({
      jugadorId: j.id,
      equipoId: j.equipo.id,
      nombre: `${j.nombre} ${j.apellidoPaterno}`.trim(),
      equipo: j.equipo.nombre,
      equipoColor: j.equipo.colorLocal,
      equipoLogoUrl: j.equipo.logoUrl,
      goles: conteo.get(j.id) ?? 0,
    }))
    .sort((a, b) => b.goles - a.goles || a.nombre.localeCompare(b.nombre))
    .slice(0, limit);
}

/** Jugadores con tarjetas del torneo (fair play). */
export async function computeTarjetas(torneoId: string, limit = 15): Promise<TarjetasRow[]> {
  const tarjetas = await db
    .select({ jugadorId: t.tarjetas.jugadorId, tipo: t.tarjetas.tipo })
    .from(t.tarjetas)
    .innerJoin(t.partidos, eq(t.tarjetas.partidoId, t.partidos.id))
    .where(eq(t.partidos.torneoId, torneoId));

  const conteo = new Map<string, { amarillas: number; rojas: number }>();
  for (const c of tarjetas) {
    const e = conteo.get(c.jugadorId) ?? { amarillas: 0, rojas: 0 };
    if (c.tipo === "amarilla") e.amarillas++; else e.rojas++;
    conteo.set(c.jugadorId, e);
  }
  if (conteo.size === 0) return [];

  const jugadores = await db.query.jugadores.findMany({
    where: (j, { inArray: inArr }) => inArr(j.id, [...conteo.keys()]),
    with: { equipo: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } } },
    columns: { id: true, nombre: true, apellidoPaterno: true },
  });

  return jugadores
    .map((j) => {
      const c = conteo.get(j.id) ?? { amarillas: 0, rojas: 0 };
      return {
        jugadorId: j.id,
        equipoId: j.equipo.id,
        nombre: `${j.nombre} ${j.apellidoPaterno}`.trim(),
        equipo: j.equipo.nombre,
        equipoColor: j.equipo.colorLocal,
        equipoLogoUrl: j.equipo.logoUrl,
        amarillas: c.amarillas,
        rojas: c.rojas,
      };
    })
    .sort((a, b) => b.rojas - a.rojas || b.amarillas - a.amarillas || a.nombre.localeCompare(b.nombre))
    .slice(0, limit);
}
