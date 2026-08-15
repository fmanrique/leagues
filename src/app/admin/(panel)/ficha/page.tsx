import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { hoyMexico } from "@/lib/format";
import { requirePanelUser } from "@/lib/authz";
import FichaClient from "./FichaClient";

export const metadata: Metadata = { title: "Ficha Arbitral" };

export default async function FichaPage() {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "admin_equipo") redirect("/admin");

  const torneoIds = (
    await db.select({ id: t.torneos.id }).from(t.torneos).where(eq(t.torneos.ligaId, ligaId))
  ).map((r) => r.id);

  const partidos = torneoIds.length
    ? await db.query.partidos.findMany({
        where: (p, { and, inArray: inArr, ne, eq: eqOp }) =>
          user.rol === "arbitro"
            ? and(inArr(p.torneoId, torneoIds), ne(p.estado, "cancelado"), eqOp(p.arbitroId, user.arbitroId ?? "00000000-0000-0000-0000-000000000000"))
            : and(inArr(p.torneoId, torneoIds), ne(p.estado, "cancelado")),
        orderBy: [asc(t.partidos.fecha), asc(t.partidos.hora)],
        with: {
          torneo: { columns: { nombre: true } },
          equipoLocal: { columns: { id: true, nombre: true, colorLocal: true } },
          equipoVisitante: { columns: { id: true, nombre: true, colorLocal: true } },
          goles: true,
          tarjetas: true,
        },
      })
    : [];

  // Jugados/pasados primero (el más reciente arriba); los futuros después en orden cronológico
  const hoy = hoyMexico();
  const claveCrono = (p: (typeof partidos)[number]) => `${p.fecha} ${p.hora}`;
  partidos.sort((a, b) => {
    const aFuturo = a.fecha > hoy;
    const bFuturo = b.fecha > hoy;
    if (aFuturo !== bFuturo) return aFuturo ? 1 : -1;
    return aFuturo
      ? claveCrono(a).localeCompare(claveCrono(b))
      : claveCrono(b).localeCompare(claveCrono(a));
  });

  // Plantillas de todos los equipos que aparecen en los partidos listados
  const equipoIds = [...new Set(partidos.flatMap((p) => [p.equipoLocal.id, p.equipoVisitante.id]))];
  const jugadores = equipoIds.length
    ? await db.query.jugadores.findMany({
        where: (j, { and, inArray: inArr, eq: eqOp }) =>
          and(inArr(j.equipoId, equipoIds), eqOp(j.activo, true), eqOp(j.aprobado, true)),
        orderBy: (j, { asc: ascOp }) => ascOp(j.numero),
        columns: { id: true, equipoId: true, nombre: true, apellidoPaterno: true, numero: true },
      })
    : [];

  // Anotadores de fichas viejas que ya fueron dados de baja: se incluyen
  // marcados "(baja)" para que al editar la ficha no aparezcan como vacíos
  const idsActivos = new Set(jugadores.map((j) => j.id));
  const idsEnFichas = [...new Set(
    partidos.flatMap((p) => [...p.goles, ...p.tarjetas].map((e) => e.jugadorId))
  )].filter((id) => !idsActivos.has(id));
  const deBaja = idsEnFichas.length
    ? await db.query.jugadores.findMany({
        where: (j, { inArray: inArr }) => inArr(j.id, idsEnFichas),
        columns: { id: true, equipoId: true, nombre: true, apellidoPaterno: true, numero: true },
      })
    : [];

  return (
    <FichaClient
      partidos={partidos.map((p) => ({
        id: p.id,
        torneo: p.torneo.nombre,
        jornada: p.jornada,
        fecha: p.fecha,
        hora: p.hora,
        estado: p.estado,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
        fichaCompletada: p.fichaCompletada,
        fichaFechaCaptura: p.fichaFechaCaptura?.toISOString() ?? null,
        observaciones: p.fichaObservaciones ?? "",
        local: p.equipoLocal,
        visitante: p.equipoVisitante,
        goles: p.goles.map((g) => ({ jugadorId: g.jugadorId, equipoId: g.equipoId, minuto: g.minuto })),
        tarjetas: p.tarjetas.map((c) => ({ jugadorId: c.jugadorId, equipoId: c.equipoId, tipo: c.tipo, minuto: c.minuto })),
      }))}
      jugadores={[
        ...jugadores.map((j) => ({
          id: j.id,
          equipoId: j.equipoId,
          nombre: `#${j.numero} ${j.nombre} ${j.apellidoPaterno}`.trim(),
        })),
        ...deBaja.map((j) => ({
          id: j.id,
          equipoId: j.equipoId,
          nombre: `#${j.numero} ${j.nombre} ${j.apellidoPaterno} (baja)`.trim(),
        })),
      ]}
    />
  );
}
