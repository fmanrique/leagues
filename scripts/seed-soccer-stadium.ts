/**
 * Simulación completa contra la plataforma de videos DE/SPORTS real:
 * liga "Soccer Stadium" conectada al league id 67d2edc75289102e84964179,
 * canchas importadas del API de cámaras, torneo F7 de 8 equipos con horarios
 * tomados de las franjas reales, 6 jornadas jugadas con fichas y pagos.
 * La última jornada cae en la semana actual para que el público muestre los
 * links "Revive tu partido" resueltos automáticamente contra el API.
 *
 * Uso: npx tsx --conditions react-server scripts/seed-soccer-stadium.ts
 */
import { and, eq, inArray, lte } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { db, tables as t } from "../src/db";
import { generarCalendario } from "../src/lib/calendario";
import { fetchScheduleDesports } from "../src/lib/desports";
import { importarCanchasDesports } from "../src/lib/desports-import";

const DESPORTS_ID = "67d2edc75289102e84964179";
const SLUG = "soccer-stadium";

const EQUIPOS = [
  ["Búfalos del Estadio", "#B91C1C"], ["Cimarrones FC", "#1D4ED8"],
  ["Dínamo Regio", "#0D9488"], ["Furia Naranja", "#EA580C"],
  ["Gallos del Sur", "#CA8A04"], ["Linces Urbanos", "#4B5563"],
  ["Real Estadio", "#7C3AED"], ["Tiburones Grises", "#0891B2"],
] as const;

