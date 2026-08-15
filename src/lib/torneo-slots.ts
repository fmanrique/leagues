import "server-only";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db, tables as t } from "@/db";

/** Un (día, cancha, hora) reservado por un torneo vigente de la liga. */
export interface SlotOcupado {
  torneoId: string;
  torneoNombre: string;
  dia: string;
  canchaId: string;
  hora: string;
}

/**
 * Slots semanales reservados por los torneos vigentes (no finalizados ni
 * cancelados) de la liga: dos torneos no pueden ocupar la misma cancha a la
 * misma hora del mismo día. Los torneos legados sin horarios por cancha
 * reservan su lista plana en todas sus canchas y días.
 */
/** Horas de un torneo (unión de sus slots por cancha, o la lista legada). */
function horasDelTorneo(tr: { horarios: string[]; horariosPorCancha: Record<string, Record<string, string[]>> | null }): string[] {
  if (!tr.horariosPorCancha) return tr.horarios;
  return [...new Set(Object.values(tr.horariosPorCancha).flatMap((porCancha) => Object.values(porCancha).flat()))];
}

/**
 * Horarios elegibles como "horario fijo" de cada equipo: la unión de los
 * horarios de los torneos vigentes donde está inscrito. Un equipo sin
 * inscripciones no tiene opciones (su hora fija queda "por definir").
 */
export async function horariosDisponiblesPorEquipo(ligaId: string): Promise<Map<string, string[]>> {
  const torneos = await db.query.torneos.findMany({
    where: (tr, { and: andOp, eq: eqOp }) => andOp(
      eqOp(tr.ligaId, ligaId),
      inArray(t.torneos.estado, ["configuracion", "inscripciones", "en_curso"])
    ),
    columns: { horarios: true, horariosPorCancha: true },
    with: { equipos: { columns: { equipoId: true } } },
  });
  const mapa = new Map<string, Set<string>>();
  for (const tr of torneos) {
    const horas = horasDelTorneo(tr);
    for (const { equipoId } of tr.equipos) {
      const set = mapa.get(equipoId) ?? new Set<string>();
      for (const h of horas) set.add(h);
      mapa.set(equipoId, set);
    }
  }
  return new Map([...mapa.entries()].map(([id, set]) => [id, [...set].sort()]));
}

/**
 * Árbitros ya asignados por OTROS torneos de la liga, agrupados por
 * "fecha|hora": el generador del rol no les asigna partidos simultáneos.
 */
export async function arbitrosOcupadosPorHorario(
  ligaId: string,
  torneoIdExcluido: string
): Promise<Record<string, string[]>> {
  const filas = await db
    .select({
      fecha: t.partidos.fecha,
      hora: t.partidos.hora,
      arbitroId: t.partidos.arbitroId,
    })
    .from(t.partidos)
    .innerJoin(t.torneos, eq(t.partidos.torneoId, t.torneos.id))
    .where(and(
      eq(t.torneos.ligaId, ligaId),
      ne(t.partidos.torneoId, torneoIdExcluido),
      ne(t.partidos.estado, "cancelado"),
      isNotNull(t.partidos.arbitroId)
    ));
  const mapa: Record<string, string[]> = {};
  for (const f of filas) {
    const clave = `${f.fecha}|${f.hora}`;
    (mapa[clave] ??= []).push(f.arbitroId!);
  }
  return mapa;
}

export async function slotsOcupados(ligaId: string): Promise<SlotOcupado[]> {
  const torneos = await db.query.torneos.findMany({
    where: (tr, { and: andOp, eq: eqOp }) => andOp(
      eqOp(tr.ligaId, ligaId),
      inArray(t.torneos.estado, ["configuracion", "inscripciones", "en_curso"])
    ),
    columns: { id: true, nombre: true, diasJuego: true, horarios: true, horariosPorCancha: true },
    with: { canchas: { columns: { canchaId: true } } },
  });

  const ocupados: SlotOcupado[] = [];
  for (const tr of torneos) {
    if (tr.horariosPorCancha) {
      for (const [dia, porCancha] of Object.entries(tr.horariosPorCancha)) {
        for (const [canchaId, horas] of Object.entries(porCancha)) {
          for (const hora of horas) {
            ocupados.push({ torneoId: tr.id, torneoNombre: tr.nombre, dia, canchaId, hora });
          }
        }
      }
    } else {
      for (const dia of tr.diasJuego) {
        for (const { canchaId } of tr.canchas) {
          for (const hora of tr.horarios) {
            ocupados.push({ torneoId: tr.id, torneoNombre: tr.nombre, dia, canchaId, hora });
          }
        }
      }
    }
  }
  return ocupados;
}

