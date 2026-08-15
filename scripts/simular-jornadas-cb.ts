/**
 * Simula las primeras N jornadas del torneo "Apertura Fútbol 7 Casa Blanca":
 * marcadores realistas de fútbol 7, goles atribuidos a jugadores reales
 * (delanteros con más probabilidad), tarjetas, ficha arbitral completada y
 * pagos (inscripción por equipo + arbitraje por partido).
 *
 * Uso: npx tsx scripts/simular-jornadas-cb.ts
 */
import { and, eq, inArray, lte } from "drizzle-orm";
import { db, tables as t } from "../src/db";

const TORNEO = "Apertura Fútbol 7 Casa Blanca";
const JORNADAS = 5;

const azar = (n: number) => Math.floor(Math.random() * n);
const de = <T,>(arr: T[]) => arr[azar(arr.length)];

/** Goles por equipo en fútbol 7: 0-7, cargado al centro. */
function golesEquipo(): number {
  const r = Math.random();
  if (r < 0.12) return 0;
  if (r < 0.32) return 1;
  if (r < 0.55) return 2;
  if (r < 0.75) return 3;
  if (r < 0.88) return 4;
  if (r < 0.95) return 5;
  return 6 + azar(2);
}

/** Peso de anotación por posición. */
function peso(posicion: string): number {
  if (posicion === "Delantero") return 5;
  if (posicion === "Medio") return 3;
  if (posicion === "Defensa") return 1;
  return 0.2; // portero
}

function elegirAnotador(plantilla: { id: string; posicion: string }[]): string {
  const total = plantilla.reduce((s, j) => s + peso(j.posicion), 0);
  let r = Math.random() * total;
  for (const j of plantilla) {
    r -= peso(j.posicion);
    if (r <= 0) return j.id;
  }
  return plantilla[plantilla.length - 1].id;
}

