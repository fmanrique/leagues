import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";

/** Liga pública por slug (solo activas), cacheada por request. */
export const getLigaPublica = cache(async (slug: string) => {
  return db.query.ligas.findFirst({
    where: (l, { and, eq: eqOp }) => and(eqOp(l.slug, slug), eqOp(l.activo, true)),
    columns: {
      id: true, slug: true, nombre: true, logoUrl: true,
      colorPrimario: true, colorSecundario: true, colorAcento: true,
      fondoRolUrl: true, fondoOgUrl: true, direccion: true, email: true, telefono: true,
      desportsLigaId: true,
    },
  });
});

/** Mapa nombre de cancha → nombre en DE/SPORTS (para enlazar videos). */
export const getCanchasDesports = cache(async (ligaId: string) => {
  const canchas = await db.query.canchas.findMany({
    where: (c, { eq: eqOp }) => eqOp(c.ligaId, ligaId),
    columns: { nombre: true, desportsCourt: true },
  });
  return new Map(canchas.filter((c) => c.desportsCourt).map((c) => [c.nombre, c.desportsCourt!]));
});

/** Torneos visibles públicamente (en curso o finalizados). */
export const getTorneosPublicos = cache(async (ligaId: string) => {
  return db.query.torneos.findMany({
    where: (tr, { and, eq: eqOp, inArray }) =>
      and(eqOp(tr.ligaId, ligaId), inArray(tr.estado, ["en_curso", "finalizado"])),
    orderBy: (tr, { desc }) => desc(tr.fechaInicio),
    columns: {
      id: true, nombre: true, rama: true, tipoFutbol: true, formato: true,
      fechaInicio: true, estado: true, categoriaLibre: true,
      categoriaAnioMin: true, categoriaAnioMax: true,
    },
  });
});

/** Torneo activo por defecto (en curso, o el más reciente). */
export async function getTorneoDefault(ligaId: string, torneoId?: string) {
  const torneos = await getTorneosPublicos(ligaId);
  return torneos.find((tr) => tr.id === torneoId)
    ?? torneos.find((tr) => tr.estado === "en_curso")
    ?? torneos[0]
    ?? null;
}

/** Partidos de un torneo con datos públicos, ordenados por jornada/fecha. */
export const getPartidosPublicos = cache(async (torneoId: string) => {
  const partidos = await db.query.partidos.findMany({
    where: (p, { eq: eqOp }) => eqOp(p.torneoId, torneoId),
    orderBy: [asc(t.partidos.jornada), asc(t.partidos.fecha), asc(t.partidos.hora)],
    with: {
      equipoLocal: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } },
      equipoVisitante: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } },
      cancha: { columns: { nombre: true, direccion: true } },
      arbitro: { columns: { nombre: true, apellido: true } },
    },
  });
  return partidos.map((p) => ({
    id: p.id,
    jornada: p.jornada,
    ronda: p.ronda,
    fecha: p.fecha,
    hora: p.hora,
    estado: p.estado,
    videoUrl: p.videoUrl,
    golesLocal: p.golesLocal,
    golesVisitante: p.golesVisitante,
    cancha: p.cancha?.nombre ?? null,
    arbitro: p.arbitro ? `${p.arbitro.nombre} ${p.arbitro.apellido}`.trim() : null,
    local: p.equipoLocal,
    visitante: p.equipoVisitante,
  }));
});

/** Equipos de una liga con conteo de jugadores (datos públicos). */
export const getEquiposPublicos = cache(async (ligaId: string) => {
  const equipos = await db.query.equipos.findMany({
    where: (e, { and, eq: eqOp }) => and(eqOp(e.ligaId, ligaId), eqOp(e.activo, true)),
    orderBy: (e, { asc: ascOp }) => ascOp(e.nombre),
    columns: { id: true, nombre: true, logoUrl: true, colorLocal: true, colorVisitante: true, rama: true },
  });
  return equipos;
});

/** Plantilla pública de un equipo (sin datos personales sensibles). */
export const getPlantillaPublica = cache(async (equipoId: string) => {
  return db.query.jugadores.findMany({
    where: (j, { and, eq: eqOp }) => and(eqOp(j.equipoId, equipoId), eqOp(j.activo, true), eqOp(j.aprobado, true)),
    orderBy: (j, { asc: ascOp }) => ascOp(j.numero),
    columns: { id: true, nombre: true, apellidoPaterno: true, numero: true, posicion: true, fotoUrl: true },
  });
});

/** Goles por jugador de un torneo (para stats públicas de equipo). */
export const getGolesDeEquipoEnTorneo = cache(async (torneoId: string, equipoId: string) => {
  const goles = await db
    .select({ jugadorId: t.goles.jugadorId })
    .from(t.goles)
    .innerJoin(t.partidos, eq(t.goles.partidoId, t.partidos.id))
    .where(eq(t.partidos.torneoId, torneoId));
  return goles;
});
