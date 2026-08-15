"use client";
import { useState, useMemo, useActionState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  PageHeader, SubmitButton, Modal, Field, inputCls, FormError, EmptyState, Badge, TeamBadge,
  usePagination, Pagination,
} from "@/components/admin/ui";
import { fmtFechaCorta , plural} from "@/lib/format";
import { ESTADO_PARTIDO, estadoInfo } from "@/lib/labels";
import { updatePartido, type ActionState } from "./actions";

interface EquipoMini { id: string; nombre: string; colorLocal: string }
export interface PartidoRow {
  id: string; jornada: number; fecha: string; hora: string;
  estado: "programado" | "en_curso" | "finalizado" | "suspendido" | "cancelado";
  fichaCompletada: boolean;
  golesLocal: number | null; golesVisitante: number | null;
  canchaId: string; canchaNombre: string;
  arbitroId: string; arbitroNombre: string;
  videoUrl: string | null;
  local: EquipoMini; visitante: EquipoMini;
}
interface Opcion { id: string; nombre: string }
interface EquipoTorneo { id: string; nombre: string; horarioFijo: string | null }

export default function CalendarioClient({ torneos, torneoActivo, partidos, equiposTorneo, canchas, arbitros, canEdit }: {
  torneos: { id: string; nombre: string }[];
  torneoActivo: string | null;
  partidos: PartidoRow[];
  equiposTorneo: EquipoTorneo[];
  canchas: Opcion[];
  arbitros: Opcion[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const jornadas = useMemo(() => [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b), [partidos]);
  // Jornada inicial: la vigente (primera con partidos sin finalizar), no la J1
  const jornadaVigente = useMemo(() => {
    const pendiente = [...partidos]
      .sort((a, b) => a.jornada - b.jornada)
      .find((p) => p.estado === "programado" || p.estado === "en_curso" || p.estado === "suspendido");
    return pendiente?.jornada ?? jornadas[jornadas.length - 1];
  }, [partidos, jornadas]);
  const [jornada, setJornada] = useState<number | "todas">(jornadaVigente ?? "todas");
  const [editTarget, setEditTarget] = useState<PartidoRow | null>(null);

  const visibles = jornada === "todas" ? partidos : partidos.filter((p) => p.jornada === jornada);
  const pag = usePagination(visibles);

  return (
    <div>
      <PageHeader title="Calendario" subtitle={`${plural(partidos.length, "partido")} en el torneo`}>
        <select
          value={torneoActivo ?? ""}
          onChange={(e) => router.push(`${pathname}?torneo=${e.target.value}`)}
          className={`${inputCls} w-64 bg-white`}
          aria-label="Torneo"
        >
          {torneos.map((tr) => <option key={tr.id} value={tr.id}>{tr.nombre}</option>)}
        </select>
      </PageHeader>

      {partidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="calendario" text="Este torneo aún no tiene calendario generado" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button
              onClick={() => setJornada("todas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${jornada === "todas" ? "bg-azul-600 text-white" : "bg-white border border-ink-200 text-ink-600 hover:border-azul-400"}`}
            >
              Todas
            </button>
            {jornadas.map((j) => (
              <button
                key={j}
                onClick={() => setJornada(j)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${jornada === j ? "bg-azul-600 text-white" : "bg-white border border-ink-200 text-ink-600 hover:border-azul-400"}`}
              >
                J{j}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {pag.slice.map((p) => {
              const info = estadoInfo(ESTADO_PARTIDO, p.estado);
              return (
                <article key={p.id} className="bg-white rounded-xl border border-ink-200 shadow-sm p-4">
                  <div className="flex items-center justify-between text-xs text-ink-500 mb-3">
                    <span>J{p.jornada} · {fmtFechaCorta(p.fecha)} · {p.hora} · {p.canchaNombre}</span>
                    <Badge tone={info.tone}>{info.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <TeamBadge nombre={p.local.nombre} color={p.local.colorLocal} />
                      <span className="text-sm font-semibold text-ink-900 truncate">{p.local.nombre}</span>
                    </span>
                    {p.estado === "finalizado" ? (
                      <span className="font-bold text-ink-900 whitespace-nowrap">{p.golesLocal} - {p.golesVisitante}</span>
                    ) : (
                      <span className="text-ink-400 text-sm">vs</span>
                    )}
                    <span className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <span className="text-sm font-semibold text-ink-900 truncate">{p.visitante.nombre}</span>
                      <TeamBadge nombre={p.visitante.nombre} color={p.visitante.colorLocal} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-500">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {!p.arbitroId && (p.estado === "programado" || p.estado === "suspendido") ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap"
                          title="Ningún árbitro quedó libre en este horario al generar el rol; asígnale uno con Editar"
                        >
                          ⚠ Sin árbitro
                        </span>
                      ) : (
                        <span className="truncate">Árbitro: {p.arbitroNombre}</span>
                      )}
                      {p.videoUrl ? <span className="whitespace-nowrap">· 🎥 video manual</span> : null}
                    </span>
                    {canEdit && (
                      <button onClick={() => setEditTarget(p)} className="font-semibold text-azul-600 hover:text-azul-800">
                        Editar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />
        </>
      )}

      {editTarget && (
        <EditPartidoModal
          partido={editTarget}
          todos={partidos}
          equiposTorneo={equiposTorneo}
          canchas={canchas}
          arbitros={arbitros}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function EditPartidoModal({ partido, todos, equiposTorneo, canchas, arbitros, onClose }: {
  partido: PartidoRow; todos: PartidoRow[]; equiposTorneo: EquipoTorneo[];
  canchas: Opcion[]; arbitros: Opcion[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updatePartido, {});
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  // Con ficha/goles capturados los equipos ya no se cambian (la tabla dependería de ellos)
  const puedeCambiarEquipos = partido.estado !== "finalizado" && !partido.fichaCompletada;
  const [localId, setLocalId] = useState(partido.local.id);
  const [visitanteId, setVisitanteId] = useState(partido.visitante.id);

  // Otros cruces del mismo par en el torneo (cualquier localía, sin cancelados)
  const cruces = useMemo(() => todos.filter((q) =>
    q.id !== partido.id && q.estado !== "cancelado" &&
    ((q.local.id === localId && q.visitante.id === visitanteId) ||
      (q.local.id === visitanteId && q.visitante.id === localId))
  ), [todos, partido.id, localId, visitanteId]);

  // Equipos con horario fijo pagado: aviso al reprogramar la hora
  const conHorarioFijo = useMemo(() => equiposTorneo.filter(
    (e) => e.horarioFijo && (e.id === localId || e.id === visitanteId)
  ), [equiposTorneo, localId, visitanteId]);

  return (
    <Modal open onClose={onClose} title={`${partido.local.nombre} vs ${partido.visitante.nombre}`}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={partido.id} />
        <div className="grid grid-cols-2 gap-4">
          {puedeCambiarEquipos ? (
            <>
              <Field label="Local" htmlFor="pa-local">
                <select id="pa-local" name="equipoLocalId" value={localId} onChange={(e) => setLocalId(e.target.value)} className={inputCls}>
                  {equiposTorneo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>
              <Field label="Visitante" htmlFor="pa-visitante">
                <select id="pa-visitante" name="equipoVisitanteId" value={visitanteId} onChange={(e) => setVisitanteId(e.target.value)} className={inputCls}>
                  {equiposTorneo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>
              {localId === visitanteId ? (
                <p className="col-span-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Un equipo no puede jugar contra sí mismo.
                </p>
              ) : cruces.length > 0 && (
                <p className="col-span-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ Estos equipos ya tienen {plural(cruces.length, "cruce")} en el torneo
                  {" "}({cruces.map((q) => `J${q.jornada}`).join(", ")}). Puedes guardar de todas formas.
                </p>
              )}
            </>
          ) : (
            <>
              <input type="hidden" name="equipoLocalId" value={partido.local.id} />
              <input type="hidden" name="equipoVisitanteId" value={partido.visitante.id} />
            </>
          )}
          <Field label="Jornada" htmlFor="pa-jornada">
            <input id="pa-jornada" name="jornada" type="number" min={1} max={999} required defaultValue={partido.jornada} className={inputCls} />
          </Field>
          <Field label="Fecha" htmlFor="pa-fecha">
            <input id="pa-fecha" name="fecha" type="date" required defaultValue={partido.fecha} className={inputCls} />
          </Field>
          <Field label="Hora" htmlFor="pa-hora">
            <input id="pa-hora" name="hora" type="time" required defaultValue={partido.hora} className={inputCls} />
          </Field>
          {conHorarioFijo.length > 0 && (
            <p className="col-span-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {conHorarioFijo.map((e) => `${e.nombre} tiene horario fijo pagado a las ${e.horarioFijo}`).join("; ")}.
              Tómalo en cuenta al mover la hora.
            </p>
          )}
          <Field label="Cancha" htmlFor="pa-cancha">
            <select id="pa-cancha" name="canchaId" defaultValue={partido.canchaId} className={inputCls}>
              <option value="">Por definir</option>
              {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Árbitro" htmlFor="pa-arbitro">
            <select id="pa-arbitro" name="arbitroId" defaultValue={partido.arbitroId} className={inputCls}>
              <option value="">Por definir</option>
              {arbitros.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Field>
          {partido.estado === "finalizado" ? (
            <Field label="Estado" htmlFor="pa-estado" className="col-span-2">
              <input type="hidden" name="estado" value="finalizado" />
              <p id="pa-estado" className="text-sm text-ink-600 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5">
                Finalizado — el marcador se corrige desde la Ficha Arbitral
              </p>
            </Field>
          ) : (
            <Field label="Estado" htmlFor="pa-estado" className="col-span-2">
              <select id="pa-estado" name="estado" defaultValue={partido.estado} className={inputCls}>
                <option value="programado">{ESTADO_PARTIDO.programado.label}</option>
                <option value="en_curso">{ESTADO_PARTIDO.en_curso.label}</option>
                <option value="suspendido">{ESTADO_PARTIDO.suspendido.label}</option>
                <option value="cancelado">{ESTADO_PARTIDO.cancelado.label}</option>
              </select>
              <p className="text-xs text-ink-400 mt-1.5">
                &ldquo;En vivo&rdquo; es manual e informativo: el partido se finaliza capturando
                su Ficha Arbitral.
              </p>
            </Field>
          )}
          <Field label="URL del video (opcional)" htmlFor="pa-video" className="col-span-2">
            <input
              id="pa-video"
              name="videoUrl"
              type="url"
              placeholder="https://de-sports.com.mx/leagues/…/video/…"
              defaultValue={partido.videoUrl ?? ""}
              className={inputCls}
            />
            <p className="text-xs text-ink-400 mt-1.5">
              Déjala vacía para enlazarlo automáticamente con el horario de cámaras de DE/SPORTS
              (día, cancha y hora del partido).
            </p>
          </Field>
        </div>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Guardar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
