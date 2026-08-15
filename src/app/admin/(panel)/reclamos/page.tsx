import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import ReclamosClient, { type PartidoOpcion } from "./ReclamosClient";

export const metadata: Metadata = { title: "Reclamos" };

export default async function ReclamosPage() {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "arbitro") redirect("/admin");

  const soloEquipo = user.rol === "admin_equipo";
  if (soloEquipo && !user.equipoId) redirect("/admin");

  const local = alias(t.equipos, "local");
  const visitante = alias(t.equipos, "visitante");

  const rows = await db
    .select({
      id: t.reclamos.id,
      tipo: t.reclamos.tipo,
      descripcion: t.reclamos.descripcion,
      estado: t.reclamos.estado,
      respuesta: t.reclamos.respuesta,
      fechaRespuesta: t.reclamos.fechaRespuesta,
      createdAt: t.reclamos.createdAt,
      torneoNombre: t.torneos.nombre,
      equipoNombre: t.equipos.nombre,
      equipoColor: t.equipos.colorLocal,
      partidoJornada: t.partidos.jornada,
      partidoFecha: t.partidos.fecha,
      partidoLocal: local.nombre,
      partidoVisitante: visitante.nombre,
    })
    .from(t.reclamos)
    .innerJoin(t.torneos, eq(t.reclamos.torneoId, t.torneos.id))
    .innerJoin(t.equipos, eq(t.reclamos.equipoId, t.equipos.id))
    .leftJoin(t.partidos, eq(t.reclamos.partidoId, t.partidos.id))
    .leftJoin(local, eq(t.partidos.equipoLocalId, local.id))
    .leftJoin(visitante, eq(t.partidos.equipoVisitanteId, visitante.id))
    .where(
      soloEquipo
        ? and(eq(t.torneos.ligaId, ligaId), eq(t.reclamos.equipoId, user.equipoId!))
        : eq(t.torneos.ligaId, ligaId)
    )
    .orderBy(desc(t.reclamos.createdAt));

  const reclamos = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    fechaRespuesta: r.fechaRespuesta?.toISOString() ?? null,
  }));

  // Opciones para el modal de creación (solo admin_equipo)
  let torneos: { id: string; nombre: string }[] = [];
  let partidos: PartidoOpcion[] = [];
  if (soloEquipo) {
    torneos = await db
      .select({ id: t.torneos.id, nombre: t.torneos.nombre })
      .from(t.torneos)
      .where(eq(t.torneos.ligaId, ligaId))
      .orderBy(t.torneos.nombre);

    partidos = await db
      .select({
        id: t.partidos.id,
        torneoId: t.partidos.torneoId,
        jornada: t.partidos.jornada,
        fecha: t.partidos.fecha,
        localNombre: local.nombre,
        visitanteNombre: visitante.nombre,
      })
      .from(t.partidos)
      .innerJoin(t.torneos, eq(t.partidos.torneoId, t.torneos.id))
      .innerJoin(local, eq(t.partidos.equipoLocalId, local.id))
      .innerJoin(visitante, eq(t.partidos.equipoVisitanteId, visitante.id))
      .where(and(
        eq(t.torneos.ligaId, ligaId),
        or(eq(t.partidos.equipoLocalId, user.equipoId!), eq(t.partidos.equipoVisitanteId, user.equipoId!)),
      ))
      .orderBy(t.partidos.jornada);
  }

  const canRespond = user.rol === "superadmin" || user.rol === "admin_liga";

  return (
    <ReclamosClient
      reclamos={reclamos}
      torneos={torneos}
      partidos={partidos}
      canRespond={canRespond}
      canCreate={soloEquipo}
    />
  );
}
