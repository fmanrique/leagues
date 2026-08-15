CREATE TYPE "public"."estado_pago" AS ENUM('pendiente', 'pagado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_partido" AS ENUM('programado', 'en_curso', 'finalizado', 'suspendido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_reclamo" AS ENUM('pendiente', 'en_revision', 'resuelto', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."estado_torneo" AS ENUM('configuracion', 'inscripciones', 'en_curso', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."rama" AS ENUM('varonil', 'femenil', 'mixto');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('superadmin', 'admin_liga', 'admin_equipo', 'arbitro');--> statement-breakpoint
CREATE TYPE "public"."tipo_pago" AS ENUM('inscripcion', 'arbitraje', 'multa', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_tarjeta" AS ENUM('amarilla', 'roja');--> statement-breakpoint
CREATE TABLE "arbitros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text DEFAULT '' NOT NULL,
	"fecha_nacimiento" date,
	"sexo" varchar(16) DEFAULT '' NOT NULL,
	"telefono" varchar(32) DEFAULT '' NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"foto_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canchas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text DEFAULT '' NOT NULL,
	"tipo" varchar(32) DEFAULT '' NOT NULL,
	"superficie" varchar(32) DEFAULT '' NOT NULL,
	"iluminacion" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"logo_url" text,
	"color_local" varchar(9) DEFAULT '#10b981' NOT NULL,
	"color_visitante" varchar(9) DEFAULT '#ffffff' NOT NULL,
	"rama" "rama" DEFAULT 'varonil' NOT NULL,
	"categoria_anio_min" smallint,
	"categoria_anio_max" smallint,
	"categoria_libre" boolean DEFAULT true NOT NULL,
	"entrenador" text DEFAULT '' NOT NULL,
	"telefono" varchar(32) DEFAULT '' NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partido_id" uuid NOT NULL,
	"jugador_id" uuid NOT NULL,
	"equipo_id" uuid NOT NULL,
	"minuto" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jugadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipo_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"apellido_paterno" text DEFAULT '' NOT NULL,
	"apellido_materno" text DEFAULT '' NOT NULL,
	"fecha_nacimiento" date,
	"estatura" smallint,
	"peso" smallint,
	"sexo" varchar(16) DEFAULT '' NOT NULL,
	"foto_url" text,
	"numero" smallint DEFAULT 0 NOT NULL,
	"posicion" varchar(32) DEFAULT '' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ligas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text DEFAULT '' NOT NULL,
	"telefono" varchar(32) DEFAULT '' NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"logo_url" text,
	"color_primario" varchar(9) DEFAULT '#10b981' NOT NULL,
	"color_secundario" varchar(9) DEFAULT '#0f172a' NOT NULL,
	"color_acento" varchar(9) DEFAULT '#f59e0b' NOT NULL,
	"fondo_rol_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ligas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"equipo_id" uuid NOT NULL,
	"partido_id" uuid,
	"tipo" "tipo_pago" NOT NULL,
	"jornada" smallint,
	"monto" numeric(10, 2) NOT NULL,
	"estado" "estado_pago" DEFAULT 'pendiente' NOT NULL,
	"fecha" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"jornada" smallint NOT NULL,
	"ronda" varchar(32),
	"fecha" date NOT NULL,
	"hora" varchar(5) NOT NULL,
	"cancha_id" uuid,
	"arbitro_id" uuid,
	"equipo_local_id" uuid NOT NULL,
	"equipo_visitante_id" uuid NOT NULL,
	"goles_local" smallint,
	"goles_visitante" smallint,
	"estado" "estado_partido" DEFAULT 'programado' NOT NULL,
	"ficha_observaciones" text,
	"ficha_completada" boolean DEFAULT false NOT NULL,
	"ficha_fecha_captura" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reclamos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"torneo_id" uuid NOT NULL,
	"equipo_id" uuid NOT NULL,
	"partido_id" uuid,
	"tipo" varchar(32) NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_reclamo" DEFAULT 'pendiente' NOT NULL,
	"respuesta" text,
	"fecha_respuesta" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesiones_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "tarjetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partido_id" uuid NOT NULL,
	"jugador_id" uuid NOT NULL,
	"equipo_id" uuid NOT NULL,
	"tipo" "tipo_tarjeta" NOT NULL,
	"minuto" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "torneo_arbitros" (
	"torneo_id" uuid NOT NULL,
	"arbitro_id" uuid NOT NULL,
	CONSTRAINT "torneo_arbitros_torneo_id_arbitro_id_pk" PRIMARY KEY("torneo_id","arbitro_id")
);
--> statement-breakpoint
CREATE TABLE "torneo_canchas" (
	"torneo_id" uuid NOT NULL,
	"cancha_id" uuid NOT NULL,
	CONSTRAINT "torneo_canchas_torneo_id_cancha_id_pk" PRIMARY KEY("torneo_id","cancha_id")
);
--> statement-breakpoint
CREATE TABLE "torneo_equipos" (
	"torneo_id" uuid NOT NULL,
	"equipo_id" uuid NOT NULL,
	CONSTRAINT "torneo_equipos_torneo_id_equipo_id_pk" PRIMARY KEY("torneo_id","equipo_id")
);
--> statement-breakpoint
CREATE TABLE "torneos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"rama" "rama" DEFAULT 'varonil' NOT NULL,
	"categoria_anio_min" smallint,
	"categoria_anio_max" smallint,
	"categoria_libre" boolean DEFAULT true NOT NULL,
	"tipo_futbol" varchar(32) DEFAULT 'futbol_11' NOT NULL,
	"formato" varchar(32) DEFAULT 'ida' NOT NULL,
	"fecha_inicio" date NOT NULL,
	"dias_juego" text[] DEFAULT '{}' NOT NULL,
	"horarios" text[] DEFAULT '{}' NOT NULL,
	"duracion_partido" smallint DEFAULT 90 NOT NULL,
	"descanso_entre_partidos" smallint DEFAULT 30 NOT NULL,
	"costo_inscripcion" numeric(10, 2) DEFAULT '0' NOT NULL,
	"costo_arbitraje" numeric(10, 2) DEFAULT '0' NOT NULL,
	"estado" "estado_torneo" DEFAULT 'configuracion' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" text NOT NULL,
	"rol" "rol_usuario" NOT NULL,
	"equipo_id" uuid,
	"arbitro_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "arbitros" ADD CONSTRAINT "arbitros_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canchas" ADD CONSTRAINT "canchas_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goles" ADD CONSTRAINT "goles_partido_id_partidos_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goles" ADD CONSTRAINT "goles_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goles" ADD CONSTRAINT "goles_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_partido_id_partidos_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_cancha_id_canchas_id_fk" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_arbitro_id_arbitros_id_fk" FOREIGN KEY ("arbitro_id") REFERENCES "public"."arbitros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_equipo_local_id_equipos_id_fk" FOREIGN KEY ("equipo_local_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_equipo_visitante_id_equipos_id_fk" FOREIGN KEY ("equipo_visitante_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reclamos" ADD CONSTRAINT "reclamos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reclamos" ADD CONSTRAINT "reclamos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reclamos" ADD CONSTRAINT "reclamos_partido_id_partidos_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_partido_id_partidos_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_arbitros" ADD CONSTRAINT "torneo_arbitros_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_arbitros" ADD CONSTRAINT "torneo_arbitros_arbitro_id_arbitros_id_fk" FOREIGN KEY ("arbitro_id") REFERENCES "public"."arbitros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_canchas" ADD CONSTRAINT "torneo_canchas_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_canchas" ADD CONSTRAINT "torneo_canchas_cancha_id_canchas_id_fk" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_equipos" ADD CONSTRAINT "torneo_equipos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneo_equipos" ADD CONSTRAINT "torneo_equipos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_arbitro_id_arbitros_id_fk" FOREIGN KEY ("arbitro_id") REFERENCES "public"."arbitros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arbitros_liga_idx" ON "arbitros" USING btree ("liga_id");--> statement-breakpoint
CREATE INDEX "canchas_liga_idx" ON "canchas" USING btree ("liga_id");--> statement-breakpoint
CREATE INDEX "equipos_liga_idx" ON "equipos" USING btree ("liga_id");--> statement-breakpoint
CREATE UNIQUE INDEX "equipos_liga_nombre_idx" ON "equipos" USING btree ("liga_id","nombre");--> statement-breakpoint
CREATE INDEX "goles_partido_idx" ON "goles" USING btree ("partido_id");--> statement-breakpoint
CREATE INDEX "goles_jugador_idx" ON "goles" USING btree ("jugador_id");--> statement-breakpoint
CREATE INDEX "jugadores_equipo_idx" ON "jugadores" USING btree ("equipo_id");--> statement-breakpoint
CREATE INDEX "pagos_torneo_idx" ON "pagos" USING btree ("torneo_id");--> statement-breakpoint
CREATE INDEX "pagos_equipo_idx" ON "pagos" USING btree ("equipo_id");--> statement-breakpoint
CREATE INDEX "partidos_torneo_idx" ON "partidos" USING btree ("torneo_id");--> statement-breakpoint
CREATE INDEX "partidos_torneo_jornada_idx" ON "partidos" USING btree ("torneo_id","jornada");--> statement-breakpoint
CREATE INDEX "partidos_fecha_idx" ON "partidos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "reclamos_torneo_idx" ON "reclamos" USING btree ("torneo_id");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_idx" ON "sesiones" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "tarjetas_partido_idx" ON "tarjetas" USING btree ("partido_id");--> statement-breakpoint
CREATE INDEX "tarjetas_jugador_idx" ON "tarjetas" USING btree ("jugador_id");--> statement-breakpoint
CREATE INDEX "torneos_liga_idx" ON "torneos" USING btree ("liga_id");--> statement-breakpoint
CREATE INDEX "usuarios_liga_idx" ON "usuarios" USING btree ("liga_id");