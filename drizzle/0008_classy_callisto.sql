ALTER TYPE "public"."tipo_pago" ADD VALUE 'horario_fijo' BEFORE 'otro';--> statement-breakpoint
ALTER TABLE "equipos" ADD COLUMN "horario_fijo" varchar(5);--> statement-breakpoint
ALTER TABLE "equipos" ADD COLUMN "horario_fijo_monto" numeric(10, 2);