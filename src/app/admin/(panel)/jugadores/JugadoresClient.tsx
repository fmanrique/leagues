"use client";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, ConfirmDeleteModal, Field, inputCls,
  FormError, EmptyState, Badge, TeamBadge, FotoAvatar, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import FotoInput from "@/components/admin/FotoInput";
import { IMAGE_PRESETS } from "@/lib/image-client";
import { edad, nombreCompleto } from "@/lib/format";
import {
  createJugador, updateJugador, deleteJugador, aprobarJugador, rechazarJugador,
  aprobarFoto, rechazarFoto, aprobarCambios, rechazarCambios, bajaJugadorEquipo,
  type ActionState,
} from "./actions";

export interface JugadorRow {
  id: string; equipoId: string;
  nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  fechaNacimiento: string | null;
  estatura: number | null; peso: number | null;
  sexo: string; fotoUrl: string | null; fotoPendienteUrl: string | null;
  cambiosPendientes: Record<string, string | number | null> | null;
  numero: number; posicion: string; activo: boolean; aprobado: boolean;
  equipoNombre: string; equipoColor: string;
}

const CAMPO_LABELS: Record<string, string> = {
  nombre: "Nombre", apellidoPaterno: "Apellido paterno", apellidoMaterno: "Apellido materno",
  fechaNacimiento: "Fecha de nacimiento", numero: "Número", posicion: "Posición",
  estatura: "Estatura (cm)", peso: "Peso (kg)", sexo: "Sexo",
};
const valorCampo = (v: string | number | null | undefined) =>
  v == null || v === "" ? "—" : String(v);

export interface EquipoOption { id: string; nombre: string }

