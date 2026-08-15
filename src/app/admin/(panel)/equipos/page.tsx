import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, eq, isNotNull, or, sql } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import { horariosDisponiblesPorEquipo } from "@/lib/torneo-slots";
import EquiposClient from "./EquiposClient";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage() {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "arbitro") redirect("/admin");

  const equipos = await db
    .select({
      id: t.equipos.id,
      nombre: t.equipos.nombre,
      logoUrl: t.equipos.logoUrl,
      colorLocal: t.equipos.colorLocal,
      colorVisitante: t.equipos.colorVisitante,
      rama: t.equipos.rama,
      categoriaAnioMin: t.equipos.categoriaAnioMin,
      categoriaAnioMax: t.equipos.categoriaAnioMax,
      categoriaLibre: t.equipos.categoriaLibre,
      entrenador: t.equipos.entrenador,
      telefono: t.equipos.telefono,
      email: t.equipos.email,
      activo: t.equipos.activo,
      horarioFijo: t.equipos.horarioFijo,
      horarioFijoMonto: t.equipos.horarioFijoMonto,
      jugadores: count(t.jugadores.id),
      // Altas y fotos que esperan visto bueno de la liga (badge "por aprobar")
      porAprobar: sql<number>`count(*) filter (where ${or(
        eq(t.jugadores.aprobado, false),
        and(eq(t.jugadores.aprobado, true), isNotNull(t.jugadores.fotoPendienteUrl))
      )})`.mapWith(Number),
    })
    .from(t.equipos)
    .leftJoin(t.jugadores, eq(t.jugadores.equipoId, t.equipos.id))
    .where(eq(t.equipos.ligaId, ligaId))
    .groupBy(t.equipos.id)
    .orderBy(t.equipos.nombre);

  const canEdit = user.rol === "superadmin" || user.rol === "admin_liga";

  // Horas elegibles como horario fijo de cada equipo (de sus torneos vigentes)
  const disponibles = await horariosDisponiblesPorEquipo(ligaId);

  return (
    <EquiposClient
      equipos={equipos.map((e) => ({ ...e, horariosDisponibles: disponibles.get(e.id) ?? [] }))}
      canEdit={canEdit}
    />
  );
}
