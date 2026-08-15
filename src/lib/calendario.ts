import "server-only";

export interface GeneracionConfig {
  equipoIds: string[];
  canchaIds: string[];
  arbitroIds: string[];
  fechaInicio: string; // YYYY-MM-DD
  diasJuego: string[]; // ["sabado","domingo",...]
  horarios: string[]; // legado: mismos horarios todos los días
  // Slots elegidos por día y cancha ({ sabado: { canchaId: ["09:00"] } });
  // si está presente, manda sobre la lista plana
  horariosPorCancha?: Record<string, Record<string, string[]>> | null;
  formato: string; // "ida" | "ida_vuelta" (legado; se usa si no hay partidosPorEquipo)
  partidosPorEquipo?: number | null; // fechas garantizadas por equipo
  duracionPartido: number; // minutos
  descansoEntrePartidos: number; // minutos
  // equipoId → HH:MM: equipos con horario fijo pagado (prioridad de turno).
  // Si los dos equipos de un partido tienen horario fijo distinto, gana el local
  horariosFijos?: Record<string, string>;
  // "fecha|hora" → árbitros ya asignados a esa hora en OTROS torneos de la
  // liga: no se les asigna otro partido simultáneo. Si ningún árbitro queda
  // libre, el partido se genera sin árbitro (se asigna a mano después)
  arbitrosOcupados?: Record<string, string[]>;
}

export interface PartidoGenerado {
  jornada: number;
  fecha: string;
  hora: string;
  canchaId: string | null;
  arbitroId: string | null;
  equipoLocalId: string;
  equipoVisitanteId: string;
}

/** El torneo no cabe en los días/horarios/canchas configurados. */
export class CapacidadError extends Error {}

const WEEKDAY: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

// No se agendan partidos que inicien después de esta hora
const ULTIMA_HORA_INICIO = 22 * 60;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fecha del día-de-semana pedido dentro de la semana que inicia en weekStart. */
function dateForWeekday(weekStart: Date, weekday: number): Date {
  const offset = (weekday - weekStart.getDay() + 7) % 7;
  return addDays(weekStart, offset);
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function aHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/**
 * Turnos de inicio por día (modo legado, lista plana). Parte de los horarios
 * configurados y, si no alcanzan para los partidos simultáneos que caben en
 * las canchas, agrega turnos extra espaciados por duración + descanso (hasta
 * las 22:00).
 */
function turnosDelDia(cfg: SlotConfig, necesarios: number): string[] {
  const turnos = [...new Set(cfg.horarios ?? [])].sort((a, b) => aMinutos(a) - aMinutos(b));
  if (!turnos.length) turnos.push("10:00");

  const paso = Math.max(30, cfg.duracionPartido + cfg.descansoEntrePartidos);
  while (turnos.length < necesarios) {
    const siguiente = aMinutos(turnos[turnos.length - 1]) + paso;
    if (siguiente > ULTIMA_HORA_INICIO) break;
    turnos.push(aHora(siguiente));
  }
  return turnos;
}

interface Cruce { local: string; visitante: string }

/** Rondas base del método del círculo, con el equipo que descansa por ronda. */
function rondasBase(equipoIds: string[]): { matches: Cruce[]; bye: string | null }[] {
  const teams = [...equipoIds];
  if (teams.length % 2 !== 0) teams.push("BYE");
  const n = teams.length;
  const rondas: { matches: Cruce[]; bye: string | null }[] = [];
  const rotating = teams.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const matches: Cruce[] = [];
    let bye: string | null = null;
    const current = [teams[0], ...rotating];
    for (let m = 0; m < n / 2; m++) {
      const a = current[m];
      const b = current[n - 1 - m];
      if (a === "BYE" || b === "BYE") {
        bye = a === "BYE" ? b : a;
        continue;
      }
      // Alterna localía del equipo fijo para que no siempre juegue en casa
      matches.push(r % 2 === 0 && m === 0 ? { local: b, visitante: a } : { local: a, visitante: b });
    }
    rondas.push({ matches, bye });
    rotating.push(rotating.shift()!);
  }
  return rondas;
}

