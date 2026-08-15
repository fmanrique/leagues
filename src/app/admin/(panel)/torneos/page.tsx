import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requirePanelUser } from "@/lib/authz";
import { fetchScheduleDesports } from "@/lib/desports";
import { slotsOcupados } from "@/lib/torneo-slots";
import TorneosClient from "./TorneosClient";

export const metadata: Metadata = { title: "Torneos" };

export default async function TorneosPage() {
  const { user, ligaId } = await requirePanelUser();

  const [torneos, equipos, canchas, arbitros] = await Promise.all([
    db.query.torneos.findMany({
      where: (tr, { eq }) => eq(tr.ligaId, ligaId),
      orderBy: (tr, { desc }) => desc(tr.fechaInicio),
      with: { equipos: true, canchas: true, arbitros: true },
    }),
    db.query.equipos.findMany({
      where: (e, { and, eq }) => and(eq(e.ligaId, ligaId), eq(e.activo, true)),
      orderBy: (e, { asc }) => asc(e.nombre),
      columns: { id: true, nombre: true, colorLocal: true, horarioFijo: true, horarioFijoMonto: true },
    }),
    db.query.canchas.findMany({
      where: (c, { and, eq }) => and(eq(c.ligaId, ligaId), eq(c.activo, true)),
      orderBy: (c, { asc }) => asc(c.nombre),
      columns: { id: true, nombre: true },
    }),
    db.query.arbitros.findMany({
      where: (a, { and, eq }) => and(eq(a.ligaId, ligaId), eq(a.activo, true)),
      orderBy: (a, { asc }) => asc(a.nombre),
      columns: { id: true, nombre: true, apellido: true },
    }),
  ]);

  const partidosPorTorneo = Object.fromEntries(
    (await db.select({ torneoId: t.partidos.torneoId, n: count() })
      .from(t.partidos)
      .groupBy(t.partidos.torneoId)
    ).map((r) => [r.torneoId, r.n])
  );

  const canEdit = user.rol === "superadmin" || user.rol === "admin_liga";

  // Liga conectada a la plataforma de videos DE/SPORTS: los horarios del
  // torneo se eligen de las franjas de cámara en vez de captura libre
  const liga = await db.query.ligas.findFirst({
    where: (l, { eq }) => eq(l.id, ligaId),
    columns: { desportsLigaId: true },
  });
  const schedule = liga?.desportsLigaId ? await fetchScheduleDesports(liga.desportsLigaId) : null;

  // Slots (día, cancha, hora) reservados por torneos vigentes: el form los
  // deshabilita para que dos torneos no compartan cancha y horario
  const ocupados = canEdit ? await slotsOcupados(ligaId) : [];

  return (
    <TorneosClient
      ocupados={ocupados}
      torneos={torneos.map((tr) => ({
        id: tr.id,
        nombre: tr.nombre,
        rama: tr.rama,
        categoriaAnioMin: tr.categoriaAnioMin,
        categoriaAnioMax: tr.categoriaAnioMax,
        categoriaLibre: tr.categoriaLibre,
        tipoFutbol: tr.tipoFutbol,
        formato: tr.formato,
        partidosPorEquipo: tr.partidosPorEquipo,
        fechaInicio: tr.fechaInicio,
        diasJuego: tr.diasJuego,
        horarios: tr.horarios,
        horariosPorCancha: tr.horariosPorCancha,
        duracionPartido: tr.duracionPartido,
        descansoEntrePartidos: tr.descansoEntrePartidos,
        costoInscripcion: tr.costoInscripcion,
        costoArbitraje: tr.costoArbitraje,
        estado: tr.estado,
        equipoIds: tr.equipos.map((e) => e.equipoId),
        canchaIds: tr.canchas.map((c) => c.canchaId),
        arbitroIds: tr.arbitros.map((a) => a.arbitroId),
        partidos: partidosPorTorneo[tr.id] ?? 0,
      }))}
      equipos={equipos}
      canchas={canchas}
      arbitros={arbitros.map((a) => ({ id: a.id, nombre: `${a.nombre} ${a.apellido}`.trim() }))}
      canEdit={canEdit}
      esSuper={user.rol === "superadmin"}
      desports={schedule ? { dias: schedule.dias } : null}
    />
  );
}
