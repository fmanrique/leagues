"use client";
import { plural } from "@/lib/format";
import { useState, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { ROL_USUARIO, type BadgeTone } from "@/lib/labels";
import DesportsField from "@/components/admin/DesportsField";
import {
  updateLiga, createUsuario, resetPassword, toggleUsuarioActivo, type ActionState,
} from "./actions";

export interface Liga {
  id: string; nombre: string; direccion: string; telefono: string; email: string;
  desportsLigaId: string | null;
}

export interface UsuarioRow {
  id: string;
  username: string;
  nombre: string;
  rol: "superadmin" | "admin_liga" | "admin_equipo" | "arbitro";
  activo: boolean;
  asociado: string | null;
}

export interface Opcion { id: string; nombre: string }

/** Tono del badge por rol (el label viene de ROL_USUARIO). */
const rolTone: Record<UsuarioRow["rol"], BadgeTone> = {
  superadmin: "rojo",
  admin_liga: "azul",
  admin_equipo: "lima",
  arbitro: "ambar",
};

export default function ConfiguracionClient({ liga, usuarios, equipos, arbitros, currentUserId }: {
  liga: Liga; usuarios: UsuarioRow[]; equipos: Opcion[]; arbitros: Opcion[]; currentUserId: string;
}) {
  const [crearUsuario, setCrearUsuario] = useState(false);
  const [resetUser, setResetUser] = useState<UsuarioRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<UsuarioRow | null>(null);
  const pag = usePagination(usuarios);

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Datos de la liga" subtitle="Información general que aparece en documentos y página pública" />
        <LigaForm liga={liga} />
      </section>

      <section>
        <PageHeader title="Usuarios" subtitle={`${plural(usuarios.length, "usuario")} de la liga`}>
          <PrimaryButton onClick={() => setCrearUsuario(true)}>
            <span className="text-base leading-none">＋</span> Nuevo usuario
          </PrimaryButton>
        </PageHeader>

        {usuarios.length === 0 ? (
          <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
            <EmptyState icon="configuracion" text="Aún no hay usuarios en la liga" />
          </div>
        ) : (
          <Table
            head={<>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Asociado a</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </>}
          >
            {pag.slice.map((u) => (
              <tr key={u.id} className="hover:bg-ink-50/60 transition-colors">
                <Td>
                  <div className="font-semibold text-ink-900">{u.username}</div>
                  <div className="text-xs text-ink-500">{u.nombre}</div>
                </Td>
                <Td><Badge tone={rolTone[u.rol]}>{ROL_USUARIO[u.rol] ?? u.rol}</Badge></Td>
                <Td>{u.asociado ?? "—"}</Td>
                <Td>{u.activo ? <Badge tone="lima">Activo</Badge> : <Badge tone="gris">Inactivo</Badge>}</Td>
                <Td className="text-right whitespace-nowrap">
                  <button
                    onClick={() => setResetUser(u)}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3"
                  >
                    Resetear password
                  </button>
                  {u.id !== currentUserId && (
                    u.activo ? (
                      <button
                        onClick={() => setConfirmToggle(u)}
                        className="text-red-500 hover:text-red-700 font-semibold text-xs"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <form action={toggleUsuarioActivo} className="inline">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="activo" value="true" />
                        <button type="submit" className="text-lima-800 hover:text-lima-700 font-semibold text-xs">
                          Activar
                        </button>
                      </form>
                    )
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />
      </section>

      {crearUsuario && (
        <UsuarioFormModal equipos={equipos} arbitros={arbitros} onClose={() => setCrearUsuario(false)} />
      )}

      {resetUser && <ResetPasswordModal usuario={resetUser} onClose={() => setResetUser(null)} />}

      {confirmToggle && (
        <Modal open onClose={() => setConfirmToggle(null)} title="Desactivar usuario">
          <p className="text-sm text-ink-700 mb-5">
            ¿Desactivar a <strong>{confirmToggle.username}</strong>? No podrá iniciar sesión hasta que se reactive.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmToggle(null)}
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <form action={toggleUsuarioActivo} onSubmit={() => setConfirmToggle(null)}>
              <input type="hidden" name="id" value={confirmToggle.id} />
              <input type="hidden" name="activo" value="false" />
              <button type="submit" className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-bold text-white">
                Desactivar
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LigaForm({ liga }: { liga: Liga }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateLiga, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form key={formKey} action={enviar} className="bg-white rounded-xl border border-ink-200 shadow-sm p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre" htmlFor="lg-nombre" className="sm:col-span-2">
          <input id="lg-nombre" name="nombre" required defaultValue={valor("nombre", liga.nombre)} className={inputCls} />
        </Field>
        <Field label="Dirección" htmlFor="lg-direccion" className="sm:col-span-2">
          <input id="lg-direccion" name="direccion" defaultValue={valor("direccion", liga.direccion)} className={inputCls} />
        </Field>
        <Field label="Teléfono" htmlFor="lg-telefono">
          <input id="lg-telefono" name="telefono" defaultValue={valor("telefono", liga.telefono)} className={inputCls} />
        </Field>
        <Field label="Email" htmlFor="lg-email">
          <input id="lg-email" name="email" type="email" defaultValue={valor("email", liga.email)} className={inputCls} />
        </Field>
        <DesportsField
          key={formKey}
          defaultId={valor("desportsLigaId", liga.desportsLigaId ?? "")}
          ligaId={liga.id}
        />
      </div>
      <FormError error={state.error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-semibold text-lima-800">✓ Guardado</span>}
        <SubmitButton>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}

function UsuarioFormModal({ equipos, arbitros, onClose }: {
  equipos: Opcion[]; arbitros: Opcion[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUsuario, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);
  const [rol, setRol] = useState<"admin_liga" | "admin_equipo" | "arbitro">("admin_liga");

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="Nuevo usuario">
      <form key={formKey} action={enviar} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Usuario" htmlFor="us-username">
            <input id="us-username" name="username" required minLength={3} maxLength={64} autoComplete="off" defaultValue={valor("username", "")} className={inputCls} />
          </Field>
          <Field label="Nombre" htmlFor="us-nombre">
            <input id="us-nombre" name="nombre" required defaultValue={valor("nombre", "")} className={inputCls} />
          </Field>
          <Field label="Contraseña" htmlFor="us-password">
            <input id="us-password" name="password" type="password" required minLength={8} autoComplete="new-password" defaultValue={valor("password", "")} className={inputCls} />
          </Field>
          <Field label="Rol" htmlFor="us-rol">
            <select
              id="us-rol"
              name="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as typeof rol)}
              className={inputCls}
            >
              <option value="admin_liga">{ROL_USUARIO.admin_liga}</option>
              <option value="admin_equipo">{ROL_USUARIO.admin_equipo}</option>
              <option value="arbitro">{ROL_USUARIO.arbitro}</option>
            </select>
          </Field>
          {rol === "admin_equipo" && (
            <Field label="Equipo" htmlFor="us-equipo" className="sm:col-span-2">
              <select id="us-equipo" name="equipoId" required defaultValue={valor("equipoId", "")} className={inputCls}>
                <option value="" disabled>Selecciona equipo…</option>
                {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          )}
          {rol === "arbitro" && (
            <Field label="Árbitro" htmlFor="us-arbitro" className="sm:col-span-2">
              <select id="us-arbitro" name="arbitroId" required defaultValue={valor("arbitroId", "")} className={inputCls}>
                <option value="" disabled>Selecciona árbitro…</option>
                {arbitros.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          )}
        </div>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Crear usuario</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ usuario, onClose }: { usuario: UsuarioRow; onClose: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(resetPassword, {});
  const { enviar, formKey, valor } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="Resetear password">
      <p className="text-sm text-ink-500 mb-4">
        Nueva contraseña para <strong className="text-ink-900">{usuario.username}</strong> ({usuario.nombre}).
      </p>
      <form key={formKey} action={enviar} className="space-y-4">
        <input type="hidden" name="id" value={usuario.id} />
        <Field label="Nueva contraseña" htmlFor="rp-password">
          <input id="rp-password" name="password" type="password" required minLength={8} autoComplete="new-password" defaultValue={valor("password", "")} className={inputCls} />
        </Field>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Guardar contraseña</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