/**
 * Jornadas para que cada equipo juegue exactamente F partidos (fechas
 * garantizadas): vueltas completas de round-robin (localía alternada por
 * vuelta) más una vuelta parcial. Los cruces se repiten lo mínimo que la
 * aritmética permite: ceil(F / (n−1)).
 *
 * Con equipos impares, los que descansaron en la vuelta parcial se emparejan
 * entre sí en una jornada extra de alcance (mismo criterio que la baja de
 * equipo). Si n y F son ambos impares la igualdad exacta es imposible
 * (n×F partidos-equipo es impar): un equipo cierra con F+1.
 */
function rondasParaF(equipoIds: string[], F: number): Cruce[][] {
  const base = rondasBase(equipoIds);
  const porVuelta = equipoIds.length - 1; // juegos por equipo por vuelta completa
  const vueltas = Math.floor(F / porVuelta);
  const rem = F % porVuelta;

  const swap = (m: Cruce): Cruce => ({ local: m.visitante, visitante: m.local });
  const rondas: Cruce[][] = [];
  for (let v = 0; v < vueltas; v++) {
    for (const r of base) rondas.push(v % 2 === 1 ? r.matches.map(swap) : r.matches);
  }
  if (rem > 0) {
    // Vuelta parcial: rondas completas del círculo, así todos los que no
    // descansan juegan exactamente `rem` partidos más
    const parcial = base.slice(0, rem);
    for (const r of parcial) rondas.push(vueltas % 2 === 1 ? r.matches.map(swap) : r.matches);

    // Impares: los bye de la vuelta parcial quedaron un juego abajo. Jornada
    // extra emparejándolos entre sí, minimizando cruces ya programados
    const cortos = parcial.map((r) => r.bye).filter((b): b is string => b !== null);
    if (cortos.length) {
      const veces = new Map<string, number>();
      const clave = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
      for (const ronda of rondas) {
        for (const m of ronda) {
          const k = clave(m.local, m.visitante);
          veces.set(k, (veces.get(k) ?? 0) + 1);
        }
      }
      const extra: Cruce[] = [];
      const pendientes = [...cortos];
      // n y F impares: el último corto no tiene par; juega contra el bye de la
      // siguiente ronda (ese equipo cierra con F+1)
      if (pendientes.length % 2 === 1) {
        const comodin = base[rem % base.length].bye;
        if (comodin) pendientes.push(comodin);
      }
      while (pendientes.length > 1) {
        const a = pendientes.shift()!;
        let mejor = 0;
        for (let i = 1; i < pendientes.length; i++) {
          if ((veces.get(clave(a, pendientes[i])) ?? 0) < (veces.get(clave(a, pendientes[mejor])) ?? 0)) mejor = i;
        }
        const b = pendientes.splice(mejor, 1)[0];
        veces.set(clave(a, b), (veces.get(clave(a, b)) ?? 0) + 1);
        extra.push({ local: a, visitante: b });
      }
      if (extra.length) rondas.push(extra);
    }
  }
  return rondas;
}

/**
 * Genera el calendario completo. El número de jornadas sale de las fechas
 * garantizadas (partidosPorEquipo); sin ese dato, del formato legado
 * (ida = n−1, ida_vuelta = 2(n−1)).
 *
 * Asignación de slots: dentro de cada día, los partidos llenan primero todas
 * las canchas de un turno y luego pasan al siguiente turno, de modo que ningún
 * par (cancha, hora) se repite y ningún árbitro queda en dos canchas a la vez.
 * Lanza CapacidadError si la jornada no cabe en días × turnos × canchas.
 */
export function generarCalendario(cfg: GeneracionConfig): PartidoGenerado[] {
  const nReal = cfg.equipoIds.length;
  if (nReal < 2) return [];
  const F = cfg.partidosPorEquipo ?? (cfg.formato === "ida_vuelta" ? 2 * (nReal - 1) : nReal - 1);
  const rondas = rondasParaF(cfg.equipoIds, F);
  return asignarSlots(rondas, cfg, new Date(cfg.fechaInicio + "T12:00:00"), 1);
}