export default function JugadoresClient({ jugadores, equipos, soloEquipo, puedeAprobar, equipoInicial = "", pendientesInicial = false }: {
  jugadores: JugadorRow[]; equipos: EquipoOption[]; soloEquipo: boolean; puedeAprobar: boolean;
  equipoInicial?: string; pendientesInicial?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [equipoFilter, setEquipoFilter] = useState(equipoInicial);
  const [soloPendientes, setSoloPendientes] = useState(pendientesInicial);
  const [modal, setModal] = useState<"create" | JugadorRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JugadorRow | null>(null);
  const [cambiosTarget, setCambiosTarget] = useState<JugadorRow | null>(null);
  const [bajaTarget, setBajaTarget] = useState<JugadorRow | null>(null);

  const pendAltas = useMemo(() => jugadores.filter((j) => !j.aprobado).length, [jugadores]);
  const pendFotos = useMemo(() => jugadores.filter((j) => j.aprobado && j.fotoPendienteUrl).length, [jugadores]);
  const pendCambios = useMemo(() => jugadores.filter((j) => j.aprobado && j.cambiosPendientes).length, [jugadores]);
  const pendientes = pendAltas + pendFotos + pendCambios;

  const filtered = useMemo(
    () =>
      jugadores.filter(
        (j) =>
          nombreCompleto(j).toLowerCase().includes(query.toLowerCase()) &&
          (!equipoFilter || j.equipoId === equipoFilter) &&
          (!soloPendientes || !j.aprobado || Boolean(j.fotoPendienteUrl) || Boolean(j.cambiosPendientes))
      ),
    [jugadores, query, equipoFilter, soloPendientes]
  );
  const pag = usePagination(filtered);

  return (
    <div>
      <PageHeader
        title="Jugadores"
        subtitle={soloEquipo ? `${jugadores.length} jugadores en tu equipo` : `${jugadores.length} jugadores en la liga`}
      >
        <input
          type="search"
          aria-label="Buscar jugador"
          placeholder="Buscar jugador…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-48 bg-white`}
        />
        {!soloEquipo && (
          <select
            value={equipoFilter}
            onChange={(e) => setEquipoFilter(e.target.value)}
            className={`${inputCls} w-44 bg-white`}
            aria-label="Filtrar por equipo"
          >
            <option value="">Todos los equipos</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nombre}</option>
            ))}
          </select>
        )}
        <PrimaryButton onClick={() => setModal("create")}>
          <span className="text-base leading-none">＋</span> Nuevo jugador
        </PrimaryButton>
      </PageHeader>

      {pendientes > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <p className="text-ink-800">
            {[
              pendAltas > 0 && `${pendAltas} jugador${pendAltas === 1 ? "" : "es"}`,
              pendFotos > 0 && `${pendFotos} foto${pendFotos === 1 ? "" : "s"}`,
              pendCambios > 0 && `${pendCambios} cambio${pendCambios === 1 ? "" : "s"} de datos`,
            ].filter(Boolean).join(" y ")}
            {" "}pendiente{pendientes === 1 ? "" : "s"} de aprobación
            {soloEquipo && " por el administrador de la liga"}
          </p>
          <button
            onClick={() => setSoloPendientes((v) => !v)}
            className="font-semibold text-azul-600 hover:text-azul-800 whitespace-nowrap"
          >
            {soloPendientes ? "Ver todos" : "Ver pendientes"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="jugadores" text={query || equipoFilter ? "Sin resultados para la búsqueda" : "Aún no hay jugadores"} />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Jugador</Th>
            <Th>Equipo</Th>
            <Th className="text-center">Número</Th>
            <Th>Posición</Th>
            <Th className="text-center">Edad</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acciones</Th>
          </>}
        >
          {pag.slice.map((j) => {
            const e = edad(j.fechaNacimiento);
            return (
              <tr key={j.id} className="hover:bg-ink-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <FotoAvatar nombre={nombreCompleto(j)} fotoUrl={j.fotoUrl} />
                    <div className="font-semibold text-ink-900">{nombreCompleto(j)}</div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <TeamBadge nombre={j.equipoNombre} color={j.equipoColor} size={24} />
                    <span>{j.equipoNombre}</span>
                  </div>
                </Td>
                <Td className="text-center font-semibold">{j.numero}</Td>
                <Td>{j.posicion || "—"}</Td>
                <Td className="text-center">{e ?? "—"}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    {!j.aprobado
                      ? <Badge tone="ambar">Pendiente</Badge>
                      : j.activo ? <Badge tone="lima">Activo</Badge> : <Badge tone="gris">Inactivo</Badge>}
                    {j.aprobado && j.fotoPendienteUrl && (
                      <Badge tone="ambar">{puedeAprobar ? "Foto por aprobar" : "Foto enviada"}</Badge>
                    )}
                    {j.aprobado && j.cambiosPendientes && (
                      <Badge tone="ambar">{puedeAprobar ? "Cambios por aprobar" : "Cambios enviados"}</Badge>
                    )}
                  </span>
                </Td>
                <Td className="text-right">
                  {!j.aprobado && puedeAprobar ? (
                    <AprobarRechazarBotones id={j.id} nombre={nombreCompleto(j)} />
                  ) : j.aprobado && j.fotoPendienteUrl && puedeAprobar ? (
                    <FotoPendienteBotones id={j.id} fotoPendienteUrl={j.fotoPendienteUrl} />
                  ) : null}
                  {j.aprobado && j.cambiosPendientes && puedeAprobar && (
                    <button
                      onClick={() => setCambiosTarget(j)}
                      className="text-amber-700 hover:text-amber-900 font-semibold text-xs mr-3"
                    >
                      Revisar cambios
                    </button>
                  )}
                  <button
                    onClick={() => setModal(j)}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3"
                  >
                    Editar
                  </button>
                  {/* El capitán no borra jugadores aprobados: los da de baja
                      (se conserva el historial). Eliminar queda para la liga o
                      para que el capitán deshaga su propia alta pendiente */}
                  {soloEquipo && j.aprobado && j.activo && (
                    <button
                      onClick={() => setBajaTarget(j)}
                      className="text-red-500 hover:text-red-700 font-semibold text-xs"
                    >
                      Dar de baja
                    </button>
                  )}
                  {((soloEquipo && !j.aprobado) || (!soloEquipo && j.aprobado)) && (
                    <button
                      onClick={() => setConfirmDelete(j)}
                      className="text-red-500 hover:text-red-700 font-semibold text-xs"
                    >
                      Eliminar
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <JugadorFormModal
          jugador={modal === "create" ? null : modal}
          equipos={equipos}
          modoEquipo={soloEquipo}
          onClose={() => setModal(null)}
        />
      )}

      {cambiosTarget && (
        <CambiosPendientesModal jugador={cambiosTarget} onClose={() => setCambiosTarget(null)} />
      )}

      {bajaTarget && (
        <BajaJugadorModal jugador={bajaTarget} onClose={() => setBajaTarget(null)} />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          open
          onClose={() => setConfirmDelete(null)}
          title="Eliminar jugador"
          action={deleteJugador}
          itemId={confirmDelete.id}
        >
          <p className="text-sm text-ink-700 mb-1">
            ¿Eliminar <strong>{nombreCompleto(confirmDelete)}</strong>?
          </p>
          <p className="text-sm text-red-600 mb-5">
            {confirmDelete.aprobado
              ? "Solo es posible si no tiene goles ni tarjetas capturadas (con historial, mejor desactívalo). Esta acción no se puede deshacer."
              : "El alta pendiente se descartará. Esta acción no se puede deshacer."}
          </p>
        </ConfirmDeleteModal>
      )}
    </div>
  );
}

/** Aprobar/Rechazar un alta pendiente; el error se muestra en línea, no como tooltip. */
function AprobarRechazarBotones({ id, nombre }: { id: string; nombre: string }) {
  const [stateA, aprobar, aprobando] = useActionState<ActionState, FormData>(aprobarJugador, {});
  const [stateR, rechazar, rechazando] = useActionState<ActionState, FormData>(rechazarJugador, {});
  const [confirmar, setConfirmar] = useState(false);
  const error = stateA.error ?? stateR.error;
  return (
    <span className="inline-flex items-center gap-3 mr-3">
      <form action={aprobar} className="inline">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={aprobando || rechazando} className="text-lima-700 hover:text-lima-900 font-semibold text-xs disabled:opacity-50">
          {aprobando ? "Aprobando…" : "Aprobar"}
        </button>
      </form>
      {confirmar ? (
        <form action={rechazar} className="inline" onSubmit={() => setConfirmar(false)}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={aprobando || rechazando} className="text-red-600 hover:text-red-800 font-bold text-xs disabled:opacity-50">
            {rechazando ? "Rechazando…" : `¿Rechazar a ${nombre.split(" ")[0]}?`}
          </button>
        </form>
      ) : (
        <button onClick={() => setConfirmar(true)} className="text-red-500 hover:text-red-700 font-semibold text-xs">
          Rechazar
        </button>
      )}
      {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
    </span>
  );
}

/** Aprobar/Rechazar la foto propuesta por el equipo, con vista previa. */
function FotoPendienteBotones({ id, fotoPendienteUrl }: { id: string; fotoPendienteUrl: string }) {
  const [stateA, aprobar, aprobando] = useActionState<ActionState, FormData>(aprobarFoto, {});
  const [stateR, rechazar, rechazando] = useActionState<ActionState, FormData>(rechazarFoto, {});
  const [confirmar, setConfirmar] = useState(false);
  const error = stateA.error ?? stateR.error;
  return (
    <span className="inline-flex items-center gap-2 mr-3 align-middle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoPendienteUrl}
        alt="Foto propuesta"
        title="Foto propuesta por el equipo"
        className="w-7 h-7 rounded-full object-cover border-2 border-amber-400"
      />
      <form action={aprobar} className="inline">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={aprobando || rechazando} className="text-lima-700 hover:text-lima-900 font-semibold text-xs disabled:opacity-50">
          {aprobando ? "Aprobando…" : "Aprobar foto"}
        </button>
      </form>
      {confirmar ? (
        <form action={rechazar} className="inline" onSubmit={() => setConfirmar(false)}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={aprobando || rechazando} className="text-red-600 hover:text-red-800 font-bold text-xs disabled:opacity-50">
            {rechazando ? "…" : "¿Descartar la foto propuesta?"}
          </button>
        </form>
      ) : (
        <button onClick={() => setConfirmar(true)} disabled={aprobando || rechazando} className="text-red-500 hover:text-red-700 font-semibold text-xs disabled:opacity-50">
          Rechazar foto
        </button>
      )}
      {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
    </span>
  );
}

/** Diff de la propuesta del equipo, con Aprobar/Rechazar para la liga. */
function CambiosPendientesModal({ jugador, onClose }: { jugador: JugadorRow; onClose: () => void }) {
  const [stateA, aprobar, aprobando] = useActionState<ActionState, FormData>(aprobarCambios, {});
  const [stateR, rechazar, rechazando] = useActionState<ActionState, FormData>(rechazarCambios, {});
  useEffect(() => { if (stateA.ok || stateR.ok) onClose(); }, [stateA.ok, stateR.ok, onClose]);
  const cambios = jugador.cambiosPendientes ?? {};

  return (
    <Modal open onClose={onClose} title={`Cambios propuestos: ${nombreCompleto(jugador)}`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-700">
          El equipo <strong>{jugador.equipoNombre}</strong> propone estos cambios. Al aprobarlos
          se vuelven los datos oficiales del jugador.
        </p>
        <div className="rounded-xl border border-ink-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2.5 font-semibold">Campo</th>
                <th className="px-4 py-2.5 font-semibold">Actual</th>
                <th className="px-4 py-2.5 font-semibold">Propuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {Object.entries(cambios).map(([campo, propuesto]) => (
                <tr key={campo}>
                  <td className="px-4 py-2.5 font-semibold text-ink-700">{CAMPO_LABELS[campo] ?? campo}</td>
                  <td className="px-4 py-2.5 text-ink-500 line-through">
                    {valorCampo(jugador[campo as keyof JugadorRow] as string | number | null)}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-ink-900">{valorCampo(propuesto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormError error={stateA.error ?? stateR.error} />
        <div className="flex justify-end gap-2">
          <form action={rechazar}>
            <input type="hidden" name="id" value={jugador.id} />
            <button type="submit" disabled={aprobando || rechazando} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              {rechazando ? "Rechazando…" : "Rechazar"}
            </button>
          </form>
          <form action={aprobar}>
            <input type="hidden" name="id" value={jugador.id} />
            <button type="submit" disabled={aprobando || rechazando} className="rounded-xl bg-azul-600 hover:bg-azul-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {aprobando ? "Aprobando…" : "Aprobar cambios"}
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

/** Baja directa por el capitán: desactiva al jugador conservando su historial. */
function BajaJugadorModal({ jugador, onClose }: { jugador: JugadorRow; onClose: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(bajaJugadorEquipo, {});
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title="Dar de baja al jugador">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={jugador.id} />
        <p className="text-sm text-ink-700">
          ¿Dar de baja a <strong>{nombreCompleto(jugador)}</strong>? Conserva todos sus goles,
          tarjetas e historial, pero deja de aparecer en la página pública y ya no puede
          alinearse en fichas. Para reactivarlo, contacta al administrador de la liga.
        </p>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton pendingLabel="Dando de baja…">Dar de baja</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function JugadorFormModal({ jugador, equipos, modoEquipo, onClose }: {
  jugador: JugadorRow | null; equipos: EquipoOption[]; modoEquipo?: boolean; onClose: () => void;
}) {
  const avisoAprobacion = modoEquipo && !jugador;
  const action = jugador ? updateJugador : createJugador;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, marcado } = useFormDraft(formAction, state.error);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={jugador ? "Editar jugador" : "Nuevo jugador"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {jugador && <input type="hidden" name="id" value={jugador.id} />}
        {avisoAprobacion && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-ink-800">
            El jugador quedará <strong>pendiente de aprobación</strong> por el administrador de la liga
            antes de aparecer en la página pública y en las fichas.
          </p>
        )}
        {modoEquipo && jugador && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-ink-800">
            Los cambios quedarán <strong>pendientes de aprobación</strong> por el administrador de
            la liga antes de aplicarse.
            {jugador.cambiosPendientes && " Ya enviaste cambios: un envío nuevo reemplaza la propuesta anterior."}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Foto del jugador" className="sm:col-span-2">
            <FotoInput
              name="foto"
              currentUrl={(modoEquipo ? jugador?.fotoPendienteUrl : null) ?? jugador?.fotoUrl ?? null}
              forma="circulo"
              preset={IMAGE_PRESETS.foto}
              label="Foto"
              permitirQuitar={!modoEquipo}
            />
          </Field>
          <Field label="Equipo" htmlFor="ju-equipoId" className="sm:col-span-2">
            <select
              id="ju-equipoId"
              name="equipoId"
              required
              defaultValue={valor("equipoId", jugador?.equipoId ?? equipos[0]?.id ?? "")}
              className={inputCls}
            >
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Nombre" htmlFor="ju-nombre">
            <input id="ju-nombre" name="nombre" required defaultValue={valor("nombre", jugador?.nombre)} className={inputCls} />
          </Field>
          <Field label="Apellido paterno" htmlFor="ju-apellidoPaterno">
            <input id="ju-apellidoPaterno" name="apellidoPaterno" defaultValue={valor("apellidoPaterno", jugador?.apellidoPaterno)} className={inputCls} />
          </Field>
          <Field label="Apellido materno" htmlFor="ju-apellidoMaterno">
            <input id="ju-apellidoMaterno" name="apellidoMaterno" defaultValue={valor("apellidoMaterno", jugador?.apellidoMaterno)} className={inputCls} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="ju-fechaNacimiento">
            <input id="ju-fechaNacimiento" name="fechaNacimiento" type="date" defaultValue={valor("fechaNacimiento", jugador?.fechaNacimiento ?? "")} className={inputCls} />
          </Field>
          <Field label="Número" htmlFor="ju-numero">
            <input id="ju-numero" name="numero" type="number" min={0} max={999} required defaultValue={valor("numero", jugador?.numero ?? "")} className={inputCls} />
          </Field>
          <Field label="Posición" htmlFor="ju-posicion">
            <select id="ju-posicion" name="posicion" defaultValue={valor("posicion", jugador?.posicion || "Portero")} className={inputCls}>
              <option value="Portero">Portero</option>
              <option value="Defensa">Defensa</option>
              <option value="Medio">Medio</option>
              <option value="Delantero">Delantero</option>
            </select>
          </Field>
          <Field label="Estatura (cm)" htmlFor="ju-estatura">
            <input id="ju-estatura" name="estatura" type="number" min={50} max={250} defaultValue={valor("estatura", jugador?.estatura ?? "")} className={inputCls} />
          </Field>
          <Field label="Peso (kg)" htmlFor="ju-peso">
            <input id="ju-peso" name="peso" type="number" min={20} max={300} defaultValue={valor("peso", jugador?.peso ?? "")} className={inputCls} />
          </Field>
          <Field label="Sexo" htmlFor="ju-sexo">
            <select id="ju-sexo" name="sexo" defaultValue={valor("sexo", jugador?.sexo || "hombre")} className={inputCls}>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </Field>
        </div>
        {modoEquipo ? (
          // El capitán no maneja el estado activo desde aquí: las altas nacen
          // activas y la baja tiene su propio botón (con aviso a la liga)
          <input type="hidden" name="activo" value="on" />
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="activo" defaultChecked={marcado("activo", jugador?.activo ?? true)} className="w-4 h-4 accent-azul-600" />
            Jugador activo
          </label>
        )}
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton pendingLabel={modoEquipo && jugador ? "Enviando…" : "Guardando…"}>
            {jugador ? (modoEquipo ? "Enviar cambios" : "Guardar cambios") : "Crear jugador"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
