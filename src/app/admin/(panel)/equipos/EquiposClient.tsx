"use client";
import { plural } from "@/lib/format";
import Link from "next/link";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, TeamBadge, Table, Th, Td,
  usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import FotoInput from "@/components/admin/FotoInput";
import { IMAGE_PRESETS } from "@/lib/image-client";
import { RAMA } from "@/lib/labels";
import { createEquipo, updateEquipo, type ActionState } from "./actions";

export interface EquipoRow {
  id: string; nombre: string; logoUrl: string | null;
  colorLocal: string; colorVisitante: string;
  rama: "varonil" | "femenil" | "mixto";
  categoriaAnioMin: number | null; categoriaAnioMax: number | null; categoriaLibre: boolean;
  entrenador: string; telefono: string; email: string; activo: boolean;
  horarioFijo: string | null; horarioFijoMonto: string | null;
  horariosDisponibles: string[];
  jugadores: number;
  porAprobar: number;
}

function categoria(e: EquipoRow) {
  if (e.categoriaLibre) return "Libre";
  if (e.categoriaAnioMin && e.categoriaAnioMax) return `${e.categoriaAnioMin}–${e.categoriaAnioMax}`;
  return "—";
}

export default function EquiposClient({ equipos, canEdit }: { equipos: EquipoRow[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | EquipoRow | null>(null);

  const filtered = useMemo(
    () => equipos.filter((e) => e.nombre.toLowerCase().includes(query.toLowerCase())),
    [equipos, query]
  );
  const pag = usePagination(filtered);

  return (
    <div>
      <PageHeader title="Equipos" subtitle={`${plural(equipos.length, "equipo")} en la liga`}>
        <input
          type="search"
          aria-label="Buscar equipo"
          placeholder="Buscar equipo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} w-48 bg-white`}
        />
        {canEdit && (
          <PrimaryButton onClick={() => setModal("create")}>
            <span className="text-base leading-none">＋</span> Nuevo equipo
          </PrimaryButton>
        )}
      </PageHeader>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="equipos" text={query ? "Sin resultados para la búsqueda" : "Aún no hay equipos"} />
        </div>
      ) : (
        <Table
          head={<>
            <Th>Equipo</Th>
            <Th>Rama</Th>
            <Th>Categoría</Th>
            <Th>Entrenador</Th>
            <Th className="text-center">Jugadores</Th>
            <Th>Estado</Th>
            {canEdit && <Th className="text-right">Acciones</Th>}
          </>}
        >
          {pag.slice.map((e) => (
            <tr key={e.id} className="hover:bg-ink-50/60 transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  <TeamBadge nombre={e.nombre} color={e.colorLocal} size={32} logoUrl={e.logoUrl} />
                  <div>
                    <div className="font-semibold text-ink-900">{e.nombre}</div>
                    <div className="text-xs text-ink-500">{e.email || "—"}</div>
                  </div>
                </div>
              </Td>
              <Td>{RAMA[e.rama] ?? e.rama}</Td>
              <Td>{categoria(e)}</Td>
              <Td>{e.entrenador || "—"}</Td>
              <Td className="text-center font-semibold">
                {e.jugadores}
                {canEdit && e.porAprobar > 0 && (
                  <a
                    href={`/admin/jugadores?equipo=${e.id}&pendientes=1`}
                    title={`${e.porAprobar} pendiente(s) de aprobación en este equipo`}
                    className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 whitespace-nowrap"
                  >
                    {e.porAprobar} por aprobar
                  </a>
                )}
              </Td>
              <Td>{e.activo ? <Badge tone="lima">Activo</Badge> : <Badge tone="gris">Inactivo</Badge>}</Td>
              {canEdit && (
                <Td className="text-right">
                  <Link
                    href={`/admin/jugadores?equipo=${e.id}`}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs mr-3"
                  >
                    Jugadores
                  </Link>
                  {/* Los equipos no se eliminan (su historial es de la liga):
                      un equipo que se va se desactiva desde Editar */}
                  <button
                    onClick={() => setModal(e)}
                    className="text-azul-600 hover:text-azul-800 font-semibold text-xs"
                  >
                    Editar
                  </button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <EquipoFormModal
          equipo={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function EquipoFormModal({ equipo, onClose }: { equipo: EquipoRow | null; onClose: () => void }) {
  const action = equipo ? updateEquipo : createEquipo;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, marcado } = useFormDraft(formAction, state.error);
  const [libre, setLibre] = useState(equipo?.categoriaLibre ?? true);
  const [conHorarioFijo, setConHorarioFijo] = useState(!!equipo?.horarioFijo);

  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={equipo ? "Editar equipo" : "Nuevo equipo"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {equipo && <input type="hidden" name="id" value={equipo.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Logo del equipo" className="sm:col-span-2">
            <FotoInput name="logo" currentUrl={equipo?.logoUrl ?? null} forma="cuadro" preset={IMAGE_PRESETS.logo} label="Logo" />
          </Field>
          <Field label="Nombre" htmlFor="eq-nombre" className="sm:col-span-2">
            <input id="eq-nombre" name="nombre" required defaultValue={valor("nombre", equipo?.nombre)} className={inputCls} />
          </Field>
          <Field label="Color local" htmlFor="eq-colorLocal">
            <input id="eq-colorLocal" name="colorLocal" type="color" defaultValue={valor("colorLocal", equipo?.colorLocal ?? "#024BCD")} className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 p-1" />
          </Field>
          <Field label="Color visitante" htmlFor="eq-colorVisitante">
            <input id="eq-colorVisitante" name="colorVisitante" type="color" defaultValue={valor("colorVisitante", equipo?.colorVisitante ?? "#FFFFFF")} className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 p-1" />
          </Field>
          <Field label="Rama" htmlFor="eq-rama">
            <select id="eq-rama" name="rama" defaultValue={valor("rama", equipo?.rama ?? "varonil")} className={inputCls}>
              {Object.entries(RAMA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Categoría" htmlFor="eq-categoriaLibre">
            <label className="flex items-center gap-2 h-11 text-sm text-ink-700">
              <input
                id="eq-categoriaLibre"
                type="checkbox"
                name="categoriaLibre"
                checked={libre}
                onChange={(e) => setLibre(e.target.checked)}
                className="w-4 h-4 accent-azul-600"
              />
              Libre (sin límite de edad)
            </label>
          </Field>
          {!libre && (
            <>
              <Field label="Año nacimiento mín." htmlFor="eq-anioMin">
                <input id="eq-anioMin" name="categoriaAnioMin" type="number" min={1900} max={2100} defaultValue={valor("categoriaAnioMin", equipo?.categoriaAnioMin ?? "")} className={inputCls} />
              </Field>
              <Field label="Año nacimiento máx." htmlFor="eq-anioMax">
                <input id="eq-anioMax" name="categoriaAnioMax" type="number" min={1900} max={2100} defaultValue={valor("categoriaAnioMax", equipo?.categoriaAnioMax ?? "")} className={inputCls} />
              </Field>
            </>
          )}
          <Field label="Entrenador" htmlFor="eq-entrenador">
            <input id="eq-entrenador" name="entrenador" defaultValue={valor("entrenador", equipo?.entrenador)} className={inputCls} />
          </Field>
          <Field label="Teléfono" htmlFor="eq-telefono">
            <input id="eq-telefono" name="telefono" defaultValue={valor("telefono", equipo?.telefono)} className={inputCls} />
          </Field>
          <Field label="Email" htmlFor="eq-email" className="sm:col-span-2">
            <input id="eq-email" name="email" type="email" defaultValue={valor("email", equipo?.email)} className={inputCls} />
          </Field>
          <Field label="Horario fijo (pagado)" htmlFor="eq-horarioFijoOn" className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                id="eq-horarioFijoOn"
                type="checkbox"
                name="horarioFijoOn"
                checked={conHorarioFijo}
                onChange={(e) => setConHorarioFijo(e.target.checked)}
                className="w-4 h-4 accent-azul-600"
              />
              El equipo paga por jugar siempre a la misma hora
            </label>
          </Field>
          {conHorarioFijo && (
            <>
              <Field label="Hora fija" htmlFor="eq-horarioFijo">
                {(() => {
                  const disponibles = equipo?.horariosDisponibles ?? [];
                  const actual = valor("horarioFijo", equipo?.horarioFijo ?? "");
                  const opciones = [...new Set([...disponibles, ...(actual ? [actual] : [])])].sort();
                  return (
                    <>
                      <select
                        id="eq-horarioFijo"
                        name="horarioFijo"
                        defaultValue={actual}
                        disabled={opciones.length === 0}
                        className={`${inputCls} disabled:opacity-60`}
                      >
                        <option value="">Por definir</option>
                        {opciones.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <p className="text-xs text-ink-400 mt-1.5">
                        {opciones.length
                          ? "Solo horarios de los torneos donde está inscrito; el rol le da prioridad de turno."
                          : "Primero inscribe al equipo a un torneo; luego regresa aquí a elegir su hora entre los horarios del torneo."}
                      </p>
                    </>
                  );
                })()}
              </Field>
              <Field label="Monto (MXN)" htmlFor="eq-horarioFijoMonto">
                <input
                  id="eq-horarioFijoMonto" name="horarioFijoMonto" type="number" min={0} step="0.01"
                  defaultValue={valor("horarioFijoMonto", equipo?.horarioFijoMonto ?? "")} className={inputCls}
                />
                <p className="text-xs text-ink-400 mt-1.5">
                  Genera un pago pendiente al inscribir al equipo en un torneo; la hora puede
                  definirse después.
                </p>
              </Field>
            </>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="activo" defaultChecked={marcado("activo", equipo?.activo ?? true)} className="w-4 h-4 accent-azul-600" />
          Equipo activo
        </label>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{equipo ? "Guardar cambios" : "Crear equipo"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
