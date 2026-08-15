"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";

export type ActionState = { error?: string; ok?: boolean };

const schema = z.object({
  id: z.string().uuid(),
  jornada: z.coerce.number().int("Jornada inválida").min(1, "Jornada inválida").max(999, "Jornada inválida"),
  equipoLocalId: z.string().uuid("Equipo local requerido"),
  equipoVisitanteId: z.string().uuid("Equipo visitante requerido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  canchaId: z.union([z.literal(""), z.string().uuid()]),
  arbitroId: z.union([z.literal(""), z.string().uuid()]),
  estado: z.enum(["programado", "en_curso", "suspendido", "cancelado", "finalizado"]),
  videoUrl: z.union([
    z.literal(""),
    z.string().trim().url("URL del video inválida").max(500, "URL del video demasiado larga"),
  ]),
});

export async function updatePartido(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    jornada: formData.get("jornada"),
    equipoLocalId: formData.get("equipoLocalId"),
    equipoVisitanteId: formData.get("equipoVisitanteId"),
    fecha: formData.get("fecha"),
    hora: formData.get("hora"),
    canchaId: formData.get("canchaId") ?? "",
    arbitroId: formData.get("arbitroId") ?? "",
    estado: formData.get("estado"),
    videoUrl: formData.get("videoUrl") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.equipoLocalId === d.equipoVisitanteId) {
    return { error: "Un equipo no puede jugar contra sí mismo" };
  }

  // El partido debe pertenecer a un torneo de la liga activa
  const partido = await db.query.partidos.findFirst({
    where: (p, { eq }) => eq(p.id, d.id),
    with: { torneo: { columns: { ligaId: true } } },
  });
  if (!partido || partido.torneo.ligaId !== ligaId) return { error: "Partido no encontrado" };

  const cambiaEquipos =
    d.equipoLocalId !== partido.equipoLocalId || d.equipoVisitanteId !== partido.equipoVisitanteId;
  if (cambiaEquipos) {
    // Los goles y tarjetas capturados referencian a los equipos del partido:
    // con historial, cambiar equipos dejaría la ficha y la tabla inconsistentes
    const [[{ n: goles }], [{ n: tarjetas }]] = await Promise.all([
      db.select({ n: count() }).from(t.goles).where(eq(t.goles.partidoId, d.id)),
      db.select({ n: count() }).from(t.tarjetas).where(eq(t.tarjetas.partidoId, d.id)),
    ]);
    if (partido.fichaCompletada || goles > 0 || tarjetas > 0) {
      return { error: "Este partido ya tiene ficha, goles o tarjetas capturadas; no se pueden cambiar los equipos" };
    }
    const inscritos = await db
      .select({ equipoId: t.torneoEquipos.equipoId })
      .from(t.torneoEquipos)
      .where(and(
        eq(t.torneoEquipos.torneoId, partido.torneoId),
        inArray(t.torneoEquipos.equipoId, [d.equipoLocalId, d.equipoVisitanteId])
      ));
    if (inscritos.length !== 2) return { error: "Ambos equipos deben estar inscritos en el torneo" };
  }
  // El resultado vive en la Ficha Arbitral: un finalizado no cambia de estado
  // aquí (pero sí puede corregir fecha/hora/cancha/árbitro y el video), y un
  // partido no finalizado no puede marcarse finalizado sin capturar la ficha
  if (partido.estado === "finalizado" && d.estado !== "finalizado") {
    return { error: "El resultado de un partido finalizado se maneja desde la Ficha Arbitral" };
  }
  if (partido.estado !== "finalizado" && d.estado === "finalizado") {
    return { error: "Para finalizar un partido captura su Ficha Arbitral" };
  }

  if (d.canchaId) {
    const c = await db.query.canchas.findFirst({
      where: (ca, { and, eq }) => and(eq(ca.id, d.canchaId), eq(ca.ligaId, ligaId)),
      columns: { id: true },
    });
    if (!c) return { error: "Cancha fuera de la liga" };
  }
  if (d.arbitroId) {
    const a = await db.query.arbitros.findFirst({
      where: (ar, { and, eq }) => and(eq(ar.id, d.arbitroId), eq(ar.ligaId, ligaId)),
      columns: { id: true },
    });
    if (!a) return { error: "Árbitro fuera de la liga" };
  }

  await db.update(t.partidos).set({
    jornada: d.jornada,
    equipoLocalId: d.equipoLocalId,
    equipoVisitanteId: d.equipoVisitanteId,
    fecha: d.fecha,
    hora: d.hora,
    canchaId: d.canchaId || null,
    arbitroId: d.arbitroId || null,
    estado: d.estado,
    videoUrl: d.videoUrl || null,
    updatedAt: new Date(),
  }).where(eq(t.partidos.id, d.id));

  revalidatePath("/admin/calendario");
  return { ok: true };
}
