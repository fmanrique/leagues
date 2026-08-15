/**
 * Datos dummy para Liga Casa Blanca: torneo de fútbol 7 con 24 equipos,
 * 8-15 jugadores por equipo, 6 árbitros, 4 canchas y calendario generado.
 * Uso: npx tsx --conditions react-server scripts/seed-casa-blanca.ts
 */
import { eq } from "drizzle-orm";
import { db, tables as t } from "../src/db";
import { generarCalendario } from "../src/lib/calendario";

const LIGA_SLUG = "casa-blanca";

const EQUIPOS = [
  ["Real Casa Blanca", "#7C3AED"], ["Atlético Roble", "#DC2626"], ["Cuervos Negros", "#111827"],
  ["Bravos del Norte", "#EA580C"], ["Deportivo Anáhuac", "#0EA5E9"], ["Guerreros FC", "#B91C1C"],
  ["Halcones Dorados", "#CA8A04"], ["Independiente CB", "#1D4ED8"], ["Jaguares Unidos", "#15803D"],
  ["La Máquina 7", "#0891B2"], ["Lobos Grises", "#4B5563"], ["Monarcas del Valle", "#9333EA"],
  ["Naranjeros FC", "#F97316"], ["Olímpico Azteca", "#166534"], ["Panteras Rosas", "#DB2777"],
  ["Potros Salvajes", "#78350F"], ["Rayos Verdes", "#65A30D"], ["Escorpiones Rojos", "#E11D48"],
  ["Titanes de Acero", "#334155"], ["Tornados FC", "#0D9488"], ["Venados Bravos", "#92400E"],
  ["Vikingos del Sur", "#1E40AF"], ["Zorros Plateados", "#71717A"], ["Águilas Reales", "#B45309"],
] as const;

