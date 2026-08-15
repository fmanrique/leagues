"use server";
import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin, requirePanelUser } from "@/lib/authz";
import { emitirNotificacion } from "@/lib/notificaciones";
import { TIPO_RECLAMO, ESTADO_RECLAMO } from "@/lib/labels";

export type ActionState = { error?: string; ok?: boolean };

// ── Crear reclamo (solo admin_equipo, a nombre de SU equipo) ─────────────────

const crearSchema = z.object({
  torneoId: z.string().uuid("Torneo inválido"),
  partidoId: z.string().uuid("Partido inválido").nullish(),
  tipo: z.enum(["protesta", "queja", "apelacion", "otro"]),
  descripcion: z.string().trim().min(10, "Describe el reclamo (mínimo 10 caracteres)").max(2000),
});

export async function createReclamo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol !== "admin_equipo") return { error: "Los reclamos los levanta el administrador de cada equipo" };
  if (!user.equipoId) return { error: "Tu usuario no tiene un equipo asignado; contacta al administrador de la liga" };

  const parsed = crearSchema.safeParse({
    torneoId: formData.get("torneoId"),
    partidoId: formData.get("partidoId") || null,
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // El torneo debe pertenecer a la liga activa
  const torneo = await db.query.torneos.findFirst({
    where: (tr, { eq, and }) => and(eq(tr.id, d.torneoId), eq(tr.ligaId, ligaId)),
    columns: { id: true },
  });
  if (!torneo) return { error: "Torneo no encontrado en la liga" };

  // El partido (opcional) debe ser de ese torneo e involucrar al equipo del usuario
  if (d.partidoId) {
    const [partido] = await db
      .select({ id: t.partidos.id })
      .from(t.partidos)
      .where(and(
        eq(t.partidos.id, d.partidoId),
        eq(t.partidos.torneoId, d.torneoId),
        or(eq(t.partidos.equipoLocalId, user.equipoId), eq(t.partidos.equipoVisitanteId, user.equipoId)),
      ));
    if (!partido) return { error: "Partido no válido para tu equipo" };
  }

  await db.insert(t.reclamos).values({
    torneoId: d.torneoId,
    equipoId: user.equipoId, // siempre el equipo del usuario, nunca del form
    partidoId: d.partidoId ?? null,
    tipo: d.tipo,
    descripcion: d.descripcion,
    estado: "pendiente",
  });
  const equipo = await db.query.equipos.findFirst({
    where: (e, { eq: eqOp }) => eqOp(e.id, user.equipoId!),
    columns: { nombre: true },
  });
  await emitirNotificacion({
    ligaId,
    tipo: "reclamo_nuevo",
    titulo: `Nuevo reclamo de ${equipo?.nombre ?? "un equipo"}`,
    detalle: `${TIPO_RECLAMO[d.tipo] ?? d.tipo}: ${d.descripcion.slice(0, 90)}${d.descripcion.length > 90 ? "…" : ""}`,
    url: "/admin/reclamos",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ── Responder reclamo (solo superadmin / admin_liga) ─────────────────────────

const responderSchema = z.object({
  id: z.string().uuid("No se pudo identificar el reclamo; recarga la página"),
  respuesta: z.string().trim().max(2000, "La respuesta admite máximo 2000 caracteres"),
  estado: z.enum(["pendiente", "en_revision", "resuelto", "rechazado"]),
}).refine((d) => d.respuesta.length > 0 || !["resuelto", "rechazado"].includes(d.estado), {
  message: "Para resolver o rechazar un reclamo, escribe la resolución",
  path: ["respuesta"],
});

export async function responderReclamo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = responderSchema.safeParse({
    id: formData.get("id"),
    respuesta: formData.get("respuesta"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // El reclamo pertenece a la liga si su torneo pertenece a la liga
  const [reclamo] = await db
    .select({ id: t.reclamos.id, equipoId: t.reclamos.equipoId })
    .from(t.reclamos)
    .innerJoin(t.torneos, eq(t.torneos.id, t.reclamos.torneoId))
    .where(and(eq(t.reclamos.id, d.id), eq(t.torneos.ligaId, ligaId)));
  if (!reclamo) return { error: "Reclamo no encontrado" };

  // Un textarea vacío NO borra una respuesta ya publicada: solo cambia estado
  const patchRespuesta = d.respuesta
    ? { respuesta: d.respuesta, fechaRespuesta: new Date() }
    : {};
  await db.update(t.reclamos).set({
    ...patchRespuesta,
    estado: d.estado,
    updatedAt: new Date(),
  }).where(eq(t.reclamos.id, d.id));
  await emitirNotificacion({
    ligaId,
    paraEquipoId: reclamo.equipoId,
    tipo: "reclamo_respuesta",
    titulo: `Tu reclamo cambió a: ${ESTADO_RECLAMO[d.estado]?.label ?? d.estado}`,
    detalle: d.respuesta ? d.respuesta.slice(0, 90) + (d.respuesta.length > 90 ? "…" : "") : "",
    url: "/admin/reclamos",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ── Eliminar reclamo propio (equipo, solo pendiente y sin respuesta) ─────────

export async function deleteReclamo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol !== "admin_equipo" || !user.equipoId) {
    return { error: "Solo el equipo que levantó el reclamo puede eliminarlo" };
  }
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar el reclamo; recarga la página" };

  const [reclamo] = await db
    .select({ id: t.reclamos.id, estado: t.reclamos.estado, respuesta: t.reclamos.respuesta })
    .from(t.reclamos)
    .innerJoin(t.torneos, eq(t.torneos.id, t.reclamos.torneoId))
    .where(and(
      eq(t.reclamos.id, id.data),
      eq(t.reclamos.equipoId, user.equipoId),
      eq(t.torneos.ligaId, ligaId),
    ));
  if (!reclamo) return { error: "Reclamo no encontrado" };
  if (reclamo.estado !== "pendiente" || reclamo.respuesta) {
    return { error: "El reclamo ya está en manos de la liga y no se puede eliminar" };
  }

  await db.delete(t.reclamos).where(eq(t.reclamos.id, id.data));
  revalidatePath("/admin/reclamos");
  return { ok: true };
}