async function main() {
  const torneo = await db.query.torneos.findFirst({
    where: (tr, { eq }) => eq(tr.nombre, TORNEO),
  });
  if (!torneo) throw new Error(`No existe el torneo "${TORNEO}"`);

  const partidos = await db.query.partidos.findMany({
    where: and(eq(t.partidos.torneoId, torneo.id), lte(t.partidos.jornada, JORNADAS)),
    orderBy: (p, { asc }) => [asc(p.jornada), asc(p.fecha), asc(p.hora)],
  });
  console.log(`Torneo: ${torneo.nombre} — ${partidos.length} partidos en jornadas 1-${JORNADAS}`);

  const yaJugados = partidos.filter((p) => p.estado === "finalizado").length;
  if (yaJugados) {
    console.error(`⚠ ${yaJugados} partidos ya tienen resultado. Aborto para no pisar datos.`);
    process.exit(1);
  }

  // Plantillas por equipo (solo jugadores activos)
  const equipoIds = [...new Set(partidos.flatMap((p) => [p.equipoLocalId, p.equipoVisitanteId]))];
  const jugadores = await db.query.jugadores.findMany({
    where: and(inArray(t.jugadores.equipoId, equipoIds), eq(t.jugadores.activo, true)),
    columns: { id: true, equipoId: true, posicion: true },
  });
  const plantilla = new Map<string, { id: string; posicion: string }[]>();
  for (const j of jugadores) {
    const arr = plantilla.get(j.equipoId) ?? [];
    arr.push({ id: j.id, posicion: j.posicion });
    plantilla.set(j.equipoId, arr);
  }

  const OBSERVACIONES = [
    null, null, null, null,
    "Sin incidencias.",
    "Partido detenido 5 minutos por lluvia.",
    "Reclamo verbal al término, sin consecuencias.",
    "Se atendió a un jugador por calambres.",
  ];

  console.log("→ Simulando partidos…");
  for (const p of partidos) {
    const gl = golesEquipo();
    const gv = golesEquipo();

    const goles: { partidoId: string; jugadorId: string; equipoId: string; minuto: number }[] = [];
    for (const [equipoId, cuantos] of [[p.equipoLocalId, gl], [p.equipoVisitanteId, gv]] as const) {
      const pl = plantilla.get(equipoId)!;
      for (let i = 0; i < cuantos; i++) {
        goles.push({
          partidoId: p.id,
          jugadorId: elegirAnotador(pl),
          equipoId,
          minuto: 1 + azar(50),
        });
      }
    }

    const tarjetas: { partidoId: string; jugadorId: string; equipoId: string; tipo: "amarilla" | "roja"; minuto: number }[] = [];
    const nAmarillas = azar(4); // 0-3
    for (let i = 0; i < nAmarillas; i++) {
      const equipoId = Math.random() < 0.5 ? p.equipoLocalId : p.equipoVisitanteId;
      tarjetas.push({
        partidoId: p.id,
        jugadorId: de(plantilla.get(equipoId)!).id,
        equipoId,
        tipo: "amarilla",
        minuto: 5 + azar(45),
      });
    }
    if (Math.random() < 0.08) {
      const equipoId = Math.random() < 0.5 ? p.equipoLocalId : p.equipoVisitanteId;
      tarjetas.push({
        partidoId: p.id,
        jugadorId: de(plantilla.get(equipoId)!).id,
        equipoId,
        tipo: "roja",
        minuto: 20 + azar(30),
      });
    }

    // Captura de la ficha ~2h después del inicio del partido
    const captura = new Date(`${p.fecha}T${p.hora}:00-06:00`);
    captura.setHours(captura.getHours() + 2);

    await db.transaction(async (tx) => {
      if (goles.length) await tx.insert(t.goles).values(goles);
      if (tarjetas.length) await tx.insert(t.tarjetas).values(tarjetas);
      await tx.update(t.partidos).set({
        golesLocal: gl,
        golesVisitante: gv,
        estado: "finalizado",
        fichaCompletada: true,
        fichaObservaciones: de(OBSERVACIONES),
        fichaFechaCaptura: captura,
        updatedAt: new Date(),
      }).where(eq(t.partidos.id, p.id));
    });
  }
  console.log(`  ${partidos.length} partidos simulados`);

  // ── Pagos ──
  console.log("→ Pagos de inscripción (24 equipos)…");
  const inscripcion = Number(torneo.costoInscripcion);
  let pendientes = 0;
  for (const equipoId of equipoIds) {
    const pagado = Math.random() < 0.85;
    if (!pagado) pendientes++;
    await db.insert(t.pagos).values({
      torneoId: torneo.id,
      equipoId,
      tipo: "inscripcion",
      monto: inscripcion.toFixed(2),
      estado: pagado ? "pagado" : "pendiente",
      fecha: pagado ? "2026-08-10" : null,
    });
  }
  console.log(`  ${equipoIds.length} pagos de inscripción (${pendientes} pendientes)`);

  console.log("→ Pagos de arbitraje (por partido, mitad cada equipo)…");
  const mitadArbitraje = Number(torneo.costoArbitraje) / 2;
  let nArb = 0;
  for (const p of partidos) {
    for (const equipoId of [p.equipoLocalId, p.equipoVisitanteId]) {
      // Jornadas pasadas casi todas pagadas; la última con más pendientes
      const pagado = p.jornada < JORNADAS ? Math.random() < 0.95 : Math.random() < 0.6;
      await db.insert(t.pagos).values({
        torneoId: torneo.id,
        equipoId,
        partidoId: p.id,
        jornada: p.jornada,
        tipo: "arbitraje",
        monto: mitadArbitraje.toFixed(2),
        estado: pagado ? "pagado" : "pendiente",
        fecha: pagado ? p.fecha : null,
      });
      nArb++;
    }
  }
  console.log(`  ${nArb} pagos de arbitraje`);

  console.log("✓ Simulación completa");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
