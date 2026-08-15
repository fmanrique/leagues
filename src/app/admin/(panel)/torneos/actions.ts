"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { fetchScheduleDesports } from "@/lib/desports";
import { generarCalendario, CapacidadError } from "@/lib/calendario";
import { slotsOcupados, arbitrosOcupadosPorHorario } from "@/lib/torneo-slots";

export type ActionState = { error?: string; ok?: boolean };

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;

/**
 * Normaliza una hora escrita a mano a HH:MM. Acepta "9:00", "09:00", "9",
 * "9.30", "9 30", "4pm", "4:30 PM". Devuelve null si no se entiende.
 */
function normalizarHora(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?:[:.\s](\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const sufijo = m[3]?.[0]; // "a" | "p"
  if (sufijo === "p" && h < 12) h += 12;
  if (sufijo === "a" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const torneoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(160),
  rama: z.enum(["varonil", "femenil", "mixto"]),
  categoriaLibre: z.boolean(),
  categoriaAnioMin: z.coerce.number().int().min(1900, "Año de categoría inválido").max(2100, "Año de categoría inválido").nullish(),
  categoriaAnioMax: z.coerce.number().int().min(1900, "Año de categoría inválido").max(2100, "Año de categoría inválido").nullish(),
  tipoFutbol: z.enum(["futbol_11", "futbol_7", "futbol_5"]),
  formato: z.enum(["ida", "ida_vuelta"]),
  partidosPorEquipo: z.coerce.number().int("Partidos por equipo inválido")
    .min(1, "Partidos por equipo: mínimo 1").max(200, "Partidos por equipo: máximo 200").nullish(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida"),
  diasJuego: z.array(z.enum(DIAS)).min(1, "Elige al menos un día de juego"),
  // Unión de todos los días (legado / respaldo)
  horarios: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
    .min(1, "Agrega al menos un horario, por ejemplo: 09:00, 11:00"),
  // Slots del torneo: día → cancha → horarios
  horariosPorCancha: z.record(
    z.string(),
    z.record(z.string().uuid(), z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)))
  ),
  duracionPartido: z.coerce.number().int().min(20, "Duración del partido: mínimo 20 minutos").max(150, "Duración del partido: máximo 150 minutos"),
  descansoEntrePartidos: z.coerce.number().int().min(0, "Descanso inválido").max(120, "Descanso entre partidos: máximo 120 minutos"),
  costoInscripcion: z.coerce.number().min(0, "Costo de inscripción inválido"),
  costoArbitraje: z.coerce.number().min(0, "Costo de arbitraje inválido"),
  estado: z.enum(["configuracion", "inscripciones", "en_curso", "finalizado", "cancelado"]),
  equipos: z.array(z.string().uuid()),
  canchas: z.array(z.string().uuid()).min(1, "Selecciona al menos una cancha"),
  arbitros: z.array(z.string().uuid()),
});

function parseForm(formData: FormData) {
  // Horarios: cada (día, cancha) trae los suyos (name="horarios__<dia>__<canchaId>").
  // Se normalizan y deduplican; si alguno no se entiende, el error lo nombra.
  const diasSeleccionados = formData.getAll("diasJuego").map(String);
  const canchasSeleccionadas = formData.getAll("canchas").map(String);
  const horariosPorCancha: Record<string, Record<string, string[]>> = {};
  const horarios: string[] = []; // unión de todos los días y canchas (legado)
  for (const dia of diasSeleccionados) {
    const porCancha: Record<string, string[]> = {};
    for (const cancha of canchasSeleccionadas) {
      const raw = formData.getAll(`horarios__${dia}__${cancha}`)
        .map((h) => String(h).trim()).filter(Boolean);
      const lista: string[] = [];
      for (const h of raw) {
        const norm = normalizarHora(h);
        if (!norm) {
          return {
            success: false as const,
            error: { issues: [{ message: `Horario "${h}" del ${dia} no válido. Usa formato de 24 horas, por ejemplo: 09:00, 16:30` }] },
          };
        }
        if (!lista.includes(norm)) lista.push(norm);
      }
      if (lista.length) {
        lista.sort();
        porCancha[cancha] = lista;
        for (const h of lista) if (!horarios.includes(h)) horarios.push(h);
      }
    }
    if (!Object.keys(porCancha).length) {
      return {
        success: false as const,
        error: { issues: [{ message: `Agrega al menos un horario en alguna cancha para el ${dia}` }] },
      };
    }
    horariosPorCancha[dia] = porCancha;
  }
  horarios.sort();

  return torneoSchema.safeParse({
    horariosPorCancha,
    nombre: formData.get("nombre"),
    rama: formData.get("rama"),
    categoriaLibre: formData.get("categoriaLibre") === "on",
    categoriaAnioMin: formData.get("categoriaAnioMin") || null,
    categoriaAnioMax: formData.get("categoriaAnioMax") || null,
    tipoFutbol: formData.get("tipoFutbol"),
    formato: formData.get("formato"),
    partidosPorEquipo: formData.get("partidosPorEquipo") || null,
    fechaInicio: formData.get("fechaInicio"),
    diasJuego: formData.getAll("diasJuego"),
    horarios,
    duracionPartido: formData.get("duracionPartido"),
    descansoEntrePartidos: formData.get("descansoEntrePartidos"),
    costoInscripcion: formData.get("costoInscripcion"),
    costoArbitraje: formData.get("costoArbitraje"),
    // Al crear no se elige estado: todo torneo nace en configuración
    estado: formData.get("estado") ?? "configuracion",
    equipos: formData.getAll("equipos"),
    canchas: formData.getAll("canchas"),
    arbitros: formData.getAll("arbitros"),
  });
}

