"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import { regenerarPendientes, CapacidadError } from "@/lib/calendario";
import { arbitrosOcupadosPorHorario } from "@/lib/torneo-slots";

export type ActionState = { error?: string; ok?: boolean };

const ESTADOS_FIJOS = ["finalizado", "en_curso", "suspendido"] as const;

async function torneoDeLiga(torneoId: string, ligaId: string) {
  return db.query.torneos.findFirst({
    where: (tr, { and: andOp, eq: eqOp }) => andOp(eqOp(tr.id, torneoId), eqOp(tr.ligaId, ligaId)),
    with: {
      equipos: { with: { equipo: { columns: { horarioFijo: true } } } },
      canchas: true,
      arbitros: true,
    },
  });
}

function revalidar() {
  revalidatePath("/admin", "layout");
}

/**
 * Regenera todos los partidos programados del torneo garantizando que cada
 * equipo vigente cierre con sus F fechas. Quedan fijos los partidos con
 * resultado/en curso/suspendidos y, si hay bajas, los programados anteriores a
 * la primera jornada de retiro (el equipo aún juega hasta su baja).
 */
async function regenerar(torneo: NonNullable<Awaited<ReturnType<typeof torneoDeLiga>>>): Promise<ActionState> {
  const vigentes = torneo.equipos.filter((e) => !e.retirado).map((e) => e.equipoId);
  if (vigentes.length < 2) return { error: "El torneo necesita al menos 2 equipos activos" };

  const n0 = torneo.equipos.length;
  const F = torneo.partidosPorEquipo ?? (torneo.formato === "ida_vuelta" ? 2 * (n0 - 1) : n0 - 1);

  const partidos = await db.query.partidos.findMany({
    where: (p, { eq: eqOp }) => eqOp(p.torneoId, torneo.id),
    columns: { id: true, jornada: true, fecha: true, estado: true, equipoLocalId: true, equipoVisitanteId: true },
  });

  // Jornada desde la que se reprograma: la primera baja; sin bajas, todo lo programado
  const retiros = torneo.equipos
    .filter((e) => e.retirado && e.jornadaRetiro != null)
    .map((e) => e.jornadaRetiro!);
  const j0 = retiros.length ? Math.min(...retiros) : 0;

  const esFijo = (p: (typeof partidos)[number]) =>
    (ESTADOS_FIJOS as readonly string[]).includes(p.estado) ||
    (p.estado === "programado" && p.jornada < j0);
  const fijos = partidos.filter(esFijo);
  const aBorrar = partidos.filter((p) => p.estado === "programado" && !esFijo(p));

  const jugados: Record<string, number> = {};
  for (const p of fijos) {
    jugados[p.equipoLocalId] = (jugados[p.equipoLocalId] ?? 0) + 1;
    jugados[p.equipoVisitanteId] = (jugados[p.equipoVisitanteId] ?? 0) + 1;
  }
  const jornadaInicio = fijos.length ? Math.max(...fijos.map((p) => p.jornada)) + 1 : 1;
  const maxFechaFija = fijos.length ? fijos.map((p) => p.fecha).sort().at(-1)! : null;
  const fechaBase = maxFechaFija
    ? new Date(new Date(maxFechaFija + "T12:00:00").getTime() + 86400000).toISOString().slice(0, 10)
    : torneo.fechaInicio;

  let nuevos;
  try {
    nuevos = regenerarPendientes({
      equipoIds: vigentes,
      partidosPorEquipo: F,
      jugados,
      crucesFijos: fijos.map((p) => [p.equipoLocalId, p.equipoVisitanteId]),
      jornadaInicio,
      fechaBase,
      horariosFijos: Object.fromEntries(
        torneo.equipos
          .filter((e) => !e.retirado && e.equipo.horarioFijo)
          .map((e) => [e.equipoId, e.equipo.horarioFijo!])
      ),
      arbitrosOcupados: await arbitrosOcupadosPorHorario(torneo.ligaId, torneo.id),
      canchaIds: torneo.canchas.map((c) => c.canchaId),
      arbitroIds: torneo.arbitros.map((a) => a.arbitroId),
      diasJuego: torneo.diasJuego,
      horarios: torneo.horarios,
      horariosPorCancha: torneo.horariosPorCancha,
      duracionPartido: torneo.duracionPartido,
      descansoEntrePartidos: torneo.descansoEntrePartidos,
    });
  } catch (e) {
    if (e instanceof CapacidadError) return { error: e.message };
    throw e;
  }

  await db.transaction(async (tx) => {
    if (aBorrar.length)
      await tx.delete(t.partidos).where(inArray(t.partidos.id, aBorrar.map((p) => p.id)));
    if (nuevos.length)
      await tx.insert(t.partidos).values(
        nuevos.map((p) => ({ ...p, torneoId: torneo.id, estado: "programado" as const }))
      );
  });
  revalidar();
  return { ok: true };
}

const bajaSchema = z.object({
  torneoId: z.string().uuid(),
  equipoId: z.string().uuid(),
  jornadaRetiro: z.coerce.number().int("Jornada inválida").min(1, "Jornada inválida").max(999, "Jornada inválida"),
  modo: z.enum(["regenerar", "manual"]),
});

