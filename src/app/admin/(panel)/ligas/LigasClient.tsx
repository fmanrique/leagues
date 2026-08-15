"use client";
import { plural } from "@/lib/format";
import { useState, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import DesportsField from "@/components/admin/DesportsField";
import { createLiga, updateLiga, type ActionState } from "./actions";

export interface LigaRow {
  id: string;
  nombre: string;
  slug: string;
  direccion: string;
  telefono: string;
  email: string;
  desportsLigaId: string | null;
  activo: boolean;
  equipos: number;
  torneos: number;
}

export default function LigasClient({ ligas }: { ligas: LigaRow[] }) {
  const [modal, setModal] = useState<"create" | LigaRow | null>(null);
  const pag = usePagination(ligas);

  return (
    <div>
      <PageHeader title="Ligas" subtitle={`${plural(ligas.length, "liga")} en la plataforma`}>
        <PrimaryButton onClick={() => setModal("create")}>
          <span className="text-base leading-none">＋</span> Nueva liga
        </PrimaryButton>
      </PageHeader>

      {ligas.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="ligas" text="Aún no hay ligas registradas" />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Liga</Th>
            <Th>Slug</Th>
            <Th className="text-center">Equipos</Th>
            <Th className="text-center">Torneos</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </>}
        >
          {pag.slice.map((l) => (
            <tr key={l.id} className="hover:bg-ink-50/60 transition-colors">
              <Td>
                <a
                  href={`/${l.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Abrir sitio público de ${l.nombre}`}
                  className="group inline-flex items-center gap-1.5 font-semibold text-ink-900 hover:text-azul-600 transition-colors"
                >
                  {l.nombre}
                  <span aria-hidden className="text-ink-300 group-hover:text-azul-600 text-xs transition-colors">↗</span>
                </a>
                <div className="text-xs text-ink-500">{l.email || "—"}</div>
              </Td>
              <Td><code className="text-xs bg-ink-100 rounded px-1.5 py-0.5">{l.slug}</code></Td>
              <Td className="text-center font-semibold">{l.equipos}</Td>
              <Td className="text-center font-semibold">{l.torneos}</Td>
              <Td>{l.activo ? <Badge tone="lima">Activa</Badge> : <Badge tone="gris">Inactiva</Badge>}</Td>
              <Td className="text-right">
                <button
                  onClick={() => setModal(l)}
                  className="text-azul-600 hover:text-azul-800 font-semibold text-xs"
                >
                  Editar
                </button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <LigaFormModal liga={modal === "create" ? null : modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function LigaFormModal({ liga, onClose }: { liga: LigaRow | null; onClose: () => void }) {
  const action = liga ? updateLiga : createLiga;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, marcado } = useFormDraft(formAction, state.error);
  const [crearAdmin, setCrearAdmin] = useState(false);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={liga ? "Editar liga" : "Nueva liga"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {liga && <input type="hidden" name="id" value={liga.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre" htmlFor="lg-nombre">
            <input id="lg-nombre" name="nombre" required defaultValue={valor("nombre", liga?.nombre)} className={inputCls} />
          </Field>
          <Field label="Slug (URL pública)" htmlFor="lg-slug">
            <input
              id="lg-slug"
              name="slug"
              required
              pattern="[a-z0-9\-]{3,64}"
              title="3–64 caracteres: minúsculas, números y guiones"
              defaultValue={valor("slug", liga?.slug)}
              className={inputCls}
              placeholder="mi-liga"
            />
          </Field>
          <Field label="Dirección" htmlFor="lg-direccion" className="sm:col-span-2">
            <input id="lg-direccion" name="direccion" defaultValue={valor("direccion", liga?.direccion)} className={inputCls} />
          </Field>
          <Field label="Teléfono" htmlFor="lg-telefono">
            <input id="lg-telefono" name="telefono" defaultValue={valor("telefono", liga?.telefono)} className={inputCls} />
          </Field>
          <Field label="Email" htmlFor="lg-email">
            <input id="lg-email" name="email" type="email" defaultValue={valor("email", liga?.email)} className={inputCls} />
          </Field>
          <DesportsField
            key={formKey}
            defaultId={valor("desportsLigaId", liga?.desportsLigaId ?? "")}
            ligaId={liga?.id}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="activo" defaultChecked={marcado("activo", liga?.activo ?? true)} className="w-4 h-4 accent-azul-600" />
          Liga activa
        </label>

        {!liga && (
          <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4 space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <input
                type="checkbox"
                name="crearAdmin"
                checked={crearAdmin}
                onChange={(e) => setCrearAdmin(e.target.checked)}
                className="w-4 h-4 accent-azul-600"
              />
              Crear administrador de la liga
            </label>
            {crearAdmin && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Usuario" htmlFor="lg-adminUsername">
                  <input id="lg-adminUsername" name="adminUsername" required minLength={3} maxLength={64} autoComplete="off" defaultValue={valor("adminUsername", "")} className={inputCls} />
                </Field>
                <Field label="Nombre" htmlFor="lg-adminNombre">
                  <input id="lg-adminNombre" name="adminNombre" required defaultValue={valor("adminNombre", "")} className={inputCls} />
                </Field>
                <Field label="Contraseña" htmlFor="lg-adminPassword">
                  <input id="lg-adminPassword" name="adminPassword" type="password" required minLength={8} autoComplete="new-password" defaultValue={valor("adminPassword", "")} className={inputCls} />
                </Field>
              </div>
            )}
          </div>
        )}

        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{liga ? "Guardar cambios" : "Crear liga"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
