"use client";
import { useState, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, TeamBadge,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { fmtFechaCorta, fmtFechaHora , plural} from "@/lib/format";
import { ESTADO_RECLAMO, TIPO_RECLAMO, estadoInfo } from "@/lib/labels";
import { createReclamo, responderReclamo, deleteReclamo, type ActionState } from "./actions";

export interface ReclamoRow {
  id: string;
  tipo: string;
  descripcion: string;
  estado: "pendiente" | "en_revision" | "resuelto" | "rechazado";
  respuesta: string | null;
  fechaRespuesta: string | null;
  createdAt: string;
  torneoNombre: string;
  equipoNombre: string;
  equipoColor: string;
  partidoJornada: number | null;
  partidoFecha: string | null;
  partidoLocal: string | null;
  partidoVisitante: string | null;
}

export interface PartidoOpcion {
  id: string;
  torneoId: string;
  jornada: number;
  fecha: string;
  localNombre: string;
  visitanteNombre: string;
}

export default function ReclamosClient({ reclamos, torneos, partidos, canRespond, canCreate }: {
  reclamos: ReclamoRow[];
  torneos: { id: string; nombre: string }[];
  partidos: PartidoOpcion[];
  canRespond: boolean;
  canCreate: boolean;
}) {
  const [crear, setCrear] = useState(false);
  const [responder, setResponder] = useState<ReclamoRow | null>(null);
  const pag = usePagination(reclamos);

  return (
    <div>
      <PageHeader title="Reclamos" subtitle={plural(reclamos.length, "reclamo")}>
        {canCreate && (
          <PrimaryButton onClick={() => setCrear(true)}>
            <span className="text-base leading-none">＋</span> Nuevo reclamo
          </PrimaryButton>
        )}
      </PageHeader>

      {reclamos.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="reclamos" text="Aún no hay reclamos" />
        </div>
      ) : (
        <div className="space-y-4">
          {pag.slice.map((r) => (
            <article key={r.id} className="bg-white rounded-xl border border-ink-200 shadow-sm p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <TeamBadge nombre={r.equipoNombre} color={r.equipoColor} size={32} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{r.equipoNombre}</p>
                  <p className="text-xs text-ink-500">{r.torneoNombre}</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Badge tone="gris">{TIPO_RECLAMO[r.tipo] ?? r.tipo}</Badge>
                  <Badge tone={estadoInfo(ESTADO_RECLAMO, r.estado).tone}>{estadoInfo(ESTADO_RECLAMO, r.estado).label}</Badge>
                  <span className="text-xs text-ink-500 whitespace-nowrap">{fmtFechaHora(r.createdAt)}</span>
                </div>
              </div>

              {r.partidoJornada != null && (
                <p className="text-xs text-ink-500 mb-2">
                  Partido: J{r.partidoJornada} · {r.partidoLocal} vs {r.partidoVisitante}
                  {r.partidoFecha && ` · ${fmtFechaCorta(r.partidoFecha)}`}
                </p>
              )}

              <p className="text-sm text-ink-700 whitespace-pre-line">{r.descripcion}</p>

              {r.respuesta && (
                <div className="mt-4 rounded-xl bg-ink-50 border border-ink-100 p-4">
                  <p className="text-xs font-semibold text-azul-600 uppercase tracking-wider mb-1">
                    Respuesta de la liga
                    {r.fechaRespuesta && <span className="text-ink-400 normal-case tracking-normal font-normal"> · {fmtFechaHora(r.fechaRespuesta)}</span>}
                  </p>
                  <p className="text-sm text-ink-700 whitespace-pre-line">{r.respuesta}</p>
                </div>
              )}

              {canRespond && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setResponder(r)}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs"
                  >
                    {r.respuesta ? "Actualizar respuesta" : "Responder"}
                  </button>
                </div>
              )}
              {/* El equipo puede retirar su reclamo mientras la liga no lo tome */}
              {canCreate && r.estado === "pendiente" && !r.respuesta && (
                <div className="mt-4 flex justify-end">
                  <EliminarReclamoBoton id={r.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {crear && <CrearReclamoModal torneos={torneos} partidos={partidos} onClose={() => setCrear(false)} />}
      {responder && <ResponderModal reclamo={responder} onClose={() => setResponder(null)} />}
    </div>
  );
}

function CrearReclamoModal({ torneos, partidos, onClose }: {
  torneos: { id: string; nombre: string }[]; partidos: PartidoOpcion[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createReclamo, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);
  const [torneoId, setTorneoId] = useState("");

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  const partidosDelTorneo = partidos.filter((p) => p.torneoId === torneoId);

  return (
    <Modal open onClose={onClose} title="Nuevo reclamo">
      <form key={formKey} action={enviar} className="space-y-4">
        <Field label="Torneo" htmlFor="rc-torneo">
          <select
            id="rc-torneo"
            name="torneoId"
            required
            value={torneoId}
            onChange={(e) => setTorneoId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>Selecciona torneo…</option>
            {torneos.map((tr) => <option key={tr.id} value={tr.id}>{tr.nombre}</option>)}
          </select>
        </Field>
        <Field label="Partido (opcional)" htmlFor="rc-partido">
          <select id="rc-partido" name="partidoId" defaultValue={valor("partidoId", "")} className={inputCls} disabled={!torneoId}>
            <option value="">Sin partido específico</option>
            {partidosDelTorneo.map((p) => (
              <option key={p.id} value={p.id}>
                J{p.jornada} · {p.localNombre} vs {p.visitanteNombre} · {fmtFechaCorta(p.fecha)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo" htmlFor="rc-tipo">
          <select id="rc-tipo" name="tipo" defaultValue={valor("tipo", "protesta")} className={inputCls}>
            <option value="protesta">{TIPO_RECLAMO.protesta}</option>
            <option value="queja">{TIPO_RECLAMO.queja}</option>
            <option value="apelacion">{TIPO_RECLAMO.apelacion}</option>
            <option value="otro">{TIPO_RECLAMO.otro}</option>
          </select>
        </Field>
        <Field label="Descripción" htmlFor="rc-descripcion">
          <textarea id="rc-descripcion" name="descripcion" required rows={5} defaultValue={valor("descripcion", "")} className={inputCls} placeholder="Describe lo ocurrido…" />
        </Field>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Enviar reclamo</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function EliminarReclamoBoton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteReclamo, {});
  const [confirmar, setConfirmar] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      {state.error && <span className="text-xs text-red-600 font-semibold">{state.error}</span>}
      {confirmar ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={pending} className="text-red-600 hover:text-red-800 font-bold text-xs disabled:opacity-50">
            {pending ? "Eliminando…" : "¿Confirmas eliminar el reclamo?"}
          </button>
        </form>
      ) : (
        <button onClick={() => setConfirmar(true)} className="text-red-500 hover:text-red-700 font-semibold text-xs">
          Eliminar reclamo
        </button>
      )}
    </span>
  );
}

function ResponderModal({ reclamo, onClose }: { reclamo: ReclamoRow; onClose: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(responderReclamo, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="Responder reclamo">
      <p className="text-sm text-ink-500 mb-4">
        <strong className="text-ink-900">{reclamo.equipoNombre}</strong> · {TIPO_RECLAMO[reclamo.tipo] ?? reclamo.tipo} · {reclamo.torneoNombre}
      </p>
      <form key={formKey} action={enviar} className="space-y-4">
        <input type="hidden" name="id" value={reclamo.id} />
        {reclamo.respuesta && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-ink-800">
            Este reclamo ya tiene una respuesta que el equipo pudo haber leído:
            al guardar se <strong>sobrescribe</strong>.
          </p>
        )}
        <Field label="Respuesta" htmlFor="rs-respuesta">
          <textarea
            id="rs-respuesta"
            name="respuesta"
            rows={5}
            defaultValue={valor("respuesta", reclamo.respuesta ?? "")}
            className={inputCls}
          />
          <p className="text-xs text-ink-400 mt-1.5">
            Obligatoria para Resuelto o Rechazado; opcional si solo lo marcas En revisión.
          </p>
        </Field>
        <Field label="Estado" htmlFor="rs-estado">
          <select id="rs-estado" name="estado" defaultValue={valor("estado", reclamo.estado)} className={inputCls}>
            {Object.entries(ESTADO_RECLAMO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
          </select>
        </Field>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Guardar respuesta</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
