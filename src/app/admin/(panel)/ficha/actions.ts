"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";

export type ActionState = { error?: string; ok?: boolean };

// Goles: se capturan por jugador con su CANTIDAD (no por minuto); en la base
// se expanden a un renglón por gol para que goleo y marcadores cuadren igual
const golSchema = z.object({
  jugadorId: z.string().uuid("Falta elegir el jugador de un gol"),
  equipoId: z.string().uuid("Falta el equipo de un gol"),
  cantidad: z.coerce.number().int("Cantidad de goles inválida")
    .min(1, "La cantidad de goles mínima es 1").max(30, "Cantidad de goles fuera de rango (máximo 30)"),
});

const tarjetaSchema = z.object({
  jugadorId: z.string().uuid("Falta elegir el jugador de una tarjeta"),
  equipoId: z.string().uuid("Falta el equipo de una tarjeta"),
  minuto: z.coerce.number().int("Minuto inválido").min(0, "El minuto no puede ser negativo").max(150, "Minuto fuera de rango (máximo 150)"),
  tipo: z.enum(["amarilla", "roja"]),
});

// Marcador por regla para triunfos por default (retiro/no presentación del
// rival): 2-0, y los 2 goles SÍ se capturan con goleador (mismo jugador o dos)
const MARCADOR_DEFAULT = 2;

const fichaSchema = z.object({
  partidoId: z.string().uuid(),
  goles: z.array(golSchema).max(60, "La ficha admite máximo 60 renglones de goles"),
  tarjetas: z.array(tarjetaSchema).max(60, "La ficha admite máximo 60 tarjetas"),
  observaciones: z.string().trim().max(2000, "Las observaciones admiten máximo 2000 caracteres"),
  // Triunfo por default: el marcador es 3-0 al ganador, sin goleadores
  porDefault: z.enum(["local", "visitante"]).nullish(),
});

export async function guardarFicha(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "admin_equipo") return { error: "Sin permiso para capturar fichas" };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "No se pudo leer la ficha enviada; recarga la página e intenta de nuevo" };
  }
  const parsed = fichaSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.goles.reduce((acc, g) => acc + g.cantidad, 0) > 60) {
    return { error: "La ficha admite máximo 60 goles en total" };
  }
  // En un triunfo por default no hay tarjetas (el partido no se jugó), pero
  // los goles del ganador sí se capturan
  if (d.porDefault) {
    d.tarjetas = [];
  }

  const partido = await db.query.partidos.findFirst({
    where: (p, { eq }) => eq(p.id, d.partidoId),
    with: { torneo: { columns: { ligaId: true } } },
  });
  if (!partido || partido.torneo.ligaId !== ligaId) return { error: "Partido no encontrado" };
  if (user.rol === "arbitro" && partido.arbitroId !== user.arbitroId) {
    return { error: "Solo puedes capturar tus partidos asignados" };
  }
  if (partido.estado === "cancelado") return { error: "El partido está cancelado" };

  const equiposDelPartido = [partido.equipoLocalId, partido.equipoVisitanteId];
  const eventos = [...d.goles, ...d.tarjetas];
  if (eventos.some((e) => !equiposDelPartido.includes(e.equipoId))) {
    return { error: "Hay un gol o tarjeta asignado a un equipo que no juega este partido" };
  }
  const jugadorIds = [...new Set(eventos.map((e) => e.jugadorId))];
  if (jugadorIds.length) {
    // Un evento es válido si el jugador pertenece HOY al equipo indicado, o si
    // ya estaba registrado así en la ficha existente de este partido (permite
    // re-editar fichas viejas aunque el jugador haya cambiado de equipo).
    const [jugadores, golesPrevios, tarjetasPrevias] = await Promise.all([
      db.query.jugadores.findMany({
        where: (j, { inArray: inArr }) => inArr(j.id, jugadorIds),
        columns: { id: true, equipoId: true },
      }),
      db.query.goles.findMany({
        where: (g, { eq }) => eq(g.partidoId, d.partidoId),
        columns: { jugadorId: true, equipoId: true },
      }),
      db.query.tarjetas.findMany({
        where: (c, { eq }) => eq(c.partidoId, d.partidoId),
        columns: { jugadorId: true, equipoId: true },
      }),
    ]);
    const equipoDe = new Map(jugadores.map((j) => [j.id, j.equipoId]));
    const historicos = new Set(
      [...golesPrevios, ...tarjetasPrevias].map((x) => `${x.jugadorId}|${x.equipoId}`)
    );
    for (const e of eventos) {
      const actual = equipoDe.get(e.jugadorId) === e.equipoId;
      const historico = historicos.has(`${e.jugadorId}|${e.equipoId}`);
      if (!actual && !historico) {
        return { error: "Uno de los jugadores elegidos no pertenece al equipo indicado en la ficha" };
      }
    }
  }

  const suma = (equipoId: string) =>
    d.goles.filter((g) => g.equipoId === equipoId).reduce((acc, g) => acc + g.cantidad, 0);
  if (d.porDefault) {
    const ganadorId = d.porDefault === "local" ? partido.equipoLocalId : partido.equipoVisitanteId;
    const perdedorId = d.porDefault === "local" ? partido.equipoVisitanteId : partido.equipoLocalId;
    if (suma(ganadorId) !== MARCADOR_DEFAULT || suma(perdedorId) !== 0) {
      return {
        error: `En un triunfo por default el marcador por regla es ${MARCADOR_DEFAULT}-0: ` +
          `captura exactamente ${MARCADOR_DEFAULT} goles del equipo ganador ` +
          `(del mismo jugador o de dos jugadores distintos)`,
      };
    }
  }
  const golesLocal = suma(partido.equipoLocalId);
  const golesVisitante = suma(partido.equipoVisitanteId);
  const observaciones = d.porDefault
    ? `Partido ganado por default (${MARCADOR_DEFAULT}-0).${d.observaciones ? ` ${d.observaciones}` : ""}`
    : d.observaciones;

  await db.transaction(async (tx) => {
    await tx.delete(t.goles).where(eq(t.goles.partidoId, partido.id));
    await tx.delete(t.tarjetas).where(eq(t.tarjetas.partidoId, partido.id));
    if (d.goles.length) {
      // Un renglón en la base por cada gol de la cantidad capturada
      await tx.insert(t.goles).values(d.goles.flatMap((g) =>
        Array.from({ length: g.cantidad }, () => ({
          jugadorId: g.jugadorId, equipoId: g.equipoId, minuto: 0, partidoId: partido.id,
        }))
      ));
    }
    if (d.tarjetas.length) {
      await tx.insert(t.tarjetas).values(d.tarjetas.map((c) => ({ ...c, partidoId: partido.id })));
    }
    await tx.update(t.partidos).set({
      golesLocal,
      golesVisitante,
      estado: "finalizado",
      fichaObservaciones: observaciones || null,
      fichaCompletada: true,
      fichaFechaCaptura: new Date(),
      updatedAt: new Date(),
    }).where(eq(t.partidos.id, partido.id));
  });

  revalidatePath("/admin/ficha");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
  return { ok: true };
}
