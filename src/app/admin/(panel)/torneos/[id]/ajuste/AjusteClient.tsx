"use client";
import { useMemo, useState, useActionState, useEffect } from "react";
import Link from "next/link";
import {
  PageHeader, SubmitButton, Modal, Field, inputCls, FormError, Badge, TeamBadge,
  Table, Th, Td, EmptyState,
} from "@/components/admin/ui";
import { fmtFechaCorta, plural } from "@/lib/format";
import {
  darDeBajaEquipo, reactivarEquipo, asignarSustituto, regenerarPendientesTorneo,
  type ActionState,
} from "./actions";

interface TorneoInfo { id: string; nombre: string; estado: string; objetivo: number }
interface EquipoRow {
  id: string; nombre: string; color: string; logoUrl: string | null;
  retirado: boolean; jornadaRetiro: number | null;
}
interface PartidoMini {
  id: string; jornada: number; fecha: string; hora: string;
  estado: "programado" | "en_curso" | "finalizado" | "suspendido" | "cancelado";
  canchaNombre: string; localId: string; visitanteId: string;
}

const FIJOS = ["finalizado", "en_curso", "suspendido"];

export default function AjusteClient({ torneo, equipos, partidos }: {
  torneo: TorneoInfo; equipos: EquipoRow[]; partidos: PartidoMini[];
}) {
  const [bajaTarget, setBajaTarget] = useState<EquipoRow | null>(null);
  const [regenerarOpen, setRegenerarOpen] = useState(false);

  const porEquipo = useMemo(() => {
    const m = new Map(equipos.map((e) => [e.id, { fijos: 0, programados: 0 }]));
    for (const p of partidos) {
      for (const id of [p.localId, p.visitanteId]) {
        const r = m.get(id);
        if (!r) continue;
        if (FIJOS.includes(p.estado)) r.fijos++;
        else if (p.estado === "programado") r.programados++;
      }
    }
    return m;
  }, [equipos, partidos]);

  const retiro = useMemo(
    () => new Map(equipos.filter((e) => e.retirado).map((e) => [e.id, e.jornadaRetiro ?? 0])),
    [equipos]
  );
  // Pendiente de asignar: programado con un lado dado de baja desde esa jornada
  const pendientes = useMemo(() => partidos.filter((p) => {
    if (p.estado !== "programado") return false;
    const rl = retiro.get(p.localId);
    const rv = retiro.get(p.visitanteId);
    return (rl != null && p.jornada >= rl) || (rv != null && p.jornada >= rv);
  }), [partidos, retiro]);

  const nombreDe = useMemo(() => new Map(equipos.map((e) => [e.id, e.nombre])), [equipos]);
  const activos = equipos.filter((e) => !e.retirado);
  const cerrado = ["finalizado", "cancelado"].includes(torneo.estado);

  return (
    <div>
      <PageHeader
        title={`Ajustes · ${torneo.nombre}`}
        subtitle={`${plural(torneo.objetivo, "fecha")} garantizadas por equipo · ${plural(activos.length, "equipo activo", "equipos activos")}`}
      >
        <Link href="/admin/torneos" className="text-sm font-semibold text-azul-600 hover:text-azul-800">
          ← Torneos
        </Link>
        {!cerrado && (
          <button
            onClick={() => setRegenerarOpen(true)}
            className="rounded-xl bg-azul-600 hover:bg-azul-700 px-4 py-2.5 text-sm font-bold text-white"
          >
            Regenerar pendientes
          </button>
        )}
      </PageHeader>

      <div className="mb-6">
        <Table head={<><Th>Equipo</Th><Th>Estado</Th><Th className="text-center">Jugados</Th><Th className="text-center">Programados</Th><Th className="text-center">Total / Meta</Th><Th className="text-right">Acciones</Th></>}>
          {equipos.map((e) => {
            const r = porEquipo.get(e.id)!;
            const total = r.fijos + r.programados;
            return (
              <tr key={e.id} className={e.retirado ? "opacity-70" : ""}>
                <Td>
                  <span className="flex items-center gap-2">
                    <TeamBadge nombre={e.nombre} color={e.color} logoUrl={e.logoUrl} />
                    <span className="font-semibold text-ink-900">{e.nombre}</span>
                  </span>
                </Td>
                <Td>
                  {e.retirado
                    ? <Badge tone="rojo">Baja desde J{e.jornadaRetiro}</Badge>
                    : <Badge tone="lima">Activo</Badge>}
                </Td>
                <Td className="text-center">{r.fijos}</Td>
                <Td className="text-center">{r.programados}</Td>
                <Td className="text-center">
                  <span className={!e.retirado && total < torneo.objetivo ? "font-bold text-amber-600" : "font-semibold text-ink-900"}>
                    {total} / {torneo.objetivo}
                  </span>
                </Td>
                <Td className="text-right">
                  {!cerrado && (e.retirado
                    ? <ReactivarButton torneoId={torneo.id} equipoId={e.id} />
                    : (
                      <button
                        onClick={() => setBajaTarget(e)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Dar de baja
                      </button>
                    ))}
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>

      <h2 className="brand-title text-lg text-ink-900 mb-3">
        Partidos pendientes de asignar {pendientes.length > 0 && `(${pendientes.length})`}
      </h2>
      {pendientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="calendario" text="No hay partidos con equipos dados de baja por resolver" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            Estos partidos incluyen a un equipo dado de baja. Asigna un sustituto en cada uno,
            o usa <strong>Regenerar pendientes</strong> para reprogramarlos todos automáticamente.
          </p>
          {pendientes.map((p) => (
            <PendienteRow
              key={p.id}
              partido={p}
              partidos={partidos}
              activos={activos}
              retiro={retiro}
              nombreDe={nombreDe}
            />
          ))}
        </div>
      )}

      {bajaTarget && (
        <BajaModal
          torneo={torneo}
          equipo={bajaTarget}
          partidos={partidos}
          onClose={() => setBajaTarget(null)}
        />
      )}
      {regenerarOpen && (
        <RegenerarModal torneo={torneo} pendientes={pendientes.length} onClose={() => setRegenerarOpen(false)} />
      )}
    </div>
  );
}

function ReactivarButton({ torneoId, equipoId }: { torneoId: string; equipoId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(reactivarEquipo, {});
  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="torneoId" value={torneoId} />
      <input type="hidden" name="equipoId" value={equipoId} />
      <button type="submit" className="text-xs font-semibold text-azul-600 hover:text-azul-800">
        Reactivar
      </button>
      {state.error && <span className="text-[11px] text-red-600">{state.error}</span>}
    </form>
  );
}

function BajaModal({ torneo, equipo, partidos, onClose }: {
  torneo: TorneoInfo; equipo: EquipoRow; partidos: PartidoMini[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(darDeBajaEquipo, {});
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  const programados = useMemo(
    () => partidos.filter((p) => p.estado === "programado" &&
      (p.localId === equipo.id || p.visitanteId === equipo.id)),
    [partidos, equipo.id]
  );
  const proxima = programados.length
    ? Math.min(...programados.map((p) => p.jornada))
    : (partidos.length ? Math.max(...partidos.map((p) => p.jornada)) + 1 : 1);
  const [jornada, setJornada] = useState(String(proxima));
  const afectados = programados.filter((p) => p.jornada >= (Number(jornada) || 0)).length;

  return (
    <Modal open onClose={onClose} title={`Dar de baja: ${equipo.nombre}`}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="torneoId" value={torneo.id} />
        <input type="hidden" name="equipoId" value={equipo.id} />
        <p className="text-sm text-ink-700">
          El equipo conserva todo lo jugado (puntos, goles y tarjetas de sus rivales incluidos)
          y aparecerá como baja en la tabla. No se elimina del torneo.
        </p>
        <Field label="Se retira a partir de la jornada" htmlFor="ba-jornada">
          <input
            id="ba-jornada" name="jornadaRetiro" type="number" min={1} max={999} required
            value={jornada} onChange={(e) => setJornada(e.target.value)} className={inputCls}
          />
        </Field>
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          {afectados > 0
            ? `Se afectan ${plural(afectados, "partido programado", "partidos programados")} de este equipo.`
            : "Este equipo no tiene partidos programados desde esa jornada."}
        </p>
        <Field label="¿Qué hacemos con esos partidos?" htmlFor="ba-modo">
          <div id="ba-modo" className="space-y-2">
            <label className="flex items-start gap-2.5 text-sm text-ink-700 rounded-xl border border-ink-200 p-3 has-checked:border-azul-400 has-checked:bg-azul-600/5">
              <input type="radio" name="modo" value="regenerar" defaultChecked className="mt-0.5 w-4 h-4 accent-azul-600" />
              <span>
                <strong>Regenerar automáticamente.</strong> Se reprograman las jornadas pendientes
                de todos los equipos para que cada uno cierre con sus {torneo.objetivo} fechas
                (con cruces repetidos donde haga falta, balanceados).
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-ink-700 rounded-xl border border-ink-200 p-3 has-checked:border-azul-400 has-checked:bg-azul-600/5">
              <input type="radio" name="modo" value="manual" className="mt-0.5 w-4 h-4 accent-azul-600" />
              <span>
                <strong>Ajustar manualmente.</strong> Los partidos quedan pendientes de asignar:
                tú eliges el equipo sustituto de cada uno en esta pantalla.
              </span>
            </label>
          </div>
        </Field>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton pendingLabel="Aplicando…">Dar de baja</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function PendienteRow({ partido, partidos, activos, retiro, nombreDe }: {
  partido: PartidoMini; partidos: PartidoMini[]; activos: EquipoRow[];
  retiro: Map<string, number>; nombreDe: Map<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(asignarSustituto, {});
  const ladoRetirado = retiro.has(partido.localId) ? "local" : "visitante";
  const retiradoId = ladoRetirado === "local" ? partido.localId : partido.visitanteId;
  const rivalId = ladoRetirado === "local" ? partido.visitanteId : partido.localId;
  const opciones = activos.filter((e) => e.id !== rivalId);
  const [sustituto, setSustituto] = useState("");

  // Avisos no bloqueantes al elegir sustituto
  const cruces = useMemo(() => !sustituto ? [] : partidos.filter((q) =>
    q.id !== partido.id && q.estado !== "cancelado" &&
    ((q.localId === sustituto && q.visitanteId === rivalId) ||
      (q.localId === rivalId && q.visitanteId === sustituto))
  ), [partidos, partido.id, sustituto, rivalId]);
  const dobleJornada = useMemo(() => !sustituto ? false : partidos.some((q) =>
    q.id !== partido.id && q.estado !== "cancelado" && q.jornada === partido.jornada &&
    (q.localId === sustituto || q.visitanteId === sustituto)
  ), [partidos, partido.id, partido.jornada, sustituto]);

  return (
    <article className="bg-white rounded-xl border border-ink-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 mb-2">
        <span>J{partido.jornada} · {fmtFechaCorta(partido.fecha)} · {partido.hora} · {partido.canchaNombre}</span>
        <Badge tone="ambar">Pendiente de asignar</Badge>
      </div>
      <p className="text-sm text-ink-900 mb-3">
        <span className="font-semibold line-through text-ink-400">{nombreDe.get(retiradoId)}</span>
        <span className="text-ink-400"> (baja) </span>
        vs <span className="font-semibold">{nombreDe.get(rivalId)}</span>
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="partidoId" value={partido.id} />
        <select
          name="sustitutoId"
          required
          value={sustituto}
          onChange={(e) => setSustituto(e.target.value)}
          className={`${inputCls} w-64`}
          aria-label="Equipo sustituto"
        >
          <option value="">Elegir equipo sustituto…</option>
          {opciones.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <SubmitButton pendingLabel="Asignando…">Asignar</SubmitButton>
      </form>
      {sustituto && (cruces.length > 0 || dobleJornada) && (
        <p className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {cruces.length > 0 &&
            `⚠ ${nombreDe.get(sustituto)} y ${nombreDe.get(rivalId)} ya tienen ${plural(cruces.length, "cruce")} (${cruces.map((q) => `J${q.jornada}`).join(", ")}). `}
          {dobleJornada && `⚠ ${nombreDe.get(sustituto)} ya juega en la J${partido.jornada}: quedaría en jornada doble. `}
          Puedes asignar de todas formas.
        </p>
      )}
      <FormError error={state.error} />
    </article>
  );
}

function RegenerarModal({ torneo, pendientes, onClose }: {
  torneo: TorneoInfo; pendientes: number; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(regenerarPendientesTorneo, {});
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="Regenerar partidos pendientes">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="torneoId" value={torneo.id} />
        <p className="text-sm text-ink-700">
          Se reemplazan los partidos <strong>programados</strong> por un nuevo rol que garantiza
          que cada equipo activo cierre con <strong>{plural(torneo.objetivo, "fecha")}</strong>,
          emparejando a los más rezagados y repitiendo los cruces menos jugados.
          Lo ya jugado, en curso o suspendido no se toca
          {pendientes > 0 && <>; se resuelven los {pendientes} pendientes de asignar</>}.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          Se pierden las reprogramaciones manuales de los partidos aún no jugados
          (fechas, horarios, árbitros y URLs de video).
        </p>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton pendingLabel="Regenerando…">Regenerar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