/**
 * Liga conectada a DE/SPORTS: los días y horarios del torneo solo pueden ser
 * franjas de cámara cargadas de la plataforma (no captura libre).
 */
async function validarHorariosDesports(ligaId: string, d: z.infer<typeof torneoSchema>): Promise<string | null> {
  const liga = await db.query.ligas.findFirst({
    where: (l, { eq: eqOp }) => eqOp(l.id, ligaId),
    columns: { desportsLigaId: true },
  });
  if (!liga?.desportsLigaId) return null;
  const schedule = await fetchScheduleDesports(liga.desportsLigaId);
  if (!schedule) return null; // API caído: no bloquear la operación

  const diasDisponibles = schedule.dias.map((x) => x.dia);
  const diaInvalido = d.diasJuego.find((dia) => !diasDisponibles.includes(dia));
  if (diaInvalido) return `El día "${diaInvalido}" no tiene cámaras en la plataforma DE/SPORTS`;

  // Cada día valida contra SUS franjas de cámara (los horarios varían por día)
  for (const dia of d.diasJuego) {
    const franjas = new Set(schedule.dias.find((x) => x.dia === dia)?.horarios ?? []);
    const horasDia = Object.values(d.horariosPorCancha[dia] ?? {}).flat();
    const horaInvalida = horasDia.find((h) => !franjas.has(h));
    if (horaInvalida) {
      return `El horario ${horaInvalida} no es una franja de cámara del ${dia}; ` +
        `selecciona solo horarios en que graban las cámaras ese día`;
    }
  }
  return null;
}

const DIA_LABEL: Record<string, string> = {
  lunes: "lunes", martes: "martes", miercoles: "miércoles", jueves: "jueves",
  viernes: "viernes", sabado: "sábado", domingo: "domingo",
};

/**
 * Dos torneos vigentes no pueden reservar el mismo (día, cancha, hora): el
 * mismo horario en OTRA cancha sí es válido.
 */
async function validarSlotsLibres(
  ligaId: string,
  d: z.infer<typeof torneoSchema>,
  torneoIdActual: string | null
): Promise<string | null> {
  const ocupados = await slotsOcupados(ligaId);
  const canchaNombres = new Map(
    (await db.select({ id: t.canchas.id, nombre: t.canchas.nombre })
      .from(t.canchas).where(eq(t.canchas.ligaId, ligaId))).map((c) => [c.id, c.nombre])
  );
  const mapa = new Map<string, string>();
  for (const s of ocupados) {
    if (s.torneoId === torneoIdActual) continue;
    mapa.set(`${s.dia}|${s.canchaId}|${s.hora}`, s.torneoNombre);
  }
  for (const [dia, porCancha] of Object.entries(d.horariosPorCancha)) {
    for (const [canchaId, horas] of Object.entries(porCancha)) {
      for (const hora of horas) {
        const dueno = mapa.get(`${dia}|${canchaId}|${hora}`);
        if (dueno) {
          return `El ${DIA_LABEL[dia] ?? dia} a las ${hora} en ${canchaNombres.get(canchaId) ?? "esa cancha"} ` +
            `ya está reservado por el torneo “${dueno}”. Elige otro horario u otra cancha.`;
        }
      }
    }
  }
  return null;
}

/**
 * Las fechas garantizadas no pueden ser menos que el todos-contra-todos:
 * con n equipos, el mínimo de partidos por equipo es n−1.
 */
function validarFechasGarantizadas(d: z.infer<typeof torneoSchema>): string | null {
  if (d.partidosPorEquipo == null || d.equipos.length < 2) return null;
  const minimo = d.equipos.length - 1;
  if (d.partidosPorEquipo < minimo) {
    return `Partidos por equipo no puede ser menor a ${minimo}: es el mínimo para que ` +
      `${d.equipos.length} equipos se enfrenten todos contra todos`;
  }
  return null;
}

/** Valida que los IDs seleccionados pertenezcan a la liga activa. */
async function validarSelecciones(ligaId: string, d: z.infer<typeof torneoSchema>): Promise<string | null> {
  if (d.equipos.length) {
    const rows = await db.select({ id: t.equipos.id }).from(t.equipos)
      .where(and(eq(t.equipos.ligaId, ligaId), inArray(t.equipos.id, d.equipos)));
    if (rows.length !== d.equipos.length) return "Uno de los equipos seleccionados no pertenece a esta liga; recarga la página";
  }
  if (d.canchas.length) {
    const rows = await db.select({ id: t.canchas.id }).from(t.canchas)
      .where(and(eq(t.canchas.ligaId, ligaId), inArray(t.canchas.id, d.canchas)));
    if (rows.length !== d.canchas.length) return "Una de las canchas seleccionadas no pertenece a esta liga; recarga la página";
  }
  if (d.arbitros.length) {
    const rows = await db.select({ id: t.arbitros.id }).from(t.arbitros)
      .where(and(eq(t.arbitros.ligaId, ligaId), inArray(t.arbitros.id, d.arbitros)));
    if (rows.length !== d.arbitros.length) return "Uno de los árbitros seleccionados no pertenece a esta liga; recarga la página";
  }
  return null;
}

function torneoValues(ligaId: string, d: z.infer<typeof torneoSchema>) {
  return {
    ligaId,
    nombre: d.nombre,
    rama: d.rama,
    categoriaLibre: d.categoriaLibre,
    categoriaAnioMin: d.categoriaLibre ? null : d.categoriaAnioMin ?? null,
    categoriaAnioMax: d.categoriaLibre ? null : d.categoriaAnioMax ?? null,
    tipoFutbol: d.tipoFutbol,
    formato: d.formato,
    partidosPorEquipo: d.partidosPorEquipo ?? null,
    fechaInicio: d.fechaInicio,
    diasJuego: d.diasJuego as string[],
    horarios: d.horarios,
    horariosPorCancha: d.horariosPorCancha,
    duracionPartido: d.duracionPartido,
    descansoEntrePartidos: d.descansoEntrePartidos,
    costoInscripcion: d.costoInscripcion.toFixed(2),
    costoArbitraje: d.costoArbitraje.toFixed(2),
    estado: d.estado,
  };
}

async function reemplazarRelaciones(torneoId: string, d: z.infer<typeof torneoSchema>) {
  // Equipos por diff (no borrar-y-reinsertar): las filas existentes conservan
  // su estado de baja (retirado / jornadaRetiro)
  const actuales = await db.select({ equipoId: t.torneoEquipos.equipoId })
    .from(t.torneoEquipos).where(eq(t.torneoEquipos.torneoId, torneoId));
  const previos = new Set(actuales.map((e) => e.equipoId));
  const nuevos = d.equipos.filter((id) => !previos.has(id));
  const quitados = [...previos].filter((id) => !d.equipos.includes(id));
  if (quitados.length)
    await db.delete(t.torneoEquipos).where(and(
      eq(t.torneoEquipos.torneoId, torneoId), inArray(t.torneoEquipos.equipoId, quitados)));
  if (nuevos.length) {
    await db.insert(t.torneoEquipos).values(nuevos.map((id) => ({ torneoId, equipoId: id })));
    // Horario fijo pagado: al inscribirse al torneo se genera su pago
    // pendiente (aunque su hora siga por definir)
    const conFijo = await db.select({
      id: t.equipos.id,
      horarioFijoMonto: t.equipos.horarioFijoMonto,
    }).from(t.equipos)
      .where(and(inArray(t.equipos.id, nuevos), isNotNull(t.equipos.horarioFijoMonto)));
    const cobrables = conFijo.filter((e) => Number(e.horarioFijoMonto) > 0);
    if (cobrables.length)
      await db.insert(t.pagos).values(cobrables.map((e) => ({
        torneoId,
        equipoId: e.id,
        tipo: "horario_fijo" as const,
        monto: e.horarioFijoMonto!,
        estado: "pendiente" as const,
      })));
  }

  await db.delete(t.torneoCanchas).where(eq(t.torneoCanchas.torneoId, torneoId));
  await db.delete(t.torneoArbitros).where(eq(t.torneoArbitros.torneoId, torneoId));
  if (d.canchas.length)
    await db.insert(t.torneoCanchas).values(d.canchas.map((id) => ({ torneoId, canchaId: id })));
  if (d.arbitros.length)
    await db.insert(t.torneoArbitros).values(d.arbitros.map((id) => ({ torneoId, arbitroId: id })));
}

