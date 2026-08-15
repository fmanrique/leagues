import "server-only";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db, tables as t } from "@/db";
import type { SessionUser } from "@/lib/auth";

/**
 * Avisos internos del panel. `paraEquipoId` null → para los admins de la liga
 * (y superadmin); con valor → para el admin de ese equipo.
 */
export type TipoNotificacion =
  | "jugador_pendiente"
  | "foto_pendiente"
  | "jugador_aprobado"
  | "jugador_rechazado"
  | "foto_aprobada"
  | "foto_rechazada"
  | "cambios_pendientes"
  | "cambios_aprobados"
  | "cambios_rechazados"
  | "jugador_baja"
  | "reclamo_nuevo"
  | "reclamo_respuesta";

export async function emitirNotificacion(n: {
  ligaId: string;
  paraEquipoId?: string | null;
  tipo: TipoNotificacion;
  titulo: string;
  detalle?: string;
  url: string;
}): Promise<void> {
  await db.insert(t.notificaciones).values({
    ligaId: n.ligaId,
    paraEquipoId: n.paraEquipoId ?? null,
    tipo: n.tipo,
    titulo: n.titulo,
    detalle: n.detalle ?? "",
    url: n.url,
  });
}

/**
 * Condición de visibilidad según el rol; null → el rol no recibe avisos
 * (árbitros, o un admin de equipo sin equipo asignado).
 */
function filtroPara(user: SessionUser, ligaId: string): SQL | null {
  if (user.rol === "admin_equipo") {
    if (!user.equipoId) return null;
    return and(
      eq(t.notificaciones.ligaId, ligaId),
      eq(t.notificaciones.paraEquipoId, user.equipoId)
    )!;
  }
  if (user.rol === "arbitro") return null;
  // superadmin y admin_liga: las dirigidas a la liga
  return and(eq(t.notificaciones.ligaId, ligaId), isNull(t.notificaciones.paraEquipoId))!;
}

export async function contarNoLeidas(user: SessionUser, ligaId: string): Promise<number> {
  const filtro = filtroPara(user, ligaId);
  if (!filtro) return 0;
  const [{ n }] = await db.select({ n: count() }).from(t.notificaciones)
    .where(and(filtro, eq(t.notificaciones.leida, false)));
  return n;
}

export async function listarNotificaciones(user: SessionUser, ligaId: string, limite = 50) {
  const filtro = filtroPara(user, ligaId);
  if (!filtro) return [];
  return db.select().from(t.notificaciones)
    .where(filtro)
    .orderBy(desc(t.notificaciones.createdAt))
    .limit(limite);
}

/** Marca como leída (scoped al alcance del usuario). */
export async function marcarLeida(user: SessionUser, ligaId: string, id: string): Promise<void> {
  const filtro = filtroPara(user, ligaId);
  if (!filtro) return;
  await db.update(t.notificaciones).set({ leida: true })
    .where(and(filtro, eq(t.notificaciones.id, id)));
}

export async function marcarTodasLeidas(user: SessionUser, ligaId: string): Promise<void> {
  const filtro = filtroPara(user, ligaId);
  if (!filtro) return;
  await db.update(t.notificaciones).set({ leida: true })
    .where(and(filtro, eq(t.notificaciones.leida, false)));
}
