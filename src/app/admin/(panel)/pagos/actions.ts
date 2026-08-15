"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";

export type ActionState = { error?: string; ok?: boolean };

const pagoSchema = z.object({
  torneoId: z.string().uuid("Torneo inválido"),
  equipoId: z.string().uuid("Equipo inválido"),
  tipo: z.enum(["inscripcion", "arbitraje", "multa", "horario_fijo", "otro"]),
  jornada: z.coerce.number().int().min(1).max(999).nullish(),
  monto: z.coerce.number().positive("Monto inválido").max(9_999_999, "Monto inválido"),
  estado: z.enum(["pendiente", "pagado", "cancelado"]),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").nullish(),
});

function parseForm(formData: FormData) {
  return pagoSchema.safeParse({
    torneoId: formData.get("torneoId"),
    equipoId: formData.get("equipoId"),
    tipo: formData.get("tipo"),
    jornada: formData.get("jornada") || null,
    monto: formData.get("monto"),
    estado: formData.get("estado") ?? "pendiente",
    fecha: formData.get("fecha") || null,
  });
}

function hoy(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
}

/** El torneo determina el tenant: verifica que pertenezca a la liga activa. */
async function torneoEnLiga(torneoId: string, ligaId: string): Promise<boolean> {
  const torneo = await db.query.torneos.findFirst({
    where: (tr, { eq, and }) => and(eq(tr.id, torneoId), eq(tr.ligaId, ligaId)),
    columns: { id: true },
  });
  return !!torneo;
}

async function equipoEnLiga(equipoId: string, ligaId: string): Promise<boolean> {
  const equipo = await db.query.equipos.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, equipoId), eq(e.ligaId, ligaId)),
    columns: { id: true },
  });
  return !!equipo;
}

/** Un pago pertenece a la liga si su torneo pertenece a la liga. */
async function pagoEnLiga(pagoId: string, ligaId: string): Promise<boolean> {
  const rows = await db
    .select({ id: t.pagos.id })
    .from(t.pagos)
    .innerJoin(t.torneos, eq(t.torneos.id, t.pagos.torneoId))
    .where(and(eq(t.pagos.id, pagoId), eq(t.torneos.ligaId, ligaId)));
  return rows.length > 0;
}

export async function createPago(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!(await torneoEnLiga(d.torneoId, ligaId))) return { error: "Torneo no encontrado en la liga" };
  if (!(await equipoEnLiga(d.equipoId, ligaId))) return { error: "Equipo no encontrado en la liga" };
  await db.insert(t.pagos).values({
    torneoId: d.torneoId,
    equipoId: d.equipoId,
    tipo: d.tipo,
    jornada: d.jornada ?? null,
    monto: d.monto.toFixed(2),
    estado: d.estado,
    fecha: d.estado === "pagado" ? (d.fecha ?? hoy()) : null,
  });
  revalidatePath("/admin/pagos");
  return { ok: true };
}

export async function updatePago(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!(await pagoEnLiga(id.data, ligaId))) return { error: "Pago no encontrado" };
  if (!(await torneoEnLiga(d.torneoId, ligaId))) return { error: "Torneo no encontrado en la liga" };
  if (!(await equipoEnLiga(d.equipoId, ligaId))) return { error: "Equipo no encontrado en la liga" };
  await db.update(t.pagos).set({
    torneoId: d.torneoId,
    equipoId: d.equipoId,
    tipo: d.tipo,
    jornada: d.jornada ?? null,
    monto: d.monto.toFixed(2),
    estado: d.estado,
    fecha: d.estado === "pagado" ? (d.fecha ?? hoy()) : null,
    updatedAt: new Date(),
  }).where(eq(t.pagos.id, id.data));
  revalidatePath("/admin/pagos");
  return { ok: true };
}

/** Acción rápida: marcar un pago pendiente como pagado con fecha de hoy. */
export async function marcarPagado(formData: FormData): Promise<void> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  if (!(await pagoEnLiga(id.data, ligaId))) return;
  await db.update(t.pagos)
    .set({ estado: "pagado", fecha: hoy(), updatedAt: new Date() })
    .where(eq(t.pagos.id, id.data));
  revalidatePath("/admin/pagos");
}

export async function deletePago(formData: FormData): Promise<void> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  if (!(await pagoEnLiga(id.data, ligaId))) return;
  await db.delete(t.pagos).where(eq(t.pagos.id, id.data));
  revalidatePath("/admin/pagos");
}
