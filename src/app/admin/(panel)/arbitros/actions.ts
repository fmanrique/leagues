"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";

const arbitroSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  apellido: z.string().trim().max(120).default(""),
  fechaNacimiento: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")])
    .default(""),
  sexo: z.enum(["hombre", "mujer"], { message: "Sexo inválido" }),
  telefono: z.string().trim().max(32).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(160)]).default(""),
  activo: z.coerce.boolean(),
});

export type ActionState = { error?: string; ok?: boolean };

function parseForm(formData: FormData) {
  return arbitroSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido") ?? "",
    fechaNacimiento: formData.get("fechaNacimiento") ?? "",
    sexo: formData.get("sexo"),
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    activo: formData.get("activo") === "on",
  });
}

export async function createArbitro(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let fotoUrl: string | null = null;
  try {
    const foto = formData.get("foto");
    if (foto instanceof File && foto.size > 0) {
      fotoUrl = await saveImage(foto, `ligas/${ligaId}/arbitros`);
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  const { fechaNacimiento, ...data } = parsed.data;
  await db.insert(t.arbitros).values({ ...data, ligaId, fechaNacimiento: fechaNacimiento || null, fotoUrl });
  revalidatePath("/admin/arbitros");
  return { ok: true };
}

export async function updateArbitro(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [actual] = await db
    .select({ fotoUrl: t.arbitros.fotoUrl })
    .from(t.arbitros)
    .where(and(eq(t.arbitros.id, id.data), eq(t.arbitros.ligaId, ligaId)));
  if (!actual) return { error: "Árbitro no encontrado" };

  const patch: { fotoUrl?: string | null } = {};
  // Foto sustituida/quitada: se borra del storage después de confirmar el update
  let fotoVieja: string | null = null;
  try {
    const foto = formData.get("foto");
    if (foto instanceof File && foto.size > 0) {
      patch.fotoUrl = await saveImage(foto, `ligas/${ligaId}/arbitros`);
      fotoVieja = actual.fotoUrl;
    } else if (formData.get("fotoQuitar") === "on") {
      patch.fotoUrl = null;
      fotoVieja = actual.fotoUrl;
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  const { fechaNacimiento, ...data } = parsed.data;
  const res = await db
    .update(t.arbitros)
    .set({ ...data, ...patch, fechaNacimiento: fechaNacimiento || null, updatedAt: new Date() })
    .where(and(eq(t.arbitros.id, id.data), eq(t.arbitros.ligaId, ligaId)))
    .returning({ id: t.arbitros.id });
  if (!res.length) return { error: "Árbitro no encontrado" };
  // Sólo tras confirmar el cambio en la base soltamos el archivo viejo
  await deleteImage(fotoVieja);
  revalidatePath("/admin/arbitros");
  return { ok: true };
}

export async function deleteArbitro(formData: FormData): Promise<void> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const res = await db.delete(t.arbitros)
    .where(and(eq(t.arbitros.id, id.data), eq(t.arbitros.ligaId, ligaId)))
    .returning({ fotoUrl: t.arbitros.fotoUrl });
  if (res.length) await deleteImage(res[0].fotoUrl);
  revalidatePath("/admin/arbitros");
}