export async function createTorneo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const invalid = validarFechasGarantizadas(parsed.data)
    ?? await validarSelecciones(ligaId, parsed.data)
    ?? await validarSlotsLibres(ligaId, parsed.data, null)
    ?? await validarHorariosDesports(ligaId, parsed.data);
  if (invalid) return { error: invalid };

  const [row] = await db.insert(t.torneos)
    .values({ ...torneoValues(ligaId, parsed.data), estado: "configuracion" })
    .returning();
  await reemplazarRelaciones(row.id, parsed.data);
  revalidatePath("/admin/torneos");
  return { ok: true };
}

export async function updateTorneo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "No se pudo identificar el torneo; recarga la página" };
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actual = await db.query.torneos.findFirst({
    where: (tr, { and: andOp, eq: eqOp }) => andOp(eqOp(tr.id, id.data), eqOp(tr.ligaId, ligaId)),
    columns: { estado: true },
    with: { equipos: { columns: { equipoId: true } } },
  });
  if (!actual) return { error: "Torneo no encontrado" };

  // Un torneo terminado es historial: solo DE/SPORTS (superadmin) puede reabrirlo
  if (["finalizado", "cancelado"].includes(actual.estado) && user.rol !== "superadmin") {
    return {
      error: "Este torneo ya está " + (actual.estado === "finalizado" ? "finalizado" : "cancelado") +
        " y es parte del historial. Si necesitas modificarlo, contacta a DE/SPORTS.",
    };
  }

  // No se puede desinscribir a un equipo que ya tiene partidos: sus juegos y
  // los puntos de sus rivales quedarían inconsistentes. El retiro se maneja
  // marcando sus partidos restantes como ganados por default.
  const inscritos = actual.equipos.map((e) => e.equipoId);
  const quitados = inscritos.filter((eid) => !parsed.data.equipos.includes(eid));
  if (quitados.length) {
    const [conPartidos] = await db.select({ n: count() }).from(t.partidos)
      .where(and(
        eq(t.partidos.torneoId, id.data),
        inArray(t.partidos.equipoLocalId, quitados),
      ));
    const [conPartidosV] = await db.select({ n: count() }).from(t.partidos)
      .where(and(
        eq(t.partidos.torneoId, id.data),
        inArray(t.partidos.equipoVisitanteId, quitados),
      ));
    if (conPartidos.n + conPartidosV.n > 0) {
      return {
        error: "No puedes quitar un equipo que ya tiene partidos en el calendario. " +
          "Si el equipo se retiró, dale de baja desde Ajustes del torneo: su historial " +
          "se conserva y sus partidos pendientes se reasignan o regeneran.",
      };
    }
  }

  const invalid = validarFechasGarantizadas(parsed.data)
    ?? await validarSelecciones(ligaId, parsed.data)
    ?? await validarSlotsLibres(ligaId, parsed.data, id.data)
    ?? await validarHorariosDesports(ligaId, parsed.data);
  if (invalid) return { error: invalid };

  const res = await db.update(t.torneos).set({ ...torneoValues(ligaId, parsed.data), updatedAt: new Date() })
    .where(and(eq(t.torneos.id, id.data), eq(t.torneos.ligaId, ligaId)))
    .returning({ id: t.torneos.id });
  if (!res.length) return { error: "Torneo no encontrado" };
  await reemplazarRelaciones(id.data, parsed.data);
  revalidatePath("/admin/torneos");
  return { ok: true };
}

