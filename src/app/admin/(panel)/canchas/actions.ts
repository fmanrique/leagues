"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";

const canchaSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  direccion: z.string().trim().max(300).default(""),
  tipo: z.enum(["futbol_11", "futbol_7", "futbol_5"], { message: "Tipo inválido" }),
  superficie: z.enum(["pasto_natural", "pasto_sintetico", "cemento"], { message: "Superficie inválida" }),
  iluminacion: z.coerce.boolean(),
  activo: z.coerce.boolean(),
});

export type ActionState = { error?: string; ok?: boolean };

function parseForm(formData: FormData) {
  return canchaSchema.safeParse({
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion") ?? "",
    tipo: formData.get("tipo"),
    superficie: formData.get("superficie"),
    iluminacion: formData.get("iluminacion") === "on",
    activo: formData.get("activo") === "on",
  });
}

export async function createCancha(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.insert(t.canchas).values({ ...parsed.data, ligaId });
  revalidatePath("/admin/canchas");
  return { ok: true };
}

export async function updateCancha(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const res = await db
    .update(t.canchas)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(t.canchas.id, id.data), eq(t.canchas.ligaId, ligaId)))
    .returning({ id: t.canchas.id });
  if (!res.length) return { error: "Cancha no encontrada" };
  revalidatePath("/admin/canchas");
  return { ok: true };
}

export async function deleteCancha(formData: FormData): Promise<void> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await db.delete(t.canchas).where(and(eq(t.canchas.id, id.data), eq(t.canchas.ligaId, ligaId)));
  revalidatePath("/admin/canchas");
}
