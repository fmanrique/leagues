"use client";
import { plural } from "@/lib/format";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { TIPO_FUTBOL } from "@/lib/labels";
import { createCancha, updateCancha, deleteCancha, type ActionState } from "./actions";

export interface CanchaRow {
  id: string; nombre: string; direccion: string;
  tipo: string; superficie: string;
  iluminacion: boolean; activo: boolean;
}

const superficieLabel: Record<string, string> = {
  pasto_natural: "Pasto natural",
  pasto_sintetico: "Pasto sintético",
  cemento: "Cemento",
};

export default function CanchasClient({ canchas }: { canchas: CanchaRow[] }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | CanchaRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CanchaRow | null>(null);

  const filtered = useMemo(
    () => canchas.filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase())),
    [canchas, query]
  );
  const pag = usePagination(filtered);

  return (
    <div>
      <PageHeader title="Canchas" subtitle={`${plural(canchas.length, "cancha")} en la liga`}>
        <input
          type="search"
          aria-label="Buscar cancha"
          placeholder="Buscar cancha…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-48 bg-white`}
        />
        <PrimaryButton onClick={() => setModal("create")}>
          <span className="text-base leading-none">＋</span> Nueva cancha
        </PrimaryButton>
      </PageHeader>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="canchas" text={query ? "Sin resultados para la búsqueda" : "Aún no hay canchas"} />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Cancha</Th>
            <Th>Dirección</Th>
            <Th>Tipo</Th>
            <Th>Superficie</Th>
            <Th>Iluminación</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </>}
        >
          {pag.slice.map((c) => (
            <tr key={c.id} className="hover:bg-ink-50/60 transition-colors">
              <Td>
                <div className="font-semibold text-ink-900">{c.nombre}</div>
              </Td>
              <Td>{c.direccion || "—"}</Td>
              <Td>{TIPO_FUTBOL[c.tipo] ?? "—"}</Td>
              <Td>{superficieLabel[c.superficie] ?? "—"}</Td>
              <Td>{c.iluminacion ? <Badge tone="azul">Sí</Badge> : <Badge tone="gris">No</Badge>}</Td>
              <Td>{c.activo ? <Badge tone="lima">Activa</Badge> : <Badge tone="gris">Inactiva</Badge>}</Td>
              <Td className="text-right">
                <button
                  onClick={() => setModal(c)}
                  className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="text-red-500 hover:text-red-700 font-semibold text-xs"
                >
                  Eliminar
                </button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <CanchaFormModal
          cancha={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Eliminar cancha">
          <p className="text-sm text-ink-700 mb-1">
            ¿Eliminar <strong>{confirmDelete.nombre}</strong>?
          </p>
          <p className="text-sm text-red-600 mb-5">
            Se le quitará de los torneos donde participa y sus partidos quedarán sin cancha asignada. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <form action={deleteCancha} onSubmit={() => setConfirmDelete(null)}>
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

function CanchaFormModal({ cancha, onClose }: { cancha: CanchaRow | null; onClose: () => void }) {
  const action = cancha ? updateCancha : createCancha;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, marcado } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={cancha ? "Editar cancha" : "Nueva cancha"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {cancha && <input type="hidden" name="id" value={cancha.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre" htmlFor="ca-nombre" className="sm:col-span-2">
            <input id="ca-nombre" name="nombre" required defaultValue={valor("nombre", cancha?.nombre)} className={inputCls} />
          </Field>
          <Field label="Dirección" htmlFor="ca-direccion" className="sm:col-span-2">
            <input id="ca-direccion" name="direccion" defaultValue={valor("direccion", cancha?.direccion)} className={inputCls} />
          </Field>
          <Field label="Tipo" htmlFor="ca-tipo">
            <select id="ca-tipo" name="tipo" defaultValue={valor("tipo", cancha?.tipo || "futbol_11")} className={inputCls}>
              {Object.entries(TIPO_FUTBOL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Superficie" htmlFor="ca-superficie">
            <select id="ca-superficie" name="superficie" defaultValue={valor("superficie", cancha?.superficie || "pasto_natural")} className={inputCls}>
              <option value="pasto_natural">Pasto natural</option>
              <option value="pasto_sintetico">Pasto sintético</option>
              <option value="cemento">Cemento</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="iluminacion" defaultChecked={marcado("iluminacion", cancha?.iluminacion ?? false)} className="w-4 h-4 accent-azul-600" />
          Cuenta con iluminación
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="activo" defaultChecked={marcado("activo", cancha?.activo ?? true)} className="w-4 h-4 accent-azul-600" />
          Cancha activa
        </label>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{cancha ? "Guardar cambios" : "Crear cancha"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
