ALTER TABLE "torneo_equipos" ADD COLUMN "retirado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "torneo_equipos" ADD COLUMN "jornada_retiro" smallint;