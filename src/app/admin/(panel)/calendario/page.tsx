import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import CalendarioClient from "./CalendarioClient";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPage({ searchParams }: {
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { user, ligaId } = await requirePanelUser();
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

  const partidos = torneoId
    ? await db.query.partidos.findMany({
        where: (p, { eq }) => eq(p.torneoId, torneoId),
        orderBy: [asc(t.partidos.jornada), asc(t.partidos.fecha), asc(t.partidos.hora)],
        with: {
          equipoLocal: { columns: { id: true, nombre: true, colorLocal: true } },
          equipoVisitante: { columns: { id: true, nombre: true, colorLocal: true } },
          cancha: { columns: { id: true, nombre: true } },
          arbitro: { columns: { id: true, nombre: true, apellido: true } },
        },
      })
    : [];

  const equiposTorneo = torneoId
    ? await db.query.torneoEquipos.findMany({
        where: (te, { eq }) => eq(te.torneoId, torneoId),
        with: { equipo: { columns: { id: true, nombre: true, horarioFijo: true } } },
      })
    : [];

  const [canchas, arbitros] = await Promise.all([
    db.query.canchas.findMany({
      where: (c, { and, eq }) => and(eq(c.ligaId, ligaId), eq(c.activo, true)),
      orderBy: (c, { asc }) => asc(c.nombre),
      columns: { id: true, nombre: true },
    }),
    db.query.arbitros.findMany({
      where: (a, { and, eq }) => and(eq(a.ligaId, ligaId), eq(a.activo, true)),
      orderBy: (a, { asc }) => asc(a.nombre),
      columns: { id: true, nombre: true, apellido: true },
    }),
  ]);

  return (
    <CalendarioClient
      torneos={torneos}
      torneoActivo={torneoId}
      partidos={partidos.map((p) => ({
        id: p.id,
        jornada: p.jornada,
        fecha: p.fecha,
        hora: p.hora,
        estado: p.estado,
        fichaCompletada: p.fichaCompletada,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
        canchaId: p.cancha?.id ?? "",
        canchaNombre: p.cancha?.nombre ?? "Por definir",
        arbitroId: p.arbitro?.id ?? "",
        arbitroNombre: p.arbitro ? `${p.arbitro.nombre} ${p.arbitro.apellido}`.trim() : "Por definir",
        videoUrl: p.videoUrl,
        local: p.equipoLocal,
        visitante: p.equipoVisitante,
      }))}
      equiposTorneo={equiposTorneo
        .map((te) => te.equipo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))}
      canchas={canchas}
      arbitros={arbitros.map((a) => ({ id: a.id, nombre: `${a.nombre} ${a.apellido}`.trim() }))}
      canEdit={user.rol === "superadmin" || user.rol === "admin_liga"}
    />
  );
}
