"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { constraintUnico } from "@/lib/db-errors";
import { fetchScheduleDesports } from "@/lib/desports";
import { importarCanchasDesports, decisionesDesports } from "@/lib/desports-import";

export type ActionState = { error?: string; ok?: boolean };

// ── Datos de la liga ─────────────────────────────────────────────────────────

const ligaSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(160),
  direccion: z.string().trim().max(300).default(""),
  telefono: z.string().trim().max(32).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(160)]).default(""),
  desportsLigaId: z.string().trim().max(64).default(""),
});

export async function updateLiga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = ligaSchema.safeParse({
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion") ?? "",
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    desportsLigaId: formData.get("desportsLigaId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const desportsId = parsed.data.desportsLigaId || null;
  if (desportsId && !(await fetchScheduleDesports(desportsId))) {
    return { error: "El ID de liga DE/SPORTS no existe (compruébalo antes de guardar)" };
  }
  await db.update(t.ligas)
    .set({ ...parsed.data, desportsLigaId: desportsId, updatedAt: new Date() })
    .where(eq(t.ligas.id, ligaId));
  if (desportsId) await importarCanchasDesports(ligaId, desportsId, decisionesDesports(formData));
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin", "layout"); // el nombre de la liga se muestra en el shell
  return { ok: true };
}

// ── Usuarios de la liga ──────────────────────────────────────────────────────

const usuarioSchema = z.object({
  username: z.string().trim().min(3, "Usuario: mínimo 3 caracteres").max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Usuario: solo letras, números, punto, guion"),
  nombre: z.string().trim().min(1, "Nombre requerido").max(160),
  password: z.string().min(8, "Contraseña: mínimo 8 caracteres").max(128),
  rol: z.enum(["admin_liga", "admin_equipo", "arbitro"]),
  equipoId: z.string().uuid().nullish(),
  arbitroId: z.string().uuid().nullish(),
});

export async function createUsuario(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = usuarioSchema.safeParse({
    username: formData.get("username"),
    nombre: formData.get("nombre"),
    password: formData.get("password"),
    rol: formData.get("rol"),
    equipoId: formData.get("equipoId") || null,
    arbitroId: formData.get("arbitroId") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let equipoId: string | null = null;
  let arbitroId: string | null = null;

  if (d.rol === "admin_equipo") {
    if (!d.equipoId) return { error: "Selecciona el equipo del usuario" };
    const equipo = await db.query.equipos.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, d.equipoId!), eq(e.ligaId, ligaId)),
      columns: { id: true },
    });
    if (!equipo) return { error: "Equipo no encontrado en la liga" };
    equipoId = d.equipoId;
  }

  if (d.rol === "arbitro") {
    if (!d.arbitroId) return { error: "Selecciona el árbitro del usuario" };
    const arbitro = await db.query.arbitros.findFirst({
      where: (a, { eq, and }) => and(eq(a.id, d.arbitroId!), eq(a.ligaId, ligaId)),
      columns: { id: true },
    });
    if (!arbitro) return { error: "Árbitro no encontrado en la liga" };
    arbitroId = d.arbitroId;
  }

  const passwordHash = await hash(d.password);
  try {
    await db.insert(t.usuarios).values({
      ligaId,
      username: d.username,
      passwordHash,
      nombre: d.nombre,
      rol: d.rol,
      equipoId,
      arbitroId,
      activo: true,
    });
  } catch (e: unknown) {
    if (constraintUnico(e) === "usuarios_username_unique") return { error: "Ese usuario ya existe" };
    throw e;
  }
  revalidatePath("/admin/configuracion");
  return { ok: true };
}

const resetSchema = z.object({
  id: z.string().uuid("ID inválido"),
  password: z.string().min(8, "Contraseña: mínimo 8 caracteres").max(128),
});

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = resetSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const passwordHash = await hash(parsed.data.password);
  // Scope: solo usuarios de la liga activa (los superadmin tienen ligaId null y quedan fuera)
  const res = await db.update(t.usuarios)
    .set({ passwordHash, updatedAt: new Date() })
    .where(and(eq(t.usuarios.id, parsed.data.id), eq(t.usuarios.ligaId, ligaId)))
    .returning({ id: t.usuarios.id });
  if (!res.length) return { error: "Usuario no encontrado" };
  // Si el reset fue por cuenta comprometida, quien tenga sesión abierta sale ya
  await db.delete(t.sesiones).where(eq(t.sesiones.usuarioId, parsed.data.id));
  revalidatePath("/admin/configuracion");
  return { ok: true };
}

export async function toggleUsuarioActivo(formData: FormData): Promise<void> {
  const { user, ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  if (id.data === user.id) return; // no puede desactivarse a sí mismo
  const activo = formData.get("activo") === "true";
  await db.update(t.usuarios)
    .set({ activo, updatedAt: new Date() })
    .where(and(eq(t.usuarios.id, id.data), eq(t.usuarios.ligaId, ligaId)));
  revalidatePath("/admin/configuracion");
}