const NOMBRES = ["Juan", "Carlos", "Luis", "Miguel", "José", "Jorge", "Fernando", "Ricardo", "Eduardo", "Roberto", "Alejandro", "Daniel", "Sergio", "Arturo", "Héctor", "Raúl", "Óscar", "Iván", "Diego", "Andrés", "Pablo", "Marco", "Emilio", "Gerardo", "Rodrigo", "Saúl", "Ramón", "Víctor", "Hugo", "Adrián"];
const APELLIDOS = ["García", "Martínez", "López", "Hernández", "González", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Ortiz", "Gutiérrez", "Chávez", "Ramos", "Mendoza", "Ruiz", "Álvarez", "Castillo", "Jiménez", "Vargas", "Rojas", "Salazar", "Ibarra"];
const POSICIONES = ["Portero", "Defensa", "Defensa", "Medio", "Medio", "Delantero"];

const ARBITROS = [
  ["Norberto", "Alanís Cepeda"], ["Patricia", "Leal Montes"], ["Ismael", "Duarte Cavazos"],
] as const;

const azar = (n: number) => Math.floor(Math.random() * n);
const de = <T,>(arr: readonly T[]) => arr[azar(arr.length)];

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

function peso(posicion: string): number {
  if (posicion === "Delantero") return 5;
  if (posicion === "Medio") return 3;
  if (posicion === "Defensa") return 1;
  return 0.2;
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
  if (await db.query.ligas.findFirst({ where: (l, { eq: eqOp }) => eqOp(l.slug, SLUG) })) {
    throw new Error(`La liga ${SLUG} ya existe; borra antes de re-sembrar.`);
  }

  // El ID debe existir en la plataforma antes de sembrar nada
  const schedule = await fetchScheduleDesports(DESPORTS_ID);
  if (!schedule) throw new Error("El API DE/SPORTS no respondió para el league id");
  console.log(`API DE/SPORTS ok: canchas ${schedule.canchas.join(" | ")}`);

  console.log("→ Liga Soccer Stadium…");
  const [liga] = await db.insert(t.ligas).values({
    slug: SLUG,
    nombre: "Liga Soccer Stadium",
    direccion: "Av. del Estadio 1500, Monterrey",
    telefono: "81-2000-3000",
    email: "contacto@soccerstadium.mx",
    colorPrimario: "#2563EB",
    colorSecundario: "#101820",
    colorAcento: "#FFD100",
    desportsLigaId: DESPORTS_ID,
    activo: true,
  }).returning();

  console.log("→ Admin de la liga (stadium/stadium1)…");
  await db.insert(t.usuarios).values({
    ligaId: liga.id,
    username: "stadium",
    passwordHash: await hash("stadium1"),
    nombre: "Ángel Ávila",
    rol: "admin_liga",
    activo: true,
  });

  console.log("→ Canchas importadas del API de cámaras…");
  const errImport = await importarCanchasDesports(liga.id, DESPORTS_ID, {});
  if (errImport) throw new Error(errImport);
  const canchas = await db.query.canchas.findMany({
    where: (c, { eq: eqOp }) => eqOp(c.ligaId, liga.id),
  });
  console.log(`  ${canchas.map((c) => `${c.nombre} → ${c.desportsCourt}`).join(" | ")}`);
  const canchaIds = canchas.map((c) => c.id);

  console.log("→ 8 equipos con 10-12 jugadores…");
  const equipoIds: string[] = [];
  for (const [nombre, color] of EQUIPOS) {
    const [row] = await db.insert(t.equipos).values({
      ligaId: liga.id,
      nombre,
      colorLocal: color,
      colorVisitante: "#FFFFFF",
      rama: "varonil",
      categoriaLibre: true,
      entrenador: `${de(NOMBRES)} ${de(APELLIDOS)}`,
      telefono: `81-${1000 + azar(9000)}-${1000 + azar(9000)}`,
      email: "",
      activo: true,
    }).returning({ id: t.equipos.id });
    equipoIds.push(row.id);

    const cuantos = 10 + azar(3);
    const numeros = new Set<number>();
    const filas = [];
    for (let i = 0; i < cuantos; i++) {
      let num = 1 + azar(99);
      while (numeros.has(num)) num = 1 + azar(99);
      numeros.add(num);
      const anio = 1988 + azar(20);
      filas.push({
        equipoId: row.id,
        nombre: de(NOMBRES),
        apellidoPaterno: de(APELLIDOS),
        apellidoMaterno: de(APELLIDOS),
        fechaNacimiento: `${anio}-${String(1 + azar(12)).padStart(2, "0")}-${String(1 + azar(28)).padStart(2, "0")}`,
        estatura: 160 + azar(31),
        peso: 60 + azar(36),
        sexo: "hombre",
        numero: num,
        posicion: i === 0 ? "Portero" : de(POSICIONES),
        activo: true,
      });
    }
    await db.insert(t.jugadores).values(filas);
  }

  console.log("→ 3 árbitros…");
  const arbitroIds: string[] = [];
  for (const [nombre, apellido] of ARBITROS) {
    const [row] = await db.insert(t.arbitros).values({
      ligaId: liga.id,
      nombre,
      apellido,
      fechaNacimiento: `${1978 + azar(20)}-0${1 + azar(9)}-1${azar(9)}`,
      sexo: nombre === "Patricia" ? "mujer" : "hombre",
      telefono: `81-${1000 + azar(9000)}-${1000 + azar(9000)}`,
      email: "",
      activo: true,
    }).returning({ id: t.arbitros.id });
    arbitroIds.push(row.id);
  }

  // Horarios: franjas de cámara reales comunes a sábado y domingo
  const franjas = (dia: string) => schedule.dias.find((d) => d.dia === dia)?.horarios ?? [];
  const horarios = franjas("sabado").filter((h) => franjas("domingo").includes(h)).slice(1, 5);
  if (horarios.length < 2) throw new Error("Sin franjas comunes sábado/domingo en el API");
  console.log(`→ Torneo con horarios de cámara: ${horarios.join(", ")}`);

  const config = {
    fechaInicio: "2026-07-04", // sábado: J6 cae el fin de semana pasado (video vigente)
    diasJuego: ["sabado", "domingo"],
    horarios,
    formato: "ida",
    duracionPartido: 50,
    descansoEntrePartidos: 10,
  };
  const [torneo] = await db.insert(t.torneos).values({
    ligaId: liga.id,
    nombre: "Apertura Soccer Stadium 2026",
    rama: "varonil",
    categoriaLibre: true,
    tipoFutbol: "futbol_7",
    formato: config.formato,
    fechaInicio: config.fechaInicio,
    diasJuego: config.diasJuego,
    horarios: config.horarios,
    duracionPartido: config.duracionPartido,
    descansoEntrePartidos: config.descansoEntrePartidos,
    costoInscripcion: "3000.00",
    costoArbitraje: "300.00",
    estado: "en_curso",
  }).returning();

  await db.insert(t.torneoEquipos).values(equipoIds.map((id) => ({ torneoId: torneo.id, equipoId: id })));
  await db.insert(t.torneoCanchas).values(canchaIds.map((id) => ({ torneoId: torneo.id, canchaId: id })));
  await db.insert(t.torneoArbitros).values(arbitroIds.map((id) => ({ torneoId: torneo.id, arbitroId: id })));

  console.log("→ Calendario round-robin (8 equipos)…");
  const partidos = generarCalendario({ equipoIds, canchaIds, arbitroIds, ...config });
  await db.insert(t.partidos).values(
    partidos.map((p) => ({ ...p, torneoId: torneo.id, estado: "programado" as const }))
  );
  const totalJornadas = Math.max(...partidos.map((p) => p.jornada));
  console.log(`  ${partidos.length} partidos en ${totalJornadas} jornadas`);

  // ── Simular jornadas jugadas (todas las de fecha pasada) ──
  const HOY = new Date().toISOString().slice(0, 10);
  const porJugar = await db.query.partidos.findMany({
    where: and(eq(t.partidos.torneoId, torneo.id), lte(t.partidos.fecha, HOY)),
    orderBy: (p, { asc }) => [asc(p.jornada), asc(p.fecha), asc(p.hora)],
  });
  console.log(`→ Simulando ${porJugar.length} partidos ya jugados (hasta ${HOY})…`);

  const jugadores = await db.query.jugadores.findMany({
    where: inArray(t.jugadores.equipoId, equipoIds),
    columns: { id: true, equipoId: true, posicion: true },
  });
  const plantilla = new Map<string, { id: string; posicion: string }[]>();
  for (const j of jugadores) {
    const arr = plantilla.get(j.equipoId) ?? [];
    arr.push({ id: j.id, posicion: j.posicion });
    plantilla.set(j.equipoId, arr);
  }

  const OBSERVACIONES = [null, null, null, "Sin incidencias.", "Retraso de 10 minutos por el partido anterior."];
  let ultimaJornada = 0;
  for (const p of porJugar) {
    const gl = golesEquipo();
    const gv = golesEquipo();
    const goles: { partidoId: string; jugadorId: string; equipoId: string; minuto: number }[] = [];
    for (const [equipoId, cuantos] of [[p.equipoLocalId, gl], [p.equipoVisitanteId, gv]] as const) {
      for (let i = 0; i < cuantos; i++) {
        goles.push({ partidoId: p.id, jugadorId: elegirAnotador(plantilla.get(equipoId)!), equipoId, minuto: 1 + azar(50) });
      }
    }
    const tarjetas: { partidoId: string; jugadorId: string; equipoId: string; tipo: "amarilla" | "roja"; minuto: number }[] = [];
    for (let i = 0; i < azar(4); i++) {
      const equipoId = Math.random() < 0.5 ? p.equipoLocalId : p.equipoVisitanteId;
      tarjetas.push({ partidoId: p.id, jugadorId: de(plantilla.get(equipoId)!).id, equipoId, tipo: "amarilla", minuto: 5 + azar(45) });
    }
    if (Math.random() < 0.08) {
      const equipoId = Math.random() < 0.5 ? p.equipoLocalId : p.equipoVisitanteId;
      tarjetas.push({ partidoId: p.id, jugadorId: de(plantilla.get(equipoId)!).id, equipoId, tipo: "roja", minuto: 20 + azar(30) });
    }
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
    ultimaJornada = Math.max(ultimaJornada, p.jornada);
  }
  console.log(`  jornadas jugadas: 1-${ultimaJornada}`);

  // ── Pagos ──
  console.log("→ Pagos…");
  for (const equipoId of equipoIds) {
    const pagado = Math.random() < 0.9;
    await db.insert(t.pagos).values({
      torneoId: torneo.id,
      equipoId,
      tipo: "inscripcion",
      monto: "3000.00",
      estado: pagado ? "pagado" : "pendiente",
      fecha: pagado ? "2026-07-01" : null,
    });
  }
  for (const p of porJugar) {
    for (const equipoId of [p.equipoLocalId, p.equipoVisitanteId]) {
      const pagado = p.jornada < ultimaJornada ? Math.random() < 0.95 : Math.random() < 0.6;
      await db.insert(t.pagos).values({
        torneoId: torneo.id,
        equipoId,
        partidoId: p.id,
        jornada: p.jornada,
        tipo: "arbitraje",
        monto: "150.00",
        estado: pagado ? "pagado" : "pendiente",
        fecha: pagado ? p.fecha : null,
      });
    }
  }

  console.log(`✓ Liga Soccer Stadium lista — pública en /${SLUG}, admin stadium/stadium1`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