export async function darDeBajaEquipo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = bajaSchema.safeParse({
    torneoId: formData.get("torneoId"),
    equipoId: formData.get("equipoId"),
    jornadaRetiro: formData.get("jornadaRetiro"),
    modo: formData.get("modo"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const torneo = await torneoDeLiga(d.torneoId, ligaId);
  if (!torneo) return { error: "Torneo no encontrado" };
  const inscrito = torneo.equipos.find((e) => e.equipoId === d.equipoId);
  if (!inscrito) return { error: "El equipo no está inscrito en este torneo" };
  if (inscrito.retirado) return { error: "Este equipo ya está dado de baja" };
  if (torneo.equipos.filter((e) => !e.retirado).length <= 2) {
    return { error: "El torneo necesita al menos 2 equipos activos" };
  }

  await db.update(t.torneoEquipos)
    .set({ retirado: true, jornadaRetiro: d.jornadaRetiro })
    .where(and(eq(t.torneoEquipos.torneoId, d.torneoId), eq(t.torneoEquipos.equipoId, d.equipoId)));

  if (d.modo === "regenerar") {
    const res = await regenerar((await torneoDeLiga(d.torneoId, ligaId))!);
    if (res.error) {
      return { error: `La baja se aplicó, pero la regeneración falló: ${res.error} ` +
        "Puedes reintentar con “Regenerar pendientes” o asignar sustitutos manualmente." };
    }
  }
  revalidar();
  return { ok: true };
}

export async function reactivarEquipo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const ids = z.object({ torneoId: z.string().uuid(), equipoId: z.string().uuid() }).safeParse({
    torneoId: formData.get("torneoId"),
    equipoId: formData.get("equipoId"),
  });
  if (!ids.success) return { error: "Recarga la página e intenta de nuevo" };

  const torneo = await torneoDeLiga(ids.data.torneoId, ligaId);
  if (!torneo) return { error: "Torneo no encontrado" };
  const res = await db.update(t.torneoEquipos)
    .set({ retirado: false, jornadaRetiro: null })
    .where(and(
      eq(t.torneoEquipos.torneoId, ids.data.torneoId),
      eq(t.torneoEquipos.equipoId, ids.data.equipoId),
      eq(t.torneoEquipos.retirado, true)
    )).returning({ equipoId: t.torneoEquipos.equipoId });
  if (!res.length) return { error: "El equipo no está dado de baja en este torneo" };
  revalidar();
  return { ok: true };
}

/** Sustituye al equipo retirado de un partido pendiente por otro del torneo. */
export async function asignarSustituto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const parsed = z.object({
    partidoId: z.string().uuid(),
    sustitutoId: z.string().uuid("Elige el equipo sustituto"),
  }).safeParse({
    partidoId: formData.get("partidoId"),
    sustitutoId: formData.get("sustitutoId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const partido = await db.query.partidos.findFirst({
    where: (p, { eq: eqOp }) => eqOp(p.id, d.partidoId),
    with: { torneo: { columns: { id: true, ligaId: true } } },
  });
  if (!partido || partido.torneo.ligaId !== ligaId) return { error: "Partido no encontrado" };
  if (partido.estado !== "programado") return { error: "Solo se sustituye en partidos programados" };

  const inscripciones = await db.query.torneoEquipos.findMany({
    where: (te, { eq: eqOp }) => eqOp(te.torneoId, partido.torneoId),
  });
  const retirados = new Set(inscripciones.filter((e) => e.retirado).map((e) => e.equipoId));
  const ladoRetirado = retirados.has(partido.equipoLocalId) ? "local"
    : retirados.has(partido.equipoVisitanteId) ? "visitante" : null;
  if (!ladoRetirado) return { error: "Este partido no tiene equipos dados de baja" };

  const sustituto = inscripciones.find((e) => e.equipoId === d.sustitutoId);
  if (!sustituto || sustituto.retirado) return { error: "El sustituto debe ser un equipo activo del torneo" };
  const rival = ladoRetirado === "local" ? partido.equipoVisitanteId : partido.equipoLocalId;
  if (d.sustitutoId === rival) return { error: "Un equipo no puede jugar contra sí mismo" };

  await db.update(t.partidos).set({
    [ladoRetirado === "local" ? "equipoLocalId" : "equipoVisitanteId"]: d.sustitutoId,
    updatedAt: new Date(),
  }).where(eq(t.partidos.id, d.partidoId));
  revalidar();
  return { ok: true };
}

export async function regenerarPendientesTorneo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ligaId } = await requireLigaAdmin();
  const id = z.string().uuid().safeParse(formData.get("torneoId"));
  if (!id.success) return { error: "Recarga la página e intenta de nuevo" };
  const torneo = await torneoDeLiga(id.data, ligaId);
  if (!torneo) return { error: "Torneo no encontrado" };
  if (["finalizado", "cancelado"].includes(torneo.estado)) {
    return { error: "El torneo ya terminó; no se puede reprogramar" };
  }
  return regenerar(torneo);
}
