-- Seguridad: RLS en todas las tablas públicas. La app se conecta como dueño
-- de las tablas (rol postgres), que no está sujeto a RLS, así que no cambia
-- nada para el sistema; lo que bloquea es la Data API automática de Supabase
-- (PostgREST con la llave anon), que de otro modo expondría todo el esquema.
ALTER TABLE "arbitros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canchas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "equipos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "goles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jugadores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ligas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notificaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pagos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partidos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reclamos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sesiones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tarjetas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "torneo_arbitros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "torneo_canchas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "torneo_equipos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "torneos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