/** Slots del calendario: días, turnos, canchas y árbitros para cada jornada. */
type SlotConfig = Pick<GeneracionConfig,
  "canchaIds" | "arbitroIds" | "diasJuego" | "horarios" | "horariosPorCancha" | "duracionPartido" | "descansoEntrePartidos" | "horariosFijos" | "arbitrosOcupados">;

function asignarSlots(
  rondas: Cruce[][],
  cfg: SlotConfig,
  baseDate: Date,
  jornadaInicio: number
): PartidoGenerado[] {
  if (!rondas.length) return [];
  const dias = cfg.diasJuego.length ? cfg.diasJuego : ["sabado"];
  const canchas = cfg.canchaIds.length;

  // Partidos que deben caber por día en la jornada más cargada
  const maxPorJornada = Math.max(...rondas.map((r) => r.length));
  const porDia = Math.ceil(maxPorJornada / dias.length);

  const partidos: PartidoGenerado[] = [];

  const fijos = cfg.horariosFijos ?? {};
  const horaFijaDe = (m: Cruce) => fijos[m.local] ?? fijos[m.visitante] ?? null;

  // Malla de slots disponibles por jornada, en el orden en que se llenan
  // (todas las canchas de un turno antes del siguiente turno)
  interface Slot { diaIdx: number; hora: string; canchaId: string | null }
  const malla: Slot[] = [];
  let turnosLegado: string[] = [];

  if (cfg.horariosPorCancha && canchas) {
    // Modo explícito: cada (día, cancha) tiene sus propios horarios elegidos
    // por el admin; la malla es exactamente esa selección
    for (let d = 0; d < dias.length; d++) {
      const delDia = cfg.horariosPorCancha[dias[d]] ?? {};
      const horasDia = [...new Set(Object.values(delDia).flat())]
        .sort((a, b) => aMinutos(a) - aMinutos(b));
      for (const hora of horasDia)
        for (const cid of cfg.canchaIds)
          if (delDia[cid]?.includes(hora)) malla.push({ diaIdx: d, hora, canchaId: cid });
    }
    if (malla.length < maxPorJornada) {
      const desglose = dias
        .map((dia) => `${dia}: ${Object.values(cfg.horariosPorCancha![dia] ?? {}).flat().length} lugar(es)`)
        .join(", ");
      throw new CapacidadError(
        `La jornada tiene ${maxPorJornada} partidos pero el torneo solo tiene ${malla.length} ` +
        `lugar(es) por semana (${desglose}). Selecciona más horarios, canchas o días de juego.`
      );
    }
  } else {
    // Modo legado: lista plana de horarios para todos los días y canchas
    const turnosNecesarios = canchas ? Math.ceil(porDia / canchas) : 1;
    turnosLegado = turnosDelDia(cfg, turnosNecesarios);
    if (canchas && turnosLegado.length * canchas * dias.length < maxPorJornada) {
      throw new CapacidadError(
        `La jornada tiene ${maxPorJornada} partidos pero solo caben ` +
        `${turnosLegado.length * canchas * dias.length} ` +
        `(${dias.length} día(s) × ${turnosLegado.length} turno(s) × ${canchas} cancha(s)). ` +
        `Agrega canchas, horarios o días de juego al torneo.`
      );
    }
    // Sin canchas registradas no hay restricción física: caben porDia
    // partidos simultáneos en cualquier turno
    const columnas = canchas || Math.max(1, porDia);
    for (let d = 0; d < dias.length; d++)
      for (const hora of turnosLegado)
        for (let c = 0; c < columnas; c++)
          malla.push({ diaIdx: d, hora, canchaId: canchas ? cfg.canchaIds[c] : null });
  }

  rondas.forEach((ronda, rIdx) => {
    const weekStart = addDays(baseDate, rIdx * 7);
    // Árbitros ocupados por (fecha|hora) para no asignar dos partidos a la vez
    const ocupados = new Map<string, Set<string>>();
    let arbitroCursor = rIdx; // rota el punto de partida por jornada (equidad)

    const asignacion = new Array<Slot>(ronda.length);
    const usados = new Set<number>(); // índices de la malla ya ocupados
    const cargaDia = new Array(dias.length).fill(0);

    // 1) Horario fijo primero: reserva un slot de su hora (día menos cargado)
    ronda.forEach((m, i) => {
      const H = horaFijaDe(m);
      if (!H) return;
      let mejor = -1;
      for (let s = 0; s < malla.length; s++) {
        if (usados.has(s) || malla[s].hora !== H) continue;
        if (mejor === -1 || cargaDia[malla[s].diaIdx] < cargaDia[malla[mejor].diaIdx]) mejor = s;
      }
      if (mejor === -1) {
        if (!canchas) {
          // Sin canchas registradas no hay restricción física: se respeta la hora
          asignacion[i] = { diaIdx: 0, hora: H, canchaId: null };
          cargaDia[0]++;
          return;
        }
        throw new CapacidadError(
          `No hay lugar a las ${H} en la jornada ${jornadaInicio + rIdx} para el horario fijo ` +
          `de un equipo (${canchas} cancha(s) × ${dias.length} día(s)). ` +
          `Verifica que las ${H} estén entre los horarios del torneo o agrega canchas o días.`
        );
      }
      asignacion[i] = malla[mejor];
      usados.add(mejor);
      cargaDia[malla[mejor].diaIdx]++;
    });

    // 2) El resto reparte por día (máx. porDia por día, como el rol normal)
    ronda.forEach((m, i) => {
      if (asignacion[i] !== undefined) return;
      let elegido = -1;
      for (let s = 0; s < malla.length; s++) {
        if (usados.has(s)) continue;
        if (cargaDia[malla[s].diaIdx] >= porDia) continue;
        elegido = s;
        break;
      }
      // Si los fijos desbalancearon los días, usa cualquier slot libre
      if (elegido === -1) elegido = malla.findIndex((_s, s) => !usados.has(s));
      if (elegido === -1) {
        if (!canchas) {
          asignacion[i] = { diaIdx: 0, hora: turnosLegado[i % turnosLegado.length] ?? "10:00", canchaId: null };
          return;
        }
        throw new CapacidadError(
          `La jornada ${jornadaInicio + rIdx} no cabe en los días, turnos y canchas del torneo. ` +
          `Agrega canchas, horarios o días de juego.`
        );
      }
      asignacion[i] = malla[elegido];
      usados.add(elegido);
      cargaDia[malla[elegido].diaIdx]++;
    });

    ronda.forEach((m, mIdx) => {
      const { diaIdx, hora, canchaId } = asignacion[mIdx];
      const fecha = iso(dateForWeekday(weekStart, WEEKDAY[dias[diaIdx]] ?? 6));

      let arbitroId: string | null = null;
      if (cfg.arbitroIds.length) {
        const clave = `${fecha}|${hora}`;
        const enTurno = ocupados.get(clave) ?? new Set<string>();
        // Árbitros ya comprometidos a esta misma hora en otros torneos
        const enOtroTorneo = new Set(cfg.arbitrosOcupados?.[clave] ?? []);
        for (let i = 0; i < cfg.arbitroIds.length; i++) {
          const candidato = cfg.arbitroIds[(arbitroCursor + i) % cfg.arbitroIds.length];
          if (!enTurno.has(candidato) && !enOtroTorneo.has(candidato)) {
            arbitroId = candidato;
            arbitroCursor = arbitroCursor + i + 1;
            enTurno.add(candidato);
            break;
          }
        }
        ocupados.set(clave, enTurno);
        // Si todos los árbitros están ocupados a esa hora (aquí o en otro
        // torneo), el partido queda sin árbitro: el calendario lo marca con
        // alerta para que la liga asigne uno a mano.
      }

      partidos.push({
        jornada: jornadaInicio + rIdx,
        fecha,
        hora,
        canchaId,
        arbitroId,
        equipoLocalId: m.local,
        equipoVisitanteId: m.visitante,
      });
    });
  });

  return partidos;
}