const NOMBRES = ["Juan", "Carlos", "Luis", "Miguel", "José", "Jorge", "Fernando", "Ricardo", "Eduardo", "Roberto", "Alejandro", "Daniel", "Sergio", "Arturo", "Héctor", "Raúl", "Óscar", "Iván", "Diego", "Andrés", "Pablo", "Marco", "Emilio", "Gerardo", "Rodrigo", "Saúl", "Ramón", "Víctor", "Hugo", "Adrián"];
const APELLIDOS = ["García", "Martínez", "López", "Hernández", "González", "Rodríguez", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Ortiz", "Gutiérrez", "Chávez", "Ramos", "Mendoza", "Ruiz", "Álvarez", "Castillo", "Jiménez", "Vargas", "Rojas", "Salazar", "Ibarra"];
const POSICIONES = ["Portero", "Defensa", "Defensa", "Medio", "Medio", "Delantero"];

const ARBITROS = [
  ["Gustavo", "Ferreira Luna"], ["Marisol", "Cantú Ríos"], ["Ernesto", "Villalobos Peña"],
  ["Claudia", "Zamora Bravo"], ["Federico", "Anguiano Solís"], ["Lorena", "Puente Escamilla"],
];

const CANCHAS = [
  ["Cancha Casa Blanca 1", "Complejo Casa Blanca, Campo 1", "pasto_sintetico", true],
  ["Cancha Casa Blanca 2", "Complejo Casa Blanca, Campo 2", "pasto_sintetico", true],
  ["Cancha La Loma", "Av. de la Loma 240", "pasto_natural", false],
  ["Cancha El Fortín", "Calle Fortín 88", "pasto_sintetico", true],
] as const;

const azar = (n: number) => Math.floor(Math.random() * n);
const de = <T,>(arr: readonly T[]) => arr[azar(arr.length)];

async function main() {
  const liga = await db.query.ligas.findFirst({ where: (l, { eq }) => eq(l.slug, LIGA_SLUG) });
  if (!liga) throw new Error(`No existe la liga ${LIGA_SLUG}`);
  console.log(`Liga: ${liga.nombre} (${liga.id})`);

  console.log("→ 24 equipos…");
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
  }

  console.log("→ Jugadores (8-15 por equipo)…");
  let totalJugadores = 0;
  for (const equipoId of equipoIds) {
    const cuantos = 8 + azar(8); // 8..15
    const numeros = new Set<number>();
    const filas = [];
    for (let i = 0; i < cuantos; i++) {
      let num = 1 + azar(99);
      while (numeros.has(num)) num = 1 + azar(99);
      numeros.add(num);
      const anio = 1985 + azar(23); // 1985..2007
      filas.push({
        equipoId,
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
    totalJugadores += cuantos;
  }
  console.log(`  ${totalJugadores} jugadores creados`);

  console.log("→ 6 árbitros…");
  const arbitroIds: string[] = [];
  for (const [nombre, apellido] of ARBITROS) {
    const [row] = await db.insert(t.arbitros).values({
      ligaId: liga.id,
      nombre,
      apellido,
      fechaNacimiento: `${1975 + azar(25)}-0${1 + azar(9)}-1${azar(9)}`,
      sexo: ["Marisol", "Claudia", "Lorena"].includes(nombre) ? "mujer" : "hombre",
      telefono: `81-${1000 + azar(9000)}-${1000 + azar(9000)}`,
      email: "",
      activo: true,
    }).returning({ id: t.arbitros.id });
    arbitroIds.push(row.id);
  }

  console.log("→ 4 canchas…");
  const canchaIds: string[] = [];
  for (const [nombre, direccion, superficie, iluminacion] of CANCHAS) {
    const [row] = await db.insert(t.canchas).values({
      ligaId: liga.id,
      nombre,
      direccion,
      tipo: "futbol_7",
      superficie,
      iluminacion,
      activo: true,
    }).returning({ id: t.canchas.id });
    canchaIds.push(row.id);
  }

  console.log("→ Torneo fútbol 7…");
  const config = {
    fechaInicio: "2026-08-15", // sábado
    diasJuego: ["sabado", "domingo"],
    horarios: ["09:00", "10:30", "12:00"],
    formato: "ida",
    duracionPartido: 50,
    descansoEntrePartidos: 10,
  };
  const [torneo] = await db.insert(t.torneos).values({
    ligaId: liga.id,
    nombre: "Apertura Fútbol 7 Casa Blanca",
    rama: "varonil",
    categoriaLibre: true,
    tipoFutbol: "futbol_7",
    formato: config.formato,
    fechaInicio: config.fechaInicio,
    diasJuego: config.diasJuego,
    horarios: config.horarios,
    duracionPartido: config.duracionPartido,
    descansoEntrePartidos: config.descansoEntrePartidos,
    costoInscripcion: "3500.00",
    costoArbitraje: "250.00",
    estado: "en_curso",
  }).returning();

  await db.insert(t.torneoEquipos).values(equipoIds.map((id) => ({ torneoId: torneo.id, equipoId: id })));
  await db.insert(t.torneoCanchas).values(canchaIds.map((id) => ({ torneoId: torneo.id, canchaId: id })));
  await db.insert(t.torneoArbitros).values(arbitroIds.map((id) => ({ torneoId: torneo.id, arbitroId: id })));

  console.log("→ Generando calendario (round-robin, 24 equipos)…");
  const partidos = generarCalendario({
    equipoIds,
    canchaIds,
    arbitroIds,
    ...config,
  });
  await db.insert(t.partidos).values(
    partidos.map((p) => ({ ...p, torneoId: torneo.id, estado: "programado" as const }))
  );
  console.log(`  ${partidos.length} partidos en ${Math.max(...partidos.map((p) => p.jornada))} jornadas`);

  const sinArbitro = partidos.filter((p) => !p.arbitroId).length;
  console.log(`  partidos sin árbitro asignado: ${sinArbitro}`);
  console.log("✓ Liga Casa Blanca lista");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
