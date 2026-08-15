CREATE TABLE "notificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liga_id" uuid NOT NULL,
	"para_equipo_id" uuid,
	"tipo" varchar(40) NOT NULL,
	"titulo" text NOT NULL,
	"detalle" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"leida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "foto_pendiente_url" text;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_liga_id_ligas_id_fk" FOREIGN KEY ("liga_id") REFERENCES "public"."ligas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_para_equipo_id_equipos_id_fk" FOREIGN KEY ("para_equipo_id") REFERENCES "public"."equipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificaciones_liga_idx" ON "notificaciones" USING btree ("liga_id");--> statement-breakpoint
CREATE INDEX "notificaciones_equipo_idx" ON "notificaciones" USING btree ("para_equipo_id");