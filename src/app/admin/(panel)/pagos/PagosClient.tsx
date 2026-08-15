"use client";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, TeamBadge, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { fmtFechaMedia, fmtMXN , plural} from "@/lib/format";
import { ESTADO_PAGO, TIPO_PAGO, estadoInfo, type BadgeTone } from "@/lib/labels";
import { createPago, updatePago, marcarPagado, deletePago, type ActionState } from "./actions";

export interface PagoRow {
  id: string;
  torneoId: string;
  equipoId: string;
  tipo: "inscripcion" | "arbitraje" | "multa" | "horario_fijo" | "otro";
  jornada: number | null;
  monto: string;
  estado: "pendiente" | "pagado" | "cancelado";
  fecha: string | null;
  torneoNombre: string;
  equipoNombre: string;
  equipoColor: string;
}

export interface Opcion { id: string; nombre: string }

/** Tono del badge por tipo de pago (el label viene de TIPO_PAGO). */
const tipoTone: Record<PagoRow["tipo"], BadgeTone> = {
  inscripcion: "azul",
  arbitraje: "gris",
  multa: "rojo",
  horario_fijo: "ambar",
  otro: "gris",
};

export default function PagosClient({ pagos, equipos, torneos, canEdit }: {
  pagos: PagoRow[]; equipos: Opcion[]; torneos: Opcion[]; canEdit: boolean;
}) {
  const [fEquipo, setFEquipo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [modal, setModal] = useState<"create" | PagoRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PagoRow | null>(null);

  const filtered = useMemo(
    () => pagos.filter((p) =>
      (!fEquipo || p.equipoId === fEquipo) &&
      (!fEstado || p.estado === fEstado) &&
      (!fTipo || p.tipo === fTipo)
    ),
    [pagos, fEquipo, fEstado, fTipo]
  );

  const resumen = useMemo(() => {
    const pagado = filtered.filter((p) => p.estado === "pagado").reduce((s, p) => s + Number(p.monto), 0);
    const pendiente = filtered.filter((p) => p.estado === "pendiente").reduce((s, p) => s + Number(p.monto), 0);
    const total = pagado + pendiente;
    return { pagado, pendiente, pct: total > 0 ? (pagado / total) * 100 : 0 };
  }, [filtered]);
  const pag = usePagination(filtered);

  return (
    <div>
      <PageHeader title="Pagos" subtitle={`${plural(pagos.length, "cargo registrado", "cargos registrados")}`}>
        {canEdit && (
          <PrimaryButton onClick={() => setModal("create")}>
            <span className="text-base leading-none">＋</span> Nuevo pago
          </PrimaryButton>
        )}
      </PageHeader>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Total pagado</p>
          <p className="text-2xl font-bold text-lima-700 mt-1">{fmtMXN(resumen.pagado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Total pendiente</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{fmtMXN(resumen.pendiente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">% cobrado</p>
          <p className="text-2xl font-bold text-azul-600 mt-1">{resumen.pct.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={fEquipo} onChange={(e) => setFEquipo(e.target.value)} className={`${inputCls} w-auto bg-white`} aria-label="Filtrar por equipo">
          <option value="">Todos los equipos</option>
          {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={`${inputCls} w-auto bg-white`} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_PAGO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
        </select>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className={`${inputCls} w-auto bg-white`} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_PAGO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="pagos" text={pagos.length ? "Sin resultados para los filtros" : "Aún no hay pagos registrados"} />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Equipo</Th>
            <Th>Torneo</Th>
            <Th>Tipo</Th>
            <Th className="text-center">Jornada</Th>
            <Th className="text-right">Monto</Th>
            <Th>Estado</Th>
            <Th>Fecha de pago</Th>
            {canEdit && <Th className="text-right">Acciones</Th>}
          </>}
        >
          {pag.slice.map((p) => (
            <tr key={p.id} className="hover:bg-ink-50/60 transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  <TeamBadge nombre={p.equipoNombre} color={p.equipoColor} size={28} />
                  <span className="font-semibold text-ink-900">{p.equipoNombre}</span>
                </div>
              </Td>
              <Td>{p.torneoNombre}</Td>
              <Td><Badge tone={tipoTone[p.tipo]}>{TIPO_PAGO[p.tipo] ?? p.tipo}</Badge></Td>
              <Td className="text-center">{p.jornada ?? "—"}</Td>
              <Td className="text-right font-semibold text-ink-900 whitespace-nowrap">{fmtMXN(p.monto)}</Td>
              <Td><Badge tone={estadoInfo(ESTADO_PAGO, p.estado).tone}>{estadoInfo(ESTADO_PAGO, p.estado).label}</Badge></Td>
              <Td className="whitespace-nowrap">{p.fecha ? fmtFechaMedia(p.fecha) : "—"}</Td>
              {canEdit && (
                <Td className="text-right whitespace-nowrap">
                  {p.estado === "pendiente" && (
                    <form action={marcarPagado} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-lima-800 hover:text-lima-700 font-semibold text-xs mr-3">
                        Marcar pagado
                      </button>
                    </form>
                  )}
                  <button onClick={() => setModal(p)} className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3">
                    Editar
                  </button>
                  <button onClick={() => setConfirmDelete(p)} className="text-red-500 hover:text-red-700 font-semibold text-xs">
                    Eliminar
                  </button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <PagoFormModal
          pago={modal === "create" ? null : modal}
          equipos={equipos}
          torneos={torneos}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Eliminar pago">
          <p className="text-sm text-ink-700 mb-1">
            ¿Eliminar el cargo de <strong>{fmtMXN(confirmDelete.monto)}</strong> ({TIPO_PAGO[confirmDelete.tipo] ?? confirmDelete.tipo}) de <strong>{confirmDelete.equipoNombre}</strong>?
          </p>
          <p className="text-sm text-red-600 mb-5">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <form action={deletePago} onSubmit={() => setConfirmDelete(null)}>
              <input type="hidden" name="id" value={confirmDelete.id} />
              <button type="submit" className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-bold text-white">
                Eliminar
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PagoFormModal({ pago, equipos, torneos, onClose }: {
  pago: PagoRow | null; equipos: Opcion[]; torneos: Opcion[]; onClose: () => void;
}) {
  const action = pago ? updatePago : createPago;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={pago ? "Editar pago" : "Nuevo pago"}>
      <form key={formKey} action={enviar} className="space-y-4">
        {pago && <input type="hidden" name="id" value={pago.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Torneo" htmlFor="pg-torneo" className="sm:col-span-2">
            <select id="pg-torneo" name="torneoId" required defaultValue={valor("torneoId", pago?.torneoId ?? "")} className={inputCls}>
              <option value="" disabled>Selecciona torneo…</option>
              {torneos.map((tr) => <option key={tr.id} value={tr.id}>{tr.nombre}</option>)}
            </select>
          </Field>
          <Field label="Equipo" htmlFor="pg-equipo" className="sm:col-span-2">
            <select id="pg-equipo" name="equipoId" required defaultValue={valor("equipoId", pago?.equipoId ?? "")} className={inputCls}>
              <option value="" disabled>Selecciona equipo…</option>
              {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Field>
          <Field label="Tipo" htmlFor="pg-tipo">
            <select id="pg-tipo" name="tipo" defaultValue={valor("tipo", pago?.tipo ?? "inscripcion")} className={inputCls}>
              {Object.entries(TIPO_PAGO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Jornada (opcional)" htmlFor="pg-jornada">
            <input id="pg-jornada" name="jornada" type="number" min={1} max={999} defaultValue={valor("jornada", pago?.jornada ?? "")} className={inputCls} />
          </Field>
          <Field label="Monto (MXN)" htmlFor="pg-monto">
            <input id="pg-monto" name="monto" type="number" step="0.01" min="0.01" required defaultValue={valor("monto", pago?.monto ?? "")} className={inputCls} />
          </Field>
          {pago ? (
            <>
              <Field label="Estado" htmlFor="pg-estado">
                <select id="pg-estado" name="estado" defaultValue={valor("estado", pago.estado)} className={inputCls}>
                  {Object.entries(ESTADO_PAGO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
                </select>
              </Field>
              <Field label="Fecha de pago" htmlFor="pg-fecha">
                <input id="pg-fecha" name="fecha" type="date" defaultValue={valor("fecha", pago.fecha ?? "")} className={inputCls} />
              </Field>
            </>
          ) : (
            <input type="hidden" name="estado" value="pendiente" />
          )}
        </div>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{pago ? "Guardar cambios" : "Crear pago"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
