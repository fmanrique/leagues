/**
 * Seed: migra los datos del demo (working/demo/data/db.json) a Postgres.
 * Uso: npm run db:seed  (borra y recarga todo)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "@node-rs/argon2";
import { db, tables as t } from "../src/db";

// Guard: este script BORRA todas las tablas. Contra una base remota (Supabase)
// exige confirmación explícita para evitar arrasar producción por accidente.
const url = process.env.DATABASE_URL ?? "";
const esLocal = url.includes("localhost") || url.includes("127.0.0.1");
if (!esLocal && process.env.SEED_FORCE !== "1") {
  console.error(
    "⚠ DATABASE_URL apunta a una base remota. El seed BORRA TODO su contenido.\n" +
    "  Si de verdad quieres reseedearla, corre:  SEED_FORCE=1 npm run db:seed"
  );
  process.exit(1);
}

const raw = JSON.parse(
  readFileSync(join(process.cwd(), "..", "working", "demo", "data", "db.json"), "utf-8")
);

// Passwords de desarrollo. CAMBIAR EN PRODUCCIÓN (npm run set-password).
const DEV_PASSWORDS: Record<string, string> = {
  desport: "desport1", // 8+ caracteres, igual que exige el cambio por UI
  admin: "admin",
  equipo1: "equipo1",
  arbitro1: "arbitro1",
};

async function main() {
  console.log("→ Limpiando tablas…");
  await db.delete(t.sesiones);
  await db.delete(t.usuarios);
  await db.delete(t.ligas); // cascada borra el resto

  console.log("→ Liga…");
  const [liga] = await db.insert(t.ligas).values({
    slug: "liga-mty",
    nombre: raw.liga.nombre,
    direccion: raw.liga.direccion,
    telefono: raw.liga.telefono,
    email: raw.liga.email,
  }).returning();

  console.log("→ Equipos…");
  const eqMap = new Map<string, string>();
  for (const e of raw.equipos) {
    const [row] = await db.insert(t.equipos).values({
      ligaId: liga.id,
      nombre: e.nombre,
      logoUrl: e.logo,
      colorLocal: e.colorLocal,
      colorVisitante: e.colorVisitante,
      rama: e.rama,
      categoriaAnioMin: e.categoriaLibre ? null : e.categoriaAnioMin,
      categoriaAnioMax: e.categoriaLibre ? null : e.categoriaAnioMax,
      categoriaLibre: e.categoriaLibre,
      entrenador: e.entrenador,
      telefono: e.telefono,
      email: e.email,
      activo: e.activo,
    }).returning();
    eqMap.set(e.id, row.id);
  }

  console.log("→ Jugadores…");
  const jugMap = new Map<string, string>();
  for (const j of raw.jugadores) {
    const [row] = await db.insert(t.jugadores).values({
      equipoId: eqMap.get(j.equipoId)!,
      nombre: j.nombre,
      apellidoPaterno: j.apellidoPaterno,
      apellidoMaterno: j.apellidoMaterno,
      fechaNacimiento: j.fechaNacimiento || null,
      estatura: j.estatura ? Math.round(j.estatura * 100) : null, // m → cm
      peso: j.peso ?? null,
      sexo: j.sexo,
      fotoUrl: j.foto,
      numero: j.numero,
      posicion: j.posicion,
      activo: j.activo,
    }).returning();
    jugMap.set(j.id, row.id);
  }

  console.log("→ Árbitros…");
  const arbMap = new Map<string, string>();
  for (const a of raw.arbitros) {
    const [row] = await db.insert(t.arbitros).values({
      ligaId: liga.id,
      nombre: a.nombre,
      apellido: a.apellido,
      fechaNacimiento: a.fechaNacimiento || null,
      sexo: a.sexo,
      telefono: a.telefono,
      email: a.email,
      fotoUrl: a.foto,
      activo: a.activo,
    }).returning();
    arbMap.set(a.id, row.id);
  }

  console.log("→ Canchas…");
  const canMap = new Map<string, string>();
  for (const c of raw.canchas) {
    const [row] = await db.insert(t.canchas).values({
      ligaId: liga.id,
      nombre: c.nombre,
      direccion: c.direccion,
      tipo: c.tipo,
      superficie: c.superficie,
      iluminacion: c.iluminacion,
      activo: c.activo,
    }).returning();
    canMap.set(c.id, row.id);
  }

  console.log("→ Torneos…");
  const torMap = new Map<string, string>();
  for (const tor of raw.torneos) {
    const [row] = await db.insert(t.torneos).values({
      ligaId: liga.id,
      nombre: tor.nombre,
      rama: tor.rama,
      categoriaAnioMin: tor.categoriaLibre ? null : tor.categoriaAnioMin,
      categoriaAnioMax: tor.categoriaLibre ? null : tor.categoriaAnioMax,
      categoriaLibre: tor.categoriaLibre,
      tipoFutbol: tor.tipoFutbol,
      formato: tor.formato,
      fechaInicio: tor.fechaInicio,
      diasJuego: tor.diasJuego,
      horarios: tor.horarios,
      duracionPartido: tor.duracionPartido,
      descansoEntrePartidos: tor.descansoEntrePartidos,
      costoInscripcion: String(tor.costoInscripcion),
      costoArbitraje: String(tor.costoArbitraje),
      estado: tor.estado,
    }).returning();
    torMap.set(tor.id, row.id);
    if (tor.equipos.length) {
      await db.insert(t.torneoEquipos).values(
        tor.equipos.map((id: string) => ({ torneoId: row.id, equipoId: eqMap.get(id)! }))
      );
    }
    if (tor.canchas.length) {
      await db.insert(t.torneoCanchas).values(
        tor.canchas.map((id: string) => ({ torneoId: row.id, canchaId: canMap.get(id)! }))
      );
    }
    if (tor.arbitros.length) {
      await db.insert(t.torneoArbitros).values(
        tor.arbitros.map((id: string) => ({ torneoId: row.id, arbitroId: arbMap.get(id)! }))
      );
    }
  }

  console.log("→ Partidos, goles y tarjetas…");
  const parMap = new Map<string, string>();
  for (const p of raw.partidos) {
    const [row] = await db.insert(t.partidos).values({
      torneoId: torMap.get(p.torneoId)!,
      jornada: p.jornada,
      ronda: p.ronda,
      fecha: p.fecha,
      hora: p.hora,
      canchaId: canMap.get(p.canchaId) ?? null,
      arbitroId: arbMap.get(p.arbitroId) ?? null,
      equipoLocalId: eqMap.get(p.equipoLocalId)!,
      equipoVisitanteId: eqMap.get(p.equipoVisitanteId)!,
      golesLocal: p.golesLocal,
      golesVisitante: p.golesVisitante,
      estado: p.estado,
      fichaObservaciones: p.fichaArbitral?.observaciones ?? null,
      fichaCompletada: p.fichaArbitral?.completada ?? false,
      fichaFechaCaptura: p.fichaArbitral?.fechaCaptura ? new Date(p.fichaArbitral.fechaCaptura) : null,
    }).returning();
    parMap.set(p.id, row.id);
    if (p.fichaArbitral?.goles?.length) {
      await db.insert(t.goles).values(
        p.fichaArbitral.goles.map((g: { jugadorId: string; equipoId: string; minuto: number }) => ({
          partidoId: row.id,
          jugadorId: jugMap.get(g.jugadorId)!,
          equipoId: eqMap.get(g.equipoId)!,
          minuto: g.minuto,
        }))
      );
    }
    if (p.fichaArbitral?.tarjetas?.length) {
      await db.insert(t.tarjetas).values(
        p.fichaArbitral.tarjetas.map((c: { jugadorId: string; equipoId: string; tipo: "amarilla" | "roja"; minuto: number }) => ({
          partidoId: row.id,
          jugadorId: jugMap.get(c.jugadorId)!,
          equipoId: eqMap.get(c.equipoId)!,
          tipo: c.tipo,
          minuto: c.minuto,
        }))
      );
    }
  }

  console.log("→ Pagos…");
  for (const pg of raw.pagos) {
    await db.insert(t.pagos).values({
      torneoId: torMap.get(pg.torneoId)!,
      equipoId: eqMap.get(pg.equipoId)!,
      partidoId: pg.partidoId ? parMap.get(pg.partidoId) ?? null : null,
      tipo: pg.tipo,
      jornada: pg.jornada,
      monto: String(pg.monto),
      estado: pg.estado,
      fecha: pg.fecha,
    });
  }

  console.log("→ Reclamos…");
  for (const r of raw.reclamos) {
    await db.insert(t.reclamos).values({
      torneoId: torMap.get(r.torneoId)!,
      equipoId: eqMap.get(r.equipoId)!,
      partidoId: r.partidoId ? parMap.get(r.partidoId) ?? null : null,
      tipo: r.tipo,
      descripcion: r.descripcion,
      estado: r.estado,
      respuesta: r.respuesta,
      fechaRespuesta: r.fechaRespuesta ? new Date(r.fechaRespuesta) : null,
      createdAt: r.fechaCreacion ? new Date(r.fechaCreacion) : new Date(),
    });
  }

  console.log("→ Usuarios…");
  await db.insert(t.usuarios).values({
    ligaId: null,
    username: "desport",
    passwordHash: await hash(DEV_PASSWORDS.desport),
    nombre: "DE/SPORTS Admin",
    rol: "superadmin",
  });
  for (const u of raw.usuarios) {
    await db.insert(t.usuarios).values({
      ligaId: liga.id,
      username: u.username,
      passwordHash: await hash(DEV_PASSWORDS[u.username] ?? u.username),
      nombre: u.nombre,
      rol: u.rol,
      equipoId: u.equipoId ? eqMap.get(u.equipoId) ?? null : null,
      arbitroId: u.arbitroId ? arbMap.get(u.arbitroId) ?? null : null,
    });
  }

  console.log("✓ Seed completo");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
