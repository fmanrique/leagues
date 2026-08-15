"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";
import { db, tables as t } from "@/db";
import { requireUser, revokeOtherSessions } from "@/lib/auth";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

const schema = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual"),
    nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(128),
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })
  .refine((d) => d.nueva !== d.actual, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["nueva"],
  });

/** Cambio de contraseña propia — disponible para todos los roles. */
export async function cambiarPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const parsed = schema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = await db.query.usuarios.findFirst({
    where: (u, { eq }) => eq(u.id, session.id),
    columns: { id: true, passwordHash: true },
  });
  if (!row) return { error: "Usuario no encontrado" };

  const ok = await verify(row.passwordHash, parsed.data.actual);
  if (!ok) return { error: "La contraseña actual no es correcta" };

  await db
    .update(t.usuarios)
    .set({ passwordHash: await hash(parsed.data.nueva), updatedAt: new Date() })
    .where(eq(t.usuarios.id, session.id));

  // Quien tuviera la contraseña anterior queda fuera; esta sesión sigue viva.
  await revokeOtherSessions(session.id);
  return { ok: true };
}

/** Foto de perfil propia — disponible para todos los roles. */
export async function cambiarFoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();

  const row = await db.query.usuarios.findFirst({
    where: (u, { eq }) => eq(u.id, session.id),
    columns: { fotoUrl: true },
  });
  if (!row) return { error: "Usuario no encontrado" };

  let fotoUrl: string | null | undefined;
  try {
    const foto = formData.get("foto");
    if (foto instanceof File && foto.size > 0) {
      fotoUrl = await saveImage(foto, "usuarios");
    } else if (formData.get("fotoQuitar") === "on") {
      fotoUrl = null;
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  if (fotoUrl === undefined) return { error: "Selecciona una foto" };

  await db.update(t.usuarios).set({ fotoUrl, updatedAt: new Date() }).where(eq(t.usuarios.id, session.id));
  // Sólo tras confirmar el cambio en la base soltamos el archivo viejo
  await deleteImage(row.fotoUrl);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
