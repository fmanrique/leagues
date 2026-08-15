"use client";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, FotoAvatar, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import FotoInput from "@/components/admin/FotoInput";
import { IMAGE_PRESETS } from "@/lib/image-client";
import { edad, nombreCompleto , plural} from "@/lib/format";
import { createArbitro, updateArbitro, deleteArbitro, type ActionState } from "./actions";

export interface ArbitroRow {
  id: string; nombre: string; apellido: string;
  fechaNacimiento: string | null; sexo: string; fotoUrl: string | null;
  telefono: string; email: string; activo: boolean;
}

export default function ArbitrosClient({ arbitros }: { arbitros: ArbitroRow[] }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | ArbitroRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArbitroRow | null>(null);

  const filtered = useMemo(
    () => arbitros.filter((a) => nombreCompleto(a).toLowerCase().includes(query.toLowerCase())),
    [arbitros, query]
  );
  const pag = usePagination(filtered);

  return (
    <div>
      <PageHeader title="Árbitros" subtitle={`${plural(arbitros.length, "árbitro")} en la liga`}>
        <input
          type="search"
          aria-label="Buscar árbitro"
          placeholder="Buscar árbitro…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-48 bg-white`}
        />
        <PrimaryButton onClick={() => setModal("create")}>
          <span className="text-base leading-none">＋</span> Nuevo árbitro
        </PrimaryButton>
      </PageHeader>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="arbitros" text={query ? "Sin resultados para la búsqueda" : "Aún no hay árbitros"} />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Árbitro</Th>
            <Th>Teléfono</Th>
            <Th>Email</Th>
            <Th className="text-center">Edad</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </>}
        >
          {pag.slice.map((a) => {
            const e = edad(a.fechaNacimiento);
            return (
              <tr key={a.id} className="hover:bg-ink-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <FotoAvatar nombre={nombreCompleto(a)} fotoUrl={a.fotoUrl} />
                    <div className="font-semibold text-ink-900">{nombreCompleto(a)}</div>
                  </div>
                </Td>
                <Td>{a.telefono || "—"}</Td>
                <Td>{a.email || "—"}</Td>
                <Td className="text-center">{e ?? "—"}</Td>
                <Td>{a.activo ? <Badge tone="lima">Activo</Badge> : <Badge tone="gris">Inactivo</Badge>}</Td>
                <Td className="text-right">
                  <button
                    onClick={() => setModal(a)}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a)}
                    className="text-red-500 hover:text-red-700 font-semibold text-xs"
                  >
                    Eliminar
                  </button>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <ArbitroFormModal
          arbitro={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Eliminar árbitro">
          <p className="text-sm text-ink-700 mb-1">
            ¿Eliminar <strong>{nombreCompleto(confirmDelete)}</strong>?
          </p>
          <p className="text-sm text-red-600 mb-5">
            Se le quitará de los torneos donde participa y sus partidos quedarán sin árbitro asignado. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <form action={deleteArbitro} onSubmit={() => setConfirmDelete(null)}>
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

function ArbitroFormModal({ arbitro, onClose }: { arbitro: ArbitroRow | null; onClose: () => void }) {
  const action = arbitro ? updateArbitro : createArbitro;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, marcado } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={arbitro ? "Editar árbitro" : "Nuevo árbitro"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {arbitro && <input type="hidden" name="id" value={arbitro.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Foto del árbitro" className="sm:col-span-2">
            <FotoInput name="foto" currentUrl={arbitro?.fotoUrl ?? null} forma="circulo" preset={IMAGE_PRESETS.foto} label="Foto" />
          </Field>
          <Field label="Nombre" htmlFor="ar-nombre">
            <input id="ar-nombre" name="nombre" required defaultValue={valor("nombre", arbitro?.nombre)} className={inputCls} />
          </Field>
          <Field label="Apellido" htmlFor="ar-apellido">
            <input id="ar-apellido" name="apellido" defaultValue={valor("apellido", arbitro?.apellido)} className={inputCls} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="ar-fechaNacimiento">
            <input id="ar-fechaNacimiento" name="fechaNacimiento" type="date" defaultValue={valor("fechaNacimiento", arbitro?.fechaNacimiento ?? "")} className={inputCls} />
          </Field>
          <Field label="Sexo" htmlFor="ar-sexo">
            <select id="ar-sexo" name="sexo" defaultValue={valor("sexo", arbitro?.sexo || "hombre")} className={inputCls}>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </Field>
          <Field label="Teléfono" htmlFor="ar-telefono">
            <input id="ar-telefono" name="telefono" defaultValue={valor("telefono", arbitro?.telefono)} className={inputCls} />
          </Field>
          <Field label="Email" htmlFor="ar-email">
            <input id="ar-email" name="email" type="email" defaultValue={valor("email", arbitro?.email)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="activo" defaultChecked={marcado("activo", arbitro?.activo ?? true)} className="w-4 h-4 accent-azul-600" />
          Árbitro activo
        </label>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{arbitro ? "Guardar cambios" : "Crear árbitro"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
