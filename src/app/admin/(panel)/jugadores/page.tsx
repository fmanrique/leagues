import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import JugadoresClient from "./JugadoresClient";

export const metadata: Metadata = { title: "Jugadores" };

export default async function JugadoresPage({ searchParams }: {
  searchParams: Promise<{ equipo?: string; pendientes?: string }>;
}) {
  const { equipo: equipoParam, pendientes: pendientesParam } = await searchParams;
  const { user, ligaId } = await requirePanelUser();
  if (user.rol === "arbitro") redirect("/admin");

  const soloEquipo = user.rol === "admin_equipo";
  if (soloEquipo && !user.equipoId) redirect("/admin");

  const jugadores = await db
    .select({
      id: t.jugadores.id,
      equipoId: t.jugadores.equipoId,
      nombre: t.jugadores.nombre,
      apellidoPaterno: t.jugadores.apellidoPaterno,
      apellidoMaterno: t.jugadores.apellidoMaterno,
      fechaNacimiento: t.jugadores.fechaNacimiento,
      estatura: t.jugadores.estatura,
      peso: t.jugadores.peso,
      sexo: t.jugadores.sexo,
      fotoUrl: t.jugadores.fotoUrl,
      fotoPendienteUrl: t.jugadores.fotoPendienteUrl,
      cambiosPendientes: t.jugadores.cambiosPendientes,
      numero: t.jugadores.numero,
      posicion: t.jugadores.posicion,
      activo: t.jugadores.activo,
      aprobado: t.jugadores.aprobado,
      equipoNombre: t.equipos.nombre,
      equipoColor: t.equipos.colorLocal,
    })
    .from(t.jugadores)
    .innerJoin(t.equipos, eq(t.jugadores.equipoId, t.equipos.id))
    .where(
      soloEquipo
        ? and(eq(t.equipos.ligaId, ligaId), eq(t.jugadores.equipoId, user.equipoId!))
        : eq(t.equipos.ligaId, ligaId)
    )
    .orderBy(t.equipos.nombre, t.jugadores.numero);

  const equipos = await db
    .select({ id: t.equipos.id, nombre: t.equipos.nombre })
    .from(t.equipos)
    .where(
      soloEquipo
        ? and(eq(t.equipos.ligaId, ligaId), eq(t.equipos.id, user.equipoId!))
        : eq(t.equipos.ligaId, ligaId)
    )
    .orderBy(t.equipos.nombre);

  const puedeAprobar = user.rol === "superadmin" || user.rol === "admin_liga";
  return (
    <JugadoresClient
      jugadores={jugadores}
      equipos={equipos}
      soloEquipo={soloEquipo}
      puedeAprobar={puedeAprobar}
      equipoInicial={equipos.some((e) => e.id === equipoParam) ? equipoParam! : ""}
      pendientesInicial={pendientesParam === "1"}
    />
  );
}
