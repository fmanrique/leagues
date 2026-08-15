"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireUser, requireLigaId, type SessionUser } from "@/lib/auth";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { emitirNotificacion } from "@/lib/notificaciones";
import { nombreCompleto } from "@/lib/format";

const jugadorSchema = z.object({
  equipoId: z.string().uuid("Equipo requerido"),
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  apellidoPaterno: z.string().trim().max(120).default(""),
  apellidoMaterno: z.string().trim().max(120).default(""),
  fechaNacimiento: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")])
    .default(""),
  numero: z.coerce.number().int("Número inválido").min(0, "Número inválido").max(999, "Número inválido"),
  posicion: z.enum(["Portero", "Defensa", "Medio", "Delantero"], { message: "Posición inválida" }),
  estatura: z.coerce.number().int().min(50, "Estatura inválida").max(250, "Estatura inválida").nullish(),
  peso: z.coerce.number().int().min(20, "Peso inválido").max(300, "Peso inválido").nullish(),
  sexo: z.enum(["hombre", "mujer"], { message: "Sexo inválido" }),
  activo: z.coerce.boolean(),
});

export type ActionState = { error?: string; ok?: boolean };

/** Sesión con permiso de gestión de jugadores (todos menos árbitro). */
async function requireJugadoresScope(): Promise<{ user: SessionUser; ligaId: string }> {
  const user = await requireUser(["superadmin", "admin_liga", "admin_equipo"]);
  const ligaId = await requireLigaId(user);
  return { user, ligaId };
}

function parseForm(formData: FormData) {
  return jugadorSchema.safeParse({
    equipoId: formData.get("equipoId"),
    nombre: formData.get("nombre"),
    apellidoPaterno: formData.get("apellidoPaterno") ?? "",
    apellidoMaterno: formData.get("apellidoMaterno") ?? "",
    fechaNacimiento: formData.get("fechaNacimiento") ?? "",
    numero: formData.get("numero"),
    posicion: formData.get("posicion"),
    estatura: formData.get("estatura") || null,
    peso: formData.get("peso") || null,
    sexo: formData.get("sexo"),
    activo: formData.get("activo") === "on",
  });
}

/**
 * Resuelve el equipo destino según el rol: admin_equipo SIEMPRE opera sobre su
 * propio equipo (ignora el form); superadmin/admin_liga sobre cualquier equipo
 * de la liga activa (se valida pertenencia en DB).
 */
async function resolveEquipoId(
  user: SessionUser,
  ligaId: string,
  requested: string
): Promise<{ equipoId?: string; error?: string }> {
  if (user.rol === "admin_equipo") {
    if (!user.equipoId) return { error: "Tu usuario no tiene equipo asignado" };
    return { equipoId: user.equipoId };
  }
  const equipo = await db.query.equipos.findFirst({
    where: (e, { eq: eqOp, and: andOp }) => andOp(eqOp(e.id, requested), eqOp(e.ligaId, ligaId)),
    columns: { id: true },
  });
  if (!equipo) return { error: "El equipo no pertenece a esta liga" };
  return { equipoId: equipo.id };
}

/** Verifica que el jugador exista y esté dentro del alcance del usuario. */
async function jugadorEnScope(user: SessionUser, ligaId: string, jugadorId: string): Promise<boolean> {
  if (user.rol === "admin_equipo" && !user.equipoId) return false;
  const rows = await db
    .select({ id: t.jugadores.id })
    .from(t.jugadores)
    .innerJoin(t.equipos, eq(t.jugadores.equipoId, t.equipos.id))
    .where(
      user.rol === "admin_equipo"
        ? and(eq(t.jugadores.id, jugadorId), eq(t.jugadores.equipoId, user.equipoId ?? ""))
        : and(eq(t.jugadores.id, jugadorId), eq(t.equipos.ligaId, ligaId))
    )
    .limit(1);
  return rows.length > 0;
}

