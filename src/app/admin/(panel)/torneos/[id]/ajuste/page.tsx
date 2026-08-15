import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import AjusteClient from "./AjusteClient";

export const metadata: Metadata = { title: "Ajustes del torneo" };

export default async function AjustePage({ params }: { params: Promise<{ id: string }> }) {
  const { ligaId } = await requireLigaAdmin();
  const { id } = await params;

  const torneo = await db.query.torneos.findFirst({
    where: (tr, { and, eq }) => and(eq(tr.id, id), eq(tr.ligaId, ligaId)),
    with: {
      equipos: { with: { equipo: { columns: { id: true, nombre: true, colorLocal: true, logoUrl: true } } } },
    },
  });
  if (!torneo) notFound();

  const partidos = await db.query.partidos.findMany({
    where: (p, { eq }) => eq(p.torneoId, torneo.id),
    orderBy: [asc(t.partidos.jornada), asc(t.partidos.fecha), asc(t.partidos.hora)],
    with: { cancha: { columns: { nombre: true } } },
    columns: {
      id: true, jornada: true, fecha: true, hora: true, estado: true,
      equipoLocalId: true, equipoVisitanteId: true,
    },
  });

  const n0 = torneo.equipos.length;
  const objetivo = torneo.partidosPorEquipo
    ?? (n0 >= 2 ? (torneo.formato === "ida_vuelta" ? 2 * (n0 - 1) : n0 - 1) : 0);

  return (
    <AjusteClient
      torneo={{
        id: torneo.id,
        nombre: torneo.nombre,
        estado: torneo.estado,
        objetivo,
      }}
      equipos={torneo.equipos.map((te) => ({
        id: te.equipo.id,
        nombre: te.equipo.nombre,
        color: te.equipo.colorLocal,
        logoUrl: te.equipo.logoUrl,
        retirado: te.retirado,
        jornadaRetiro: te.jornadaRetiro,
      }))}
      partidos={partidos.map((p) => ({
        id: p.id,
        jornada: p.jornada,
        fecha: p.fecha,
        hora: p.hora,
        estado: p.estado,
        canchaNombre: p.cancha?.nombre ?? "Por definir",
        localId: p.equipoLocalId,
        visitanteId: p.equipoVisitanteId,
      }))}
    />
  );
}
