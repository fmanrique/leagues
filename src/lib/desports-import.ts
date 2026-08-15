import "server-only";
import { and, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { fetchScheduleDesports, normalizarNombreCancha, similitudCanchas, type ScheduleDesports } from "@/lib/desports";

/**
 * Propuesta de empate entre las canchas del API DE/SPORTS y el catálogo de la
 * liga: coincidencia exacta (normalizada) se asigna; similitud ≥95% se
 * pregunta; el resto se crea como cancha nueva.
 */
export interface PropuestaCancha {
  court: string;
  destino: "asignada" | "nueva" | "conflicto";
  canchaId?: string;
  canchaNombre?: string;
}

/** Decisiones de canchas del comprobador DE/SPORTS en el form: court → canchaId | "nueva". */
export function decisionesDesports(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("desportsDecision:") && typeof v === "string") {
      out[k.slice("desportsDecision:".length)] = v;
    }
  }
  return out;
}

export async function proponerCanchas(ligaId: string | null, schedule: ScheduleDesports): Promise<PropuestaCancha[]> {
  const existentes = ligaId
    ? await db.query.canchas.findMany({
        where: (c, { eq: eqOp, and: andOp }) => andOp(eqOp(c.ligaId, ligaId), eqOp(c.activo, true)),
        columns: { id: true, nombre: true },
      })
    : [];

  return schedule.canchas.map((court) => {
    const exacta = existentes.find((c) => normalizarNombreCancha(c.nombre) === normalizarNombreCancha(court));
    if (exacta) return { court, destino: "asignada" as const, canchaId: exacta.id, canchaNombre: exacta.nombre };
    let mejor: { id: string; nombre: string } | null = null;
    let mejorSim = 0;
    for (const c of existentes) {
      const s = similitudCanchas(c.nombre, court);
      if (s > mejorSim) { mejorSim = s; mejor = c; }
    }
    if (mejor && mejorSim >= 0.95) {
      return { court, destino: "conflicto" as const, canchaId: mejor.id, canchaNombre: mejor.nombre };
    }
    return { court, destino: "nueva" as const };
  });
}

/**
 * Aplica el empate al guardar la liga: asigna desportsCourt a coincidencias
 * exactas, respeta las decisiones del usuario en conflictos (misma cancha →
 * actualizar nombre; otra → crear) y crea las canchas restantes.
 * Devuelve un mensaje de error o null si todo salió bien.
 */
export async function importarCanchasDesports(
  ligaId: string,
  desportsLigaId: string,
  decisiones: Record<string, string> // court → canchaId (es la misma) | "nueva"
): Promise<string | null> {
  const schedule = await fetchScheduleDesports(desportsLigaId);
  if (!schedule) return "No se encontró una liga DE/SPORTS con ese ID (o el API no respondió)";

  const propuesta = await proponerCanchas(ligaId, schedule);
  for (const p of propuesta) {
    const decision = decisiones[p.court];
    if (p.destino === "asignada" && p.canchaId) {
      await db.update(t.canchas)
        .set({ desportsCourt: p.court, updatedAt: new Date() })
        .where(and(eq(t.canchas.id, p.canchaId), eq(t.canchas.ligaId, ligaId)));
    } else if (p.destino === "conflicto" && decision === "nueva") {
      // El usuario decidió explícitamente que es otra cancha
      await db.insert(t.canchas).values({ ligaId, nombre: p.court, desportsCourt: p.court, activo: true });
    } else if (p.destino === "conflicto" && p.canchaId) {
      // Con confirmación explícita se actualiza el nombre al importado; si se
      // guardó sin comprobar, se asigna a la cancha parecida SIN renombrarla
      // (el mismo default que pre-selecciona el comprobador — nunca duplicar)
      const patch = decision
        ? { nombre: p.court, desportsCourt: p.court, updatedAt: new Date() }
        : { desportsCourt: p.court, updatedAt: new Date() };
      await db.update(t.canchas)
        .set(patch)
        .where(and(eq(t.canchas.id, decision || p.canchaId), eq(t.canchas.ligaId, ligaId)));
    } else {
      await db.insert(t.canchas).values({ ligaId, nombre: p.court, desportsCourt: p.court, activo: true });
    }
  }
  return null;
}
