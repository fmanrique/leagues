"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { horariosDisponiblesPorEquipo } from "@/lib/torneo-slots";
import { constraintUnico } from "@/lib/db-errors";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";

const equipoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  colorLocal: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  colorVisitante: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  rama: z.enum(["varonil", "femenil", "mixto"]),
  categoriaLibre: z.coerce.boolean(),
  categoriaAnioMin: z.coerce.number().int().min(1900).max(2100).nullish(),
  categoriaAnioMax: z.coerce.number().int().min(1900).max(2100).nullish(),
  entrenador: z.string().trim().max(120).default(""),
  telefono: z.string().trim().max(32).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(160)]).default(""),
  horarioFijo: z.union([
    z.literal(""),
    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario fijo inválido (usa formato 24 h, ej. 20:00)"),
  ]).default(""),
  horarioFijoMonto: z.coerce.number().min(0, "Monto del horario fijo inválido").max(999999, "Monto del horario fijo inválido").nullish(),
  activo: z.coerce.boolean(),
});

export type ActionState = { error?: string; ok?: boolean };

/** Valores listos para insertar/actualizar (numeric va como string en Drizzle). */
function equipoValues(d: z.infer<typeof equipoSchema>) {
  const { horarioFijo, horarioFijoMonto, ...rest } = d;
  return {
    ...rest,
    // La hora puede quedar "por definir" (null) aunque el monto ya esté pagado:
    // se elige después, de los horarios del torneo donde se inscriba
    horarioFijo: horarioFijo || null,
    horarioFijoMonto: horarioFijoMonto != null ? horarioFijoMonto.toFixed(2) : null,
  };
}

/**
 * La hora fija no es libre: debe ser uno de los horarios de los torneos
 * vigentes donde el equipo está inscrito (por eso el form la ofrece en combo).
 */
async function validarHoraFija(ligaId: string, equipoId: string | null, hora: string): Promise<string | null> {
  if (!hora) return null;
  if (!equipoId) {
    return "La hora fija se elige después: crea el equipo, inscríbelo a un torneo y edítalo para elegirla";
  }
  const disponibles = (await horariosDisponiblesPorEquipo(ligaId)).get(equipoId) ?? [];
  if (!disponibles.includes(hora)) {
    return disponibles.length
      ? "La hora fija debe ser uno de los horarios de los torneos donde está inscrito el equipo"
      : "Este equipo no está inscrito en ningún torneo vigente; inscríbelo primero y después elige su hora fija";
  }
  return null;
}

function parseForm(formData: FormData) {
  const categoriaLibre = formData.get("categoriaLibre") === "on";
  const conHorarioFijo = formData.get("horarioFijoOn") === "on";
  return equipoSchema.safeParse({
    horarioFijo: conHorarioFijo ? formData.get("horarioFijo") ?? "" : "",
    horarioFijoMonto: conHorarioFijo ? formData.get("horarioFijoMonto") || null : null,
    nombre: formData.get("nombre"),
    colorLocal: formData.get("colorLocal"),
    colorVisitante: formData.get("colorVisitante"),
    rama: formData.get("rama"),
    categoriaLibre,
    categoriaAnioMin: categoriaLibre ? null : formData.get("categoriaAnioMin") || null,
    categoriaAnioMax: categoriaLibre ? null : formData.get("categoriaAnioMax") || null,
    entrenador: formData.get("entrenador") ?? "",
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    activo: formData.get("activo") === "on",
  });
}

export async function createEquipo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const horaInvalida = await validarHoraFija(ligaId, null, parsed.data.horarioFijo);
  if (horaInvalida) return { error: horaInvalida };

  let logoUrl: string | null = null;
  try {
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      logoUrl = await saveImage(logo, `ligas/${ligaId}/equipos`);
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  try {
    await db.insert(t.equipos).values({ ...equipoValues(parsed.data), ligaId, logoUrl });
  } catch (e: unknown) {
    if (constraintUnico(e) === "equipos_liga_nombre_idx") return { error: "Ya existe un equipo con ese nombre" };
    throw e;
  }
  revalidatePath("/admin/equipos");
  return { ok: true };
}

export async function updateEquipo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const horaInvalida = await validarHoraFija(ligaId, id.data, parsed.data.horarioFijo);
  if (horaInvalida) return { error: horaInvalida };

  const [actual] = await db
    .select({ logoUrl: t.equipos.logoUrl })
    .from(t.equipos)
    .where(and(eq(t.equipos.id, id.data), eq(t.equipos.ligaId, ligaId)));
  if (!actual) return { error: "Equipo no encontrado" };

  const patch: { logoUrl?: string | null } = {};
  // Logo sustituido/quitado: se borra del storage después de confirmar el update
  let logoViejo: string | null = null;
  try {
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      patch.logoUrl = await saveImage(logo, `ligas/${ligaId}/equipos`);
      logoViejo = actual.logoUrl;
    } else if (formData.get("logoQuitar") === "on") {
      patch.logoUrl = null;
      logoViejo = actual.logoUrl;
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  try {
    const res = await db.update(t.equipos).set({ ...equipoValues(parsed.data), ...patch, updatedAt: new Date() })
      .where(and(eq(t.equipos.id, id.data), eq(t.equipos.ligaId, ligaId)))
      .returning({ id: t.equipos.id });
    if (!res.length) return { error: "Equipo no encontrado" };
  } catch (e: unknown) {
    if (constraintUnico(e) === "equipos_liga_nombre_idx") return { error: "Ya existe un equipo con ese nombre" };
    throw e;
  }
  // Sólo tras confirmar el cambio en la base soltamos el archivo viejo
  await deleteImage(logoViejo);
  revalidatePath("/admin/equipos");
  return { ok: true };
}

/**
 * Regla de la liga: los equipos NO se eliminan (su historial pertenece a la
 * liga). Un equipo que se va se desactiva desde Editar. La action se conserva
 * solo para responder con el mensaje correcto a requests viejos.
 */
export async function deleteEquipo(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireLigaAdmin();
  return {
    error: "Los equipos no se eliminan: si un equipo deja la liga, desactívalo " +
      "(Editar → quitar \"Equipo activo\").",
  };
}
