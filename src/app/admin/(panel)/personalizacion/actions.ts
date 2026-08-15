"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

const coloresSchema = z.object({
  colorPrimario: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color primario inválido"),
  colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color secundario inválido"),
  colorAcento: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color de acento inválido"),
});

export async function updateBranding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();

  const parsed = coloresSchema.safeParse({
    colorPrimario: formData.get("colorPrimario"),
    colorSecundario: formData.get("colorSecundario"),
    colorAcento: formData.get("colorAcento"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actual = await db.query.ligas.findFirst({
    where: (l, { eq }) => eq(l.id, ligaId),
    columns: { logoUrl: true, fondoRolUrl: true, fondoOgUrl: true },
  });

  const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  // Imágenes sustituidas: se borran del storage después de guardar la nueva URL
  const reemplazadas: (string | null)[] = [];

  try {
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      patch.logoUrl = await saveImage(logo, `ligas/${ligaId}/logo`);
      reemplazadas.push(actual?.logoUrl ?? null);
    }
    const fondo = formData.get("fondoRol");
    if (fondo instanceof File && fondo.size > 0) {
      patch.fondoRolUrl = await saveImage(fondo, `ligas/${ligaId}/fondo-rol`);
      reemplazadas.push(actual?.fondoRolUrl ?? null);
    }
    const fondoOg = formData.get("fondoOg");
    if (fondoOg instanceof File && fondoOg.size > 0) {
      patch.fondoOgUrl = await saveImage(fondoOg, `ligas/${ligaId}/fondo-og`);
      reemplazadas.push(actual?.fondoOgUrl ?? null);
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  await db.update(t.ligas).set(patch).where(eq(t.ligas.id, ligaId));
  // Sólo tras confirmar el cambio en la base soltamos los archivos viejos
  await Promise.all(reemplazadas.map(deleteImage));

  revalidatePath("/admin/personalizacion");
  return { ok: true };
}

export async function quitarImagen(formData: FormData): Promise<void> {
  const { ligaId } = await requireLigaAdmin();
  const cual = formData.get("cual");
  if (cual !== "logo" && cual !== "fondoRol" && cual !== "fondoOg") return;

  const actual = await db.query.ligas.findFirst({
    where: (l, { eq }) => eq(l.id, ligaId),
    columns: { logoUrl: true, fondoRolUrl: true, fondoOgUrl: true },
  });

  const campo =
    cual === "logo" ? { logoUrl: null }
    : cual === "fondoRol" ? { fondoRolUrl: null }
    : { fondoOgUrl: null };
  const urlVieja =
    cual === "logo" ? actual?.logoUrl
    : cual === "fondoRol" ? actual?.fondoRolUrl
    : actual?.fondoOgUrl;
  await db.update(t.ligas).set({ ...campo, updatedAt: new Date() }).where(eq(t.ligas.id, ligaId));
  await deleteImage(urlVieja);

  revalidatePath("/admin/personalizacion");
}
