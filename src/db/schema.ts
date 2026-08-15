import {
  pgTable, pgEnum, uuid, text, varchar, integer, numeric, boolean,
  date, timestamp, smallint, primaryKey, uniqueIndex, index, jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────────

export const rolUsuario = pgEnum("rol_usuario", [
  "superadmin", "admin_liga", "admin_equipo", "arbitro",
]);
export const rama = pgEnum("rama", ["varonil", "femenil", "mixto"]);
export const estadoTorneo = pgEnum("estado_torneo", [
  "configuracion", "inscripciones", "en_curso", "finalizado", "cancelado",
]);
export const estadoPartido = pgEnum("estado_partido", [
  "programado", "en_curso", "finalizado", "suspendido", "cancelado",
]);
export const tipoTarjeta = pgEnum("tipo_tarjeta", ["amarilla", "roja"]);
export const tipoPago = pgEnum("tipo_pago", ["inscripcion", "arbitraje", "multa", "horario_fijo", "otro"]);
export const estadoPago = pgEnum("estado_pago", ["pendiente", "pagado", "cancelado"]);
export const estadoReclamo = pgEnum("estado_reclamo", ["pendiente", "en_revision", "resuelto", "rechazado"]);

// ── Ligas (tenant) ───────────────────────────────────────────────────────────

export const ligas = pgTable("ligas", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull().default(""),
  telefono: varchar("telefono", { length: 32 }).notNull().default(""),
  email: varchar("email", { length: 160 }).notNull().default(""),
  // Branding por liga (para página pública e imagen de rol de juegos)
  logoUrl: text("logo_url"),
  colorPrimario: varchar("color_primario", { length: 9 }).notNull().default("#10b981"),
  colorSecundario: varchar("color_secundario", { length: 9 }).notNull().default("#0f172a"),
  colorAcento: varchar("color_acento", { length: 9 }).notNull().default("#f59e0b"),
  fondoRolUrl: text("fondo_rol_url"),
  // Fondo 1200×630 para las vistas previas al compartir links (OG image)
  fondoOgUrl: text("fondo_og_url"),
  // ID de la liga en la plataforma de videos DE/SPORTS (admin.de-sports.com.mx):
  // habilita importar horarios de cámaras al crear torneos y el link al video de cada partido
  desportsLigaId: varchar("desports_liga_id", { length: 64 }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Usuarios y sesiones ──────────────────────────────────────────────────────

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  // null → superadmin DeSport (acceso a todas las ligas)
  ligaId: uuid("liga_id").references(() => ligas.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nombre: text("nombre").notNull(),
  fotoUrl: text("foto_url"),
  rol: rolUsuario("rol").notNull(),
  equipoId: uuid("equipo_id").references(() => equipos.id, { onDelete: "set null" }),
  arbitroId: uuid("arbitro_id").references(() => arbitros.id, { onDelete: "set null" }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("usuarios_liga_idx").on(t.ligaId)]);

export const sesiones = pgTable("sesiones", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sesiones_usuario_idx").on(t.usuarioId)]);

// ── Catálogos por liga ───────────────────────────────────────────────────────

export const equipos = pgTable("equipos", {
  id: uuid("id").primaryKey().defaultRandom(),
  ligaId: uuid("liga_id").notNull().references(() => ligas.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  logoUrl: text("logo_url"),
  colorLocal: varchar("color_local", { length: 9 }).notNull().default("#10b981"),
  colorVisitante: varchar("color_visitante", { length: 9 }).notNull().default("#ffffff"),
  rama: rama("rama").notNull().default("varonil"),
  categoriaAnioMin: smallint("categoria_anio_min"),
  categoriaAnioMax: smallint("categoria_anio_max"),
  categoriaLibre: boolean("categoria_libre").notNull().default(true),
  entrenador: text("entrenador").notNull().default(""),
  telefono: varchar("telefono", { length: 32 }).notNull().default(""),
  email: varchar("email", { length: 160 }).notNull().default(""),
  // Horario fijo pagado: el equipo siempre juega a esta hora (HH:MM); el rol
  // le da prioridad de turno. El monto genera un pago al inscribirlo a torneo
  horarioFijo: varchar("horario_fijo", { length: 5 }),
  horarioFijoMonto: numeric("horario_fijo_monto", { precision: 10, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("equipos_liga_idx").on(t.ligaId),
  uniqueIndex("equipos_liga_nombre_idx").on(t.ligaId, t.nombre),
]);

export const jugadores = pgTable("jugadores", {
  id: uuid("id").primaryKey().defaultRandom(),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  apellidoPaterno: text("apellido_paterno").notNull().default(""),
  apellidoMaterno: text("apellido_materno").notNull().default(""),
  fechaNacimiento: date("fecha_nacimiento"),
  estatura: smallint("estatura"), // cm
  peso: smallint("peso"), // kg
  sexo: varchar("sexo", { length: 16 }).notNull().default(""),
  fotoUrl: text("foto_url"),
  // Foto subida por el admin de equipo: queda aquí hasta que la liga la apruebe
  fotoPendienteUrl: text("foto_pendiente_url"),
  // Cambios de datos propuestos por el admin de equipo (subset de campos del
  // jugador): quedan aquí hasta que la liga los apruebe o rechace
  cambiosPendientes: jsonb("cambios_pendientes").$type<Record<string, string | number | null>>(),
  numero: smallint("numero").notNull().default(0),
  posicion: varchar("posicion", { length: 32 }).notNull().default(""),
  activo: boolean("activo").notNull().default(true),
  // Alta hecha por admin de equipo queda pendiente hasta que el admin de la liga apruebe
  aprobado: boolean("aprobado").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("jugadores_equipo_idx").on(t.equipoId)]);

export const arbitros = pgTable("arbitros", {
  id: uuid("id").primaryKey().defaultRandom(),
  ligaId: uuid("liga_id").notNull().references(() => ligas.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull().default(""),
  fechaNacimiento: date("fecha_nacimiento"),
  sexo: varchar("sexo", { length: 16 }).notNull().default(""),
  telefono: varchar("telefono", { length: 32 }).notNull().default(""),
  email: varchar("email", { length: 160 }).notNull().default(""),
  fotoUrl: text("foto_url"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("arbitros_liga_idx").on(t.ligaId)]);

export const canchas = pgTable("canchas", {
  id: uuid("id").primaryKey().defaultRandom(),
  ligaId: uuid("liga_id").notNull().references(() => ligas.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull().default(""),
  tipo: varchar("tipo", { length: 32 }).notNull().default(""), // futbol_11, futbol_7, etc.
  superficie: varchar("superficie", { length: 32 }).notNull().default(""),
  // Nombre de esta cancha en la plataforma de videos DE/SPORTS (para empatar horarios y videos)
  desportsCourt: text("desports_court"),
  iluminacion: boolean("iluminacion").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("canchas_liga_idx").on(t.ligaId)]);

// ── Torneos ──────────────────────────────────────────────────────────────────

export const torneos = pgTable("torneos", {
  id: uuid("id").primaryKey().defaultRandom(),
  ligaId: uuid("liga_id").notNull().references(() => ligas.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  rama: rama("rama").notNull().default("varonil"),
  categoriaAnioMin: smallint("categoria_anio_min"),
  categoriaAnioMax: smallint("categoria_anio_max"),
  categoriaLibre: boolean("categoria_libre").notNull().default(true),
  tipoFutbol: varchar("tipo_futbol", { length: 32 }).notNull().default("futbol_11"),
  formato: varchar("formato", { length: 32 }).notNull().default("ida"), // ida | ida_vuelta (legado)
  // Fechas garantizadas: partidos que jugará cada equipo. Null → el natural del
  // formato (n−1 o 2(n−1)). Si excede el natural se repiten cruces, balanceados
  partidosPorEquipo: smallint("partidos_por_equipo"),
  fechaInicio: date("fecha_inicio").notNull(),
  diasJuego: text("dias_juego").array().notNull().default([]),
  // Legado: lista plana de horarios para todos los días (torneos viejos)
  horarios: text("horarios").array().notNull().default([]),
  // Slots del torneo por día y cancha ({ sabado: { canchaId: ["09:00"] } }):
  // cada cancha de cada día tiene sus propios horarios, y dos torneos no
  // pueden ocupar el mismo (día, cancha, hora). Null → lista plana legada
  horariosPorCancha: jsonb("horarios_por_cancha").$type<Record<string, Record<string, string[]>>>(),
  duracionPartido: smallint("duracion_partido").notNull().default(90), // minutos
  descansoEntrePartidos: smallint("descanso_entre_partidos").notNull().default(30),
  costoInscripcion: numeric("costo_inscripcion", { precision: 10, scale: 2 }).notNull().default("0"),
  costoArbitraje: numeric("costo_arbitraje", { precision: 10, scale: 2 }).notNull().default("0"),
  estado: estadoTorneo("estado").notNull().default("configuracion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("torneos_liga_idx").on(t.ligaId)]);

export const torneoEquipos = pgTable("torneo_equipos", {
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  // Baja del torneo (no de la liga): conserva su historial jugado; sus partidos
  // programados quedan "pendientes de asignar" hasta regenerar o sustituir
  retirado: boolean("retirado").notNull().default(false),
  jornadaRetiro: smallint("jornada_retiro"),
}, (t) => [primaryKey({ columns: [t.torneoId, t.equipoId] })]);

export const torneoCanchas = pgTable("torneo_canchas", {
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  canchaId: uuid("cancha_id").notNull().references(() => canchas.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.torneoId, t.canchaId] })]);

export const torneoArbitros = pgTable("torneo_arbitros", {
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  arbitroId: uuid("arbitro_id").notNull().references(() => arbitros.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.torneoId, t.arbitroId] })]);

// ── Partidos y ficha arbitral ────────────────────────────────────────────────

export const partidos = pgTable("partidos", {
  id: uuid("id").primaryKey().defaultRandom(),
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  jornada: smallint("jornada").notNull(),
  ronda: varchar("ronda", { length: 32 }), // null en fase regular; "semifinal", "final", etc.
  fecha: date("fecha").notNull(),
  hora: varchar("hora", { length: 5 }).notNull(), // HH:MM
  canchaId: uuid("cancha_id").references(() => canchas.id, { onDelete: "set null" }),
  arbitroId: uuid("arbitro_id").references(() => arbitros.id, { onDelete: "set null" }),
  equipoLocalId: uuid("equipo_local_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  equipoVisitanteId: uuid("equipo_visitante_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  golesLocal: smallint("goles_local"),
  golesVisitante: smallint("goles_visitante"),
  estado: estadoPartido("estado").notNull().default("programado"),
  // URL manual del video: si es null, el público la resuelve automáticamente
  // con el horario de cámaras de DE/SPORTS (día+cancha+hora)
  videoUrl: text("video_url"),
  // Ficha arbitral (goles y tarjetas viven en sus propias tablas)
  fichaObservaciones: text("ficha_observaciones"),
  fichaCompletada: boolean("ficha_completada").notNull().default(false),
  fichaFechaCaptura: timestamp("ficha_fecha_captura", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("partidos_torneo_idx").on(t.torneoId),
  index("partidos_torneo_jornada_idx").on(t.torneoId, t.jornada),
  index("partidos_fecha_idx").on(t.fecha),
]);

export const goles = pgTable("goles", {
  id: uuid("id").primaryKey().defaultRandom(),
  partidoId: uuid("partido_id").notNull().references(() => partidos.id, { onDelete: "cascade" }),
  jugadorId: uuid("jugador_id").notNull().references(() => jugadores.id, { onDelete: "cascade" }),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  minuto: smallint("minuto").notNull(),
}, (t) => [
  index("goles_partido_idx").on(t.partidoId),
  index("goles_jugador_idx").on(t.jugadorId),
]);

export const tarjetas = pgTable("tarjetas", {
  id: uuid("id").primaryKey().defaultRandom(),
  partidoId: uuid("partido_id").notNull().references(() => partidos.id, { onDelete: "cascade" }),
  jugadorId: uuid("jugador_id").notNull().references(() => jugadores.id, { onDelete: "cascade" }),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  tipo: tipoTarjeta("tipo").notNull(),
  minuto: smallint("minuto").notNull(),
}, (t) => [
  index("tarjetas_partido_idx").on(t.partidoId),
  index("tarjetas_jugador_idx").on(t.jugadorId),
]);

// ── Pagos y reclamos ─────────────────────────────────────────────────────────

export const pagos = pgTable("pagos", {
  id: uuid("id").primaryKey().defaultRandom(),
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  partidoId: uuid("partido_id").references(() => partidos.id, { onDelete: "set null" }),
  tipo: tipoPago("tipo").notNull(),
  jornada: smallint("jornada"),
  monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
  estado: estadoPago("estado").notNull().default("pendiente"),
  fecha: date("fecha"), // fecha de pago efectivo
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pagos_torneo_idx").on(t.torneoId),
  index("pagos_equipo_idx").on(t.equipoId),
]);

export const reclamos = pgTable("reclamos", {
  id: uuid("id").primaryKey().defaultRandom(),
  torneoId: uuid("torneo_id").notNull().references(() => torneos.id, { onDelete: "cascade" }),
  equipoId: uuid("equipo_id").notNull().references(() => equipos.id, { onDelete: "cascade" }),
  partidoId: uuid("partido_id").references(() => partidos.id, { onDelete: "set null" }),
  tipo: varchar("tipo", { length: 32 }).notNull(),
  descripcion: text("descripcion").notNull(),
  estado: estadoReclamo("estado").notNull().default("pendiente"),
  respuesta: text("respuesta"),
  fechaRespuesta: timestamp("fecha_respuesta", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("reclamos_torneo_idx").on(t.torneoId)]);

// ── Notificaciones ───────────────────────────────────────────────────────────

/**
 * Avisos internos del panel: alta/foto de jugador por aprobar, reclamos nuevos,
 * respuestas de la liga, etc. `paraEquipoId` null → dirigida a los admins de la
 * liga; con valor → dirigida al admin de ese equipo.
 */
export const notificaciones = pgTable("notificaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  ligaId: uuid("liga_id").notNull().references(() => ligas.id, { onDelete: "cascade" }),
  paraEquipoId: uuid("para_equipo_id").references(() => equipos.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 40 }).notNull(), // jugador_pendiente | foto_pendiente | jugador_aprobado | jugador_rechazado | reclamo_nuevo | reclamo_respuesta
  titulo: text("titulo").notNull(),
  detalle: text("detalle").notNull().default(""),
  url: text("url").notNull(), // destino al hacer clic (p. ej. /admin/jugadores?equipo=X)
  leida: boolean("leida").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notificaciones_liga_idx").on(t.ligaId),
  index("notificaciones_equipo_idx").on(t.paraEquipoId),
]);

// ── Relations (para consultas con `with`) ────────────────────────────────────

export const ligasRelations = relations(ligas, ({ many }) => ({
  equipos: many(equipos),
  arbitros: many(arbitros),
  canchas: many(canchas),
  torneos: many(torneos),
  usuarios: many(usuarios),
}));

export const sesionesRelations = relations(sesiones, ({ one }) => ({
  usuario: one(usuarios, { fields: [sesiones.usuarioId], references: [usuarios.id] }),
}));

export const usuariosRelations = relations(usuarios, ({ one }) => ({
  liga: one(ligas, { fields: [usuarios.ligaId], references: [ligas.id] }),
  equipo: one(equipos, { fields: [usuarios.equipoId], references: [equipos.id] }),
  arbitro: one(arbitros, { fields: [usuarios.arbitroId], references: [arbitros.id] }),
}));

export const equiposRelations = relations(equipos, ({ one, many }) => ({
  liga: one(ligas, { fields: [equipos.ligaId], references: [ligas.id] }),
  jugadores: many(jugadores),
}));

export const jugadoresRelations = relations(jugadores, ({ one }) => ({
  equipo: one(equipos, { fields: [jugadores.equipoId], references: [equipos.id] }),
}));

export const torneosRelations = relations(torneos, ({ one, many }) => ({
  liga: one(ligas, { fields: [torneos.ligaId], references: [ligas.id] }),
  equipos: many(torneoEquipos),
  canchas: many(torneoCanchas),
  arbitros: many(torneoArbitros),
  partidos: many(partidos),
}));

export const torneoEquiposRelations = relations(torneoEquipos, ({ one }) => ({
  torneo: one(torneos, { fields: [torneoEquipos.torneoId], references: [torneos.id] }),
  equipo: one(equipos, { fields: [torneoEquipos.equipoId], references: [equipos.id] }),
}));

export const torneoCanchasRelations = relations(torneoCanchas, ({ one }) => ({
  torneo: one(torneos, { fields: [torneoCanchas.torneoId], references: [torneos.id] }),
  cancha: one(canchas, { fields: [torneoCanchas.canchaId], references: [canchas.id] }),
}));

export const torneoArbitrosRelations = relations(torneoArbitros, ({ one }) => ({
  torneo: one(torneos, { fields: [torneoArbitros.torneoId], references: [torneos.id] }),
  arbitro: one(arbitros, { fields: [torneoArbitros.arbitroId], references: [arbitros.id] }),
}));

export const partidosRelations = relations(partidos, ({ one, many }) => ({
  torneo: one(torneos, { fields: [partidos.torneoId], references: [torneos.id] }),
  cancha: one(canchas, { fields: [partidos.canchaId], references: [canchas.id] }),
  arbitro: one(arbitros, { fields: [partidos.arbitroId], references: [arbitros.id] }),
  equipoLocal: one(equipos, { fields: [partidos.equipoLocalId], references: [equipos.id] }),
  equipoVisitante: one(equipos, { fields: [partidos.equipoVisitanteId], references: [equipos.id] }),
  goles: many(goles),
  tarjetas: many(tarjetas),
}));

export const golesRelations = relations(goles, ({ one }) => ({
  partido: one(partidos, { fields: [goles.partidoId], references: [partidos.id] }),
  jugador: one(jugadores, { fields: [goles.jugadorId], references: [jugadores.id] }),
}));

export const tarjetasRelations = relations(tarjetas, ({ one }) => ({
  partido: one(partidos, { fields: [tarjetas.partidoId], references: [partidos.id] }),
  jugador: one(jugadores, { fields: [tarjetas.jugadorId], references: [jugadores.id] }),
}));