export async function createJugador(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requireJugadoresScope();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const scope = await resolveEquipoId(user, ligaId, parsed.data.equipoId);
  if (scope.error || !scope.equipoId) return { error: scope.error };

  let fotoUrl: string | null = null;
  try {
    const foto = formData.get("foto");
    if (foto instanceof File && foto.size > 0) {
      fotoUrl = await saveImage(foto, `ligas/${ligaId}/jugadores`);
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  const { fechaNacimiento, ...data } = parsed.data;
  await db.insert(t.jugadores).values({
    ...data,
    equipoId: scope.equipoId,
    fechaNacimiento: fechaNacimiento || null,
    fotoUrl,
    // Las altas del admin de equipo requieren visto bueno del admin de la liga
    aprobado: user.rol !== "admin_equipo",
  });
  if (user.rol === "admin_equipo") {
    const equipo = await db.query.equipos.findFirst({
      where: (e, { eq: eqOp }) => eqOp(e.id, scope.equipoId!),
      columns: { nombre: true },
    });
    await emitirNotificacion({
      ligaId,
      tipo: "jugador_pendiente",
      titulo: `Jugador por aprobar: ${data.nombre} ${data.apellidoPaterno}`.trim(),
      detalle: `Alta del equipo ${equipo?.nombre ?? ""}`.trim(),
      url: `/admin/jugadores?equipo=${scope.equipoId}&pendientes=1`,
    });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Datos mínimos del jugador para armar notificaciones al equipo. */
async function jugadorParaAviso(jugadorId: string) {
  return db.query.jugadores.findFirst({
    where: (j, { eq: eqOp }) => eqOp(j.id, jugadorId),
    columns: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, equipoId: true, fotoUrl: true, fotoPendienteUrl: true, aprobado: true },
  });
}

export async function aprobarJugador(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await jugadorParaAviso(id.data);
  if (!jugador) return { error: "Jugador no encontrado" };

  await db.update(t.jugadores).set({ aprobado: true, updatedAt: new Date() }).where(eq(t.jugadores.id, id.data));
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "jugador_aprobado",
    titulo: `Jugador aprobado: ${nombreCompleto(jugador)}`,
    detalle: "Ya aparece en la página pública y puede alinearse en fichas.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Rechaza (elimina) un jugador pendiente de aprobación. */
export async function rechazarJugador(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await jugadorParaAviso(id.data);
  if (!jugador) return { error: "Jugador no encontrado" };
  if (jugador.aprobado) return { error: "Este jugador ya está aprobado; si es necesario, desactívalo o elimínalo" };

  await db.delete(t.jugadores).where(eq(t.jugadores.id, id.data));
  await deleteImage(jugador.fotoUrl);
  await deleteImage(jugador.fotoPendienteUrl);
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "jugador_rechazado",
    titulo: `Jugador rechazado: ${nombreCompleto(jugador)}`,
    detalle: "La liga no aprobó el alta. Contacta a la liga si tienes dudas.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Aprueba la foto propuesta por el equipo (pasa a ser la foto oficial). */
export async function aprobarFoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await jugadorParaAviso(id.data);
  if (!jugador?.fotoPendienteUrl) return { error: "Este jugador no tiene foto por aprobar" };

  await db.update(t.jugadores)
    .set({ fotoUrl: jugador.fotoPendienteUrl, fotoPendienteUrl: null, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  await deleteImage(jugador.fotoUrl); // la foto anterior ya no se usa
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "foto_aprobada",
    titulo: `Foto aprobada: ${nombreCompleto(jugador)}`,
    detalle: "La nueva foto ya es la oficial del jugador.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Rechaza la foto propuesta (se descarta y se conserva la actual). */
export async function rechazarFoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await jugadorParaAviso(id.data);
  if (!jugador?.fotoPendienteUrl) return { error: "Este jugador no tiene foto por aprobar" };

  await db.update(t.jugadores)
    .set({ fotoPendienteUrl: null, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  await deleteImage(jugador.fotoPendienteUrl);
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "foto_rechazada",
    titulo: `Foto rechazada: ${nombreCompleto(jugador)}`,
    detalle: "La liga no aprobó la foto propuesta; se conserva la actual.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateJugador(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requireJugadoresScope();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };

  // Los cambios del admin de equipo no se aplican directo: quedan como
  // propuesta pendiente hasta que la liga los apruebe (igual que las altas)
  if (user.rol === "admin_equipo") {
    return proponerCambiosJugador(user, ligaId, id.data, formData);
  }

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const scope = await resolveEquipoId(user, ligaId, parsed.data.equipoId);
  if (scope.error || !scope.equipoId) return { error: scope.error };

  const [actual] = await db
    .select({ fotoUrl: t.jugadores.fotoUrl })
    .from(t.jugadores)
    .where(eq(t.jugadores.id, id.data));
  if (!actual) return { error: "Jugador no encontrado" };

  const patch: { fotoUrl?: string | null } = {};
  // Foto sustituida/quitada: se borra del storage después de confirmar el update
  let fotoVieja: string | null = null;
  try {
    const foto = formData.get("foto");
    if (foto instanceof File && foto.size > 0) {
      patch.fotoUrl = await saveImage(foto, `ligas/${ligaId}/jugadores`);
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
  await db
    .update(t.jugadores)
    .set({ ...data, ...patch, equipoId: scope.equipoId, fechaNacimiento: fechaNacimiento || null, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  // Sólo tras confirmar el cambio en la base soltamos el archivo viejo
  await deleteImage(fotoVieja);
  revalidatePath("/admin/jugadores");
  return { ok: true };
}

/** Campos del jugador que el equipo puede proponer cambiar (sin activo/equipo). */
const CAMPOS_PROPONIBLES = [
  "nombre", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento",
  "numero", "posicion", "estatura", "peso", "sexo",
] as const;

/**
 * Cambios propuestos por el admin de equipo: el diff contra los datos
 * oficiales se guarda en `cambiosPendientes` (y la foto en `fotoPendienteUrl`)
 * hasta que la liga los apruebe o rechace.
 */
async function proponerCambiosJugador(
  user: SessionUser,
  ligaId: string,
  jugadorId: string,
  formData: FormData
): Promise<ActionState> {
  if (!(await jugadorEnScope(user, ligaId, jugadorId))) return { error: "Jugador no encontrado" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actual = await db.query.jugadores.findFirst({
    where: (j, { eq: eqOp }) => eqOp(j.id, jugadorId),
  });
  if (!actual) return { error: "Jugador no encontrado" };
  if (!actual.aprobado) {
    return { error: "Este jugador aún está pendiente de aprobación; su alta se revisa completa" };
  }

  // Diff contra los datos oficiales (solo lo que cambió)
  const { fechaNacimiento, activo: _activo, equipoId: _equipoId, ...data } = parsed.data;
  const propuesto: Record<string, string | number | null> = {
    ...data,
    fechaNacimiento: fechaNacimiento || null,
    estatura: data.estatura ?? null,
    peso: data.peso ?? null,
  };
  const cambios: Record<string, string | number | null> = {};
  for (const campo of CAMPOS_PROPONIBLES) {
    if ((propuesto[campo] ?? null) !== (actual[campo] ?? null)) cambios[campo] = propuesto[campo] ?? null;
  }

  const foto = formData.get("foto");
  const hayFoto = foto instanceof File && foto.size > 0;
  if (!Object.keys(cambios).length && !hayFoto) return { error: "No hay cambios que enviar" };

  let fotoPendienteUrl: string | null = null;
  if (hayFoto) {
    try {
      fotoPendienteUrl = await saveImage(foto, `ligas/${ligaId}/jugadores`);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
  }

  await db.update(t.jugadores).set({
    // Un envío nuevo reemplaza la propuesta anterior completa
    ...(Object.keys(cambios).length ? { cambiosPendientes: cambios } : {}),
    ...(fotoPendienteUrl ? { fotoPendienteUrl } : {}),
    updatedAt: new Date(),
  }).where(eq(t.jugadores.id, jugadorId));
  if (fotoPendienteUrl) await deleteImage(actual.fotoPendienteUrl);

  const equipo = await db.query.equipos.findFirst({
    where: (e, { eq: eqOp }) => eqOp(e.id, actual.equipoId),
    columns: { nombre: true },
  });
  await emitirNotificacion({
    ligaId,
    tipo: "cambios_pendientes",
    titulo: `Cambios por aprobar: ${nombreCompleto(actual)}`,
    detalle: `${Object.keys(cambios).length ? "Datos" : ""}${Object.keys(cambios).length && hayFoto ? " y foto" : hayFoto ? "Foto" : ""} propuestos por el equipo ${equipo?.nombre ?? ""}`.trim(),
    url: `/admin/jugadores?equipo=${actual.equipoId}&pendientes=1`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Aplica los cambios propuestos por el equipo (pasan a ser los oficiales). */
export async function aprobarCambios(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await db.query.jugadores.findFirst({ where: (j, { eq: eqOp }) => eqOp(j.id, id.data) });
  if (!jugador?.cambiosPendientes) return { error: "Este jugador no tiene cambios por aprobar" };

  const patch: Record<string, string | number | null> = {};
  for (const campo of CAMPOS_PROPONIBLES) {
    if (campo in jugador.cambiosPendientes) patch[campo] = jugador.cambiosPendientes[campo];
  }
  await db.update(t.jugadores)
    .set({ ...patch, cambiosPendientes: null, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "cambios_aprobados",
    titulo: `Cambios aprobados: ${nombreCompleto(jugador)}`,
    detalle: "Los datos propuestos ya son los oficiales del jugador.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Descarta los cambios propuestos (se conservan los datos oficiales). */
export async function rechazarCambios(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await db.query.jugadores.findFirst({ where: (j, { eq: eqOp }) => eqOp(j.id, id.data) });
  if (!jugador?.cambiosPendientes) return { error: "Este jugador no tiene cambios por aprobar" };

  await db.update(t.jugadores)
    .set({ cambiosPendientes: null, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  await emitirNotificacion({
    ligaId,
    paraEquipoId: jugador.equipoId,
    tipo: "cambios_rechazados",
    titulo: `Cambios rechazados: ${nombreCompleto(jugador)}`,
    detalle: "La liga no aprobó los cambios propuestos; se conservan los datos actuales.",
    url: "/admin/jugadores",
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Baja directa por el admin de equipo: el jugador se desactiva (conserva todo
 * su historial y deja de aparecer en público y fichas). Reactivarlo lo hace la
 * liga. Los jugadores nunca se borran por este camino.
 */
export async function bajaJugadorEquipo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(["admin_equipo"]);
  const ligaId = await requireLigaId(user);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };
  const jugador = await db.query.jugadores.findFirst({ where: (j, { eq: eqOp }) => eqOp(j.id, id.data) });
  if (!jugador) return { error: "Jugador no encontrado" };
  if (!jugador.aprobado) return { error: "Este jugador aún está pendiente de alta; usa Eliminar para deshacerla" };
  if (!jugador.activo) return { error: "Este jugador ya está dado de baja" };

  await db.update(t.jugadores)
    .set({ activo: false, updatedAt: new Date() })
    .where(eq(t.jugadores.id, id.data));
  const equipo = await db.query.equipos.findFirst({
    where: (e, { eq: eqOp }) => eqOp(e.id, jugador.equipoId),
    columns: { nombre: true },
  });
  await emitirNotificacion({
    ligaId,
    tipo: "jugador_baja",
    titulo: `Baja de jugador: ${nombreCompleto(jugador)}`,
    detalle: `El equipo ${equipo?.nombre ?? ""} lo dio de baja; su historial se conserva`.trim(),
    url: `/admin/jugadores?equipo=${jugador.equipoId}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteJugador(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requireJugadoresScope();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar al jugador; recarga la página" };
  if (!(await jugadorEnScope(user, ligaId, id.data))) return { error: "Jugador no encontrado" };

  // El capitán solo puede deshacer sus propias altas pendientes; una vez
  // aprobado, la baja la maneja el administrador de la liga
  if (user.rol === "admin_equipo") {
    const [j] = await db.select({ aprobado: t.jugadores.aprobado }).from(t.jugadores)
      .where(eq(t.jugadores.id, id.data));
    if (j?.aprobado) {
      return { error: "Este jugador ya fue aprobado por la liga; para darlo de baja contacta al administrador de la liga" };
    }
  }

  // Guard: sus goles/tarjetas se borrarían en cascada y el marcador de esos
  // partidos quedaría inconsistente con la ficha (goleo y GF divergentes).
  const [[{ n: goles }], [{ n: tarjetas }]] = await Promise.all([
    db.select({ n: count() }).from(t.goles).where(eq(t.goles.jugadorId, id.data)),
    db.select({ n: count() }).from(t.tarjetas).where(eq(t.tarjetas.jugadorId, id.data)),
  ]);
  if (goles > 0 || tarjetas > 0) {
    return {
      error: `Este jugador tiene historial capturado (${goles} gol(es), ${tarjetas} tarjeta(s)). ` +
        `Eliminarlo dejaría fichas y marcadores inconsistentes. Desactívalo en su lugar ` +
        `(editar → quitar "Jugador activo").`,
    };
  }

  const res = await db.delete(t.jugadores).where(eq(t.jugadores.id, id.data))
    .returning({ fotoUrl: t.jugadores.fotoUrl, fotoPendienteUrl: t.jugadores.fotoPendienteUrl });
  if (res.length) {
    await deleteImage(res[0].fotoUrl);
    await deleteImage(res[0].fotoPendienteUrl);
  }
  revalidatePath("/admin/jugadores");
  return { ok: true };
}
