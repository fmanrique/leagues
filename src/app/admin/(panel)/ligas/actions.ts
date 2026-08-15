"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { db, tables as t } from "@/db";
import { requireUser } from "@/lib/auth";
import { constraintUnico } from "@/lib/db-errors";
import { fetchScheduleDesports } from "@/lib/desports";
import { importarCanchasDesports, decisionesDesports } from "@/lib/desports-import";

export type ActionState = { error?: string; ok?: boolean };

const ligaSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(160),
  slug: z.string().regex(/^[a-z0-9-]{3,64}$/, "Slug inválido (3–64 caracteres: a-z, 0-9 y guiones)"),
  direccion: z.string().trim().max(300).default(""),
  telefono: z.string().trim().max(32).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(160)]).default(""),
  desportsLigaId: z.string().trim().max(64).default(""),
  activo: z.coerce.boolean(),
});

const adminSchema = z.object({
  username: z.string().trim().min(3, "Usuario: mínimo 3 caracteres").max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Usuario: solo letras, números, punto, guion"),
  nombre: z.string().trim().min(1, "Nombre del administrador requerido").max(160),
  password: z.string().min(8, "Contraseña: mínimo 8 caracteres").max(128),
});

function parseLiga(formData: FormData) {
  return ligaSchema.safeParse({
    nombre: formData.get("nombre"),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    direccion: formData.get("direccion") ?? "",
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    desportsLigaId: formData.get("desportsLigaId") ?? "",
    activo: formData.get("activo") === "on",
  });
}

/** Valida el ID DE/SPORTS contra el API. Devuelve error o null. */
async function validarDesports(id: string): Promise<string | null> {
  if (!id) return null;
  const schedule = await fetchScheduleDesports(id);
  return schedule ? null : "El ID de liga DE/SPORTS no existe (compruébalo antes de guardar)";
}

function constraintError(e: unknown): string | null {
  const c = constraintUnico(e);
  if (c === "ligas_slug_unique") return "Ese slug ya existe";
  if (c === "usuarios_username_unique") return "Ese usuario ya existe";
  return null;
}

export async function createLiga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseLiga(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Primer usuario admin_liga (opcional)
  let admin: z.infer<typeof adminSchema> | null = null;
  if (formData.get("crearAdmin") === "on") {
    const parsedAdmin = adminSchema.safeParse({
      username: formData.get("adminUsername"),
      nombre: formData.get("adminNombre"),
      password: formData.get("adminPassword"),
    });
    if (!parsedAdmin.success) return { error: parsedAdmin.error.issues[0].message };
    admin = parsedAdmin.data;
  }

  const desportsId = parsed.data.desportsLigaId || null;
  const errDesports = await validarDesports(desportsId ?? "");
  if (errDesports) return { error: errDesports };

  const passwordHash = admin ? await hash(admin.password) : null;
  let nuevaLigaId = "";
  try {
    await db.transaction(async (tx) => {
      const [liga] = await tx.insert(t.ligas)
        .values({ ...parsed.data, desportsLigaId: desportsId })
        .returning({ id: t.ligas.id });
      nuevaLigaId = liga.id;
      if (admin && passwordHash) {
        await tx.insert(t.usuarios).values({
          ligaId: liga.id,
          username: admin.username,
          passwordHash,
          nombre: admin.nombre,
          rol: "admin_liga",
          activo: true,
        });
      }
    });
  } catch (e: unknown) {
    const msg = constraintError(e);
    if (msg) return { error: msg };
    throw e;
  }
  // Con ID DE/SPORTS: importar las canchas de cámara al catálogo de la liga nueva
  if (desportsId) await importarCanchasDesports(nuevaLigaId, desportsId, decisionesDesports(formData));
  revalidatePath("/admin/ligas");
  revalidatePath("/admin", "layout"); // selector de ligas del shell
  return { ok: true };
}

export async function updateLiga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };
  const parsed = parseLiga(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const desportsId = parsed.data.desportsLigaId || null;
  const errDesports = await validarDesports(desportsId ?? "");
  if (errDesports) return { error: errDesports };
  try {
    const res = await db.update(t.ligas)
      .set({ ...parsed.data, desportsLigaId: desportsId, updatedAt: new Date() })
      .where(eq(t.ligas.id, id.data))
      .returning({ id: t.ligas.id });
    if (!res.length) return { error: "Liga no encontrada" };
  } catch (e: unknown) {
    const msg = constraintError(e);
    if (msg) return { error: msg };
    throw e;
  }
  if (desportsId) await importarCanchasDesports(id.data, desportsId, decisionesDesports(formData));
  revalidatePath("/admin/ligas");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
