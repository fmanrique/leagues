import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import PagosClient from "./PagosClient";

export const metadata: Metadata = { title: "Pagos" };

export default async function PagosPage() {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "arbitro") redirect("/admin");

  const soloEquipo = user.rol === "admin_equipo";
  if (soloEquipo && !user.equipoId) redirect("/admin");

  const pagos = await db
    .select({
      id: t.pagos.id,
      torneoId: t.pagos.torneoId,
      equipoId: t.pagos.equipoId,
      tipo: t.pagos.tipo,
      jornada: t.pagos.jornada,
      monto: t.pagos.monto,
      estado: t.pagos.estado,
      fecha: t.pagos.fecha,
      torneoNombre: t.torneos.nombre,
      equipoNombre: t.equipos.nombre,
      equipoColor: t.equipos.colorLocal,
    })
    .from(t.pagos)
    .innerJoin(t.torneos, eq(t.pagos.torneoId, t.torneos.id))
    .innerJoin(t.equipos, eq(t.pagos.equipoId, t.equipos.id))
    .where(
      soloEquipo
        ? and(eq(t.torneos.ligaId, ligaId), eq(t.pagos.equipoId, user.equipoId!))
        : eq(t.torneos.ligaId, ligaId)
    )
    .orderBy(desc(t.pagos.createdAt));

  const [equipos, torneos] = await Promise.all([
    db
      .select({ id: t.equipos.id, nombre: t.equipos.nombre })
      .from(t.equipos)
      .where(
        soloEquipo
          ? and(eq(t.equipos.ligaId, ligaId), eq(t.equipos.id, user.equipoId!))
          : eq(t.equipos.ligaId, ligaId)
      )
      .orderBy(t.equipos.nombre),
    db
      .select({ id: t.torneos.id, nombre: t.torneos.nombre })
      .from(t.torneos)
      .where(eq(t.torneos.ligaId, ligaId))
      .orderBy(t.torneos.nombre),
  ]);

  const canEdit = user.rol === "superadmin" || user.rol === "admin_liga";

  return <PagosClient pagos={pagos} equipos={equipos} torneos={torneos} canEdit={canEdit} />;
}