export async function deleteTorneo(formData: FormData): Promise<void> {
  const { user, ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  // Un torneo terminado —o con resultados capturados— es historial: solo el
  // superadmin puede borrarlo
  if (user.rol !== "superadmin") {
    const torneo = await db.query.torneos.findFirst({
      where: (tr, { and: andOp, eq: eqOp }) => andOp(eqOp(tr.id, id.data), eqOp(tr.ligaId, ligaId)),
      columns: { estado: true },
    });
    if (torneo && ["finalizado", "cancelado"].includes(torneo.estado)) return;
    const [{ n: jugados }] = await db.select({ n: count() }).from(t.partidos)
      .where(and(eq(t.partidos.torneoId, id.data), eq(t.partidos.estado, "finalizado")));
    if (jugados > 0) return;
  }
  await db.delete(t.torneos).where(and(eq(t.torneos.id, id.data), eq(t.torneos.ligaId, ligaId)));
  revalidatePath("/admin/torneos");
}

/**
 * Genera el calendario round-robin del torneo en el servidor, reemplazando los
 * partidos existentes (transaccional).
 */
export async function generarCalendarioTorneo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID inválido" };

  const torneo = await db.query.torneos.findFirst({
    where: (tr, { and, eq }) => and(eq(tr.id, id.data), eq(tr.ligaId, ligaId)),
    with: {
      equipos: { with: { equipo: { columns: { horarioFijo: true } } } },
      canchas: true,
      arbitros: true,
    },
  });
  if (!torneo) return { error: "Torneo no encontrado" };

  // Los equipos dados de baja no entran al rol
  const vigentes = torneo.equipos.filter((e) => !e.retirado);
  const equipoIds = vigentes.map((e) => e.equipoId);
  if (equipoIds.length < 2) return { error: "El torneo necesita al menos 2 equipos activos" };
  const horariosFijos = Object.fromEntries(
    vigentes.filter((e) => e.equipo.horarioFijo).map((e) => [e.equipoId, e.equipo.horarioFijo!])
  );

  if (torneo.estado === "finalizado" || torneo.estado === "cancelado") {
    return { error: "El torneo ya terminó; no se puede regenerar su calendario" };
  }

  // Guard: regenerar borra todos los partidos del torneo. Si ya hay resultados
  // (o partidos en curso), borrar destruiría goles, tarjetas y la tabla — se
  // rechaza aquí aunque la UI lo advierta.
  const [{ n: conHistorial }] = await db
    .select({ n: count() })
    .from(t.partidos)
    .where(and(
      eq(t.partidos.torneoId, torneo.id),
      inArray(t.partidos.estado, ["finalizado", "en_curso"])
    ));
  if (conHistorial > 0) {
    return {
      error: `El torneo ya tiene ${conHistorial} partido(s) con resultado o en curso. ` +
        `Regenerar el calendario borraría esos resultados, goles y tarjetas. ` +
        `Ajusta los partidos pendientes desde Calendario en su lugar.`,
    };
  }

  let partidos;
  try {
    partidos = generarCalendario({
      equipoIds,
      canchaIds: torneo.canchas.map((c) => c.canchaId),
      arbitroIds: torneo.arbitros.map((a) => a.arbitroId),
      fechaInicio: torneo.fechaInicio,
      diasJuego: torneo.diasJuego,
      horarios: torneo.horarios,
      horariosPorCancha: torneo.horariosPorCancha,
      formato: torneo.formato,
      partidosPorEquipo: torneo.partidosPorEquipo,
      horariosFijos,
      arbitrosOcupados: await arbitrosOcupadosPorHorario(ligaId, torneo.id),
      duracionPartido: torneo.duracionPartido,
      descansoEntrePartidos: torneo.descansoEntrePartidos,
    });
  } catch (e) {
    if (e instanceof CapacidadError) return { error: e.message };
    throw e;
  }

  await db.transaction(async (tx) => {
    await tx.delete(t.partidos).where(eq(t.partidos.torneoId, torneo.id));
    if (partidos.length) {
      await tx.insert(t.partidos).values(
        partidos.map((p) => ({ ...p, torneoId: torneo.id, estado: "programado" as const }))
      );
    }
    if (torneo.estado === "configuracion" || torneo.estado === "inscripciones") {
      await tx.update(t.torneos).set({ estado: "en_curso", updatedAt: new Date() })
        .where(eq(t.torneos.id, torneo.id));
    }
  });

  revalidatePath("/admin/torneos");
  revalidatePath("/admin/calendario");
  return { ok: true };
}