export interface RegeneracionConfig extends SlotConfig {
  equipoIds: string[]; // equipos vigentes (sin retirados)
  partidosPorEquipo: number; // F: fechas garantizadas por equipo
  jugados: Record<string, number>; // partidos fijos (con resultado/en curso) por equipo
  crucesFijos: [string, string][]; // enfrentamientos ya fijos, para minimizar repetidos
  jornadaInicio: number; // primera jornada nueva
  fechaBase: string; // YYYY-MM-DD: semana de la primera jornada nueva
}

/**
 * Reprograma lo pendiente tras una baja (o para emparejar juegos jugados):
 * genera jornadas hasta que cada equipo vigente complete sus F partidos,
 * emparejando por jornada a los más rezagados y repitiendo los cruces menos
 * jugados. Si la paridad no cierra (suma de faltantes impar), un equipo de
 * relleno queda con un partido de más — nunca con menos.
 */
export function regenerarPendientes(cfg: RegeneracionConfig): PartidoGenerado[] {
  const F = cfg.partidosPorEquipo;
  const falta = new Map(cfg.equipoIds.map((e) => [e, Math.max(0, F - (cfg.jugados[e] ?? 0))]));
  const total = () => [...falta.values()].reduce((a, b) => a + b, 0);

  const clave = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const veces = new Map<string, number>();
  for (const [a, b] of cfg.crucesFijos) {
    if (falta.has(a) && falta.has(b)) veces.set(clave(a, b), (veces.get(clave(a, b)) ?? 0) + 1);
  }
  const registrar = (a: string, b: string) => veces.set(clave(a, b), (veces.get(clave(a, b)) ?? 0) + 1);
  // Localía alternada en repeticiones: si ya se enfrentaron un número impar de
  // veces, se invierte respecto del orden natural
  const cruce = (a: string, b: string): Cruce =>
    (veces.get(clave(a, b)) ?? 0) % 2 === 1 ? { local: b, visitante: a } : { local: a, visitante: b };

  const rondas: Cruce[][] = [];
  let guardia = 0;
  while (total() > 0 && guardia++ < 1000) {
    // Prioridad a los más rezagados. Con rezagos iguales, el orden rota por
    // jornada (sort estable): si no, los mismos equipos quedarían al final de
    // cada jornada y se emparejarían entre sí una y otra vez
    const base = cfg.equipoIds.filter((e) => (falta.get(e) ?? 0) > 0);
    const rot = rondas.length % Math.max(1, base.length);
    const pool = [...base.slice(rot), ...base.slice(0, rot)]
      .sort((a, b) => falta.get(b)! - falta.get(a)!);
    const usados = new Set<string>();
    const matches: Cruce[] = [];

    for (const a of pool) {
      if (usados.has(a)) continue;
      const cands = pool.filter((x) => x !== a && !usados.has(x));
      let b: string | undefined;
      if (cands.length) {
        b = cands.reduce((m, x) =>
          (veces.get(clave(a, x)) ?? 0) < (veces.get(clave(a, m)) ?? 0) ? x : m);
      } else if (matches.length === 0) {
        // `a` es el único con partidos pendientes: rival de relleno con menos
        // cruces previos (ese rival cierra con un juego de más)
        const otros = cfg.equipoIds.filter((x) => x !== a);
        if (!otros.length) break;
        b = otros.reduce((m, x) =>
          (veces.get(clave(a, x)) ?? 0) < (veces.get(clave(a, m)) ?? 0) ? x : m);
      }
      if (!b) continue; // impar: descansa esta jornada y toma prioridad en la siguiente
      matches.push(cruce(a, b));
      registrar(a, b);
      falta.set(a, falta.get(a)! - 1);
      falta.set(b, Math.max(0, (falta.get(b) ?? 0) - 1));
      usados.add(a).add(b);
    }
    if (!matches.length) break;
    rondas.push(matches);
  }

  return asignarSlots(rondas, cfg, new Date(cfg.fechaBase + "T12:00:00"), cfg.jornadaInicio);
}
