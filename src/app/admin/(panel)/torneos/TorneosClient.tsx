"use client";
import { useState, useActionState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader, PrimaryButton, SubmitButton, Modal, Field, inputCls,
  FormError, EmptyState, Badge, usePagination, Pagination, useFormDraft,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { fmtFechaMedia, fmtMXN , plural} from "@/lib/format";
import { ESTADO_TORNEO, RAMA, TIPO_FUTBOL, estadoInfo } from "@/lib/labels";
import {
  createTorneo, updateTorneo, deleteTorneo, generarCalendarioTorneo, type ActionState,
} from "./actions";

export interface TorneoRow {
  id: string; nombre: string;
  rama: "varonil" | "femenil" | "mixto";
  categoriaAnioMin: number | null; categoriaAnioMax: number | null; categoriaLibre: boolean;
  tipoFutbol: string; formato: string; partidosPorEquipo: number | null; fechaInicio: string;
  diasJuego: string[]; horarios: string[];
  horariosPorCancha: Record<string, Record<string, string[]>> | null;
  duracionPartido: number; descansoEntrePartidos: number;
  costoInscripcion: string; costoArbitraje: string;
  estado: "configuracion" | "inscripciones" | "en_curso" | "finalizado" | "cancelado";
  equipoIds: string[]; canchaIds: string[]; arbitroIds: string[];
  partidos: number;
}
interface Opcion {
  id: string; nombre: string; colorLocal?: string;
  horarioFijo?: string | null; horarioFijoMonto?: string | null;
}
export interface SlotOcupado {
  torneoId: string; torneoNombre: string; dia: string; canchaId: string; hora: string;
}

const DIAS: { value: string; label: string }[] = [
  { value: "lunes", label: "Lun" }, { value: "martes", label: "Mar" },
  { value: "miercoles", label: "Mié" }, { value: "jueves", label: "Jue" },
  { value: "viernes", label: "Vie" }, { value: "sabado", label: "Sáb" },
  { value: "domingo", label: "Dom" },
];

export interface DesportsInfo {
  dias: { dia: string; horarios: string[] }[];
}

export default function TorneosClient({ torneos, equipos, canchas, arbitros, canEdit, esSuper = false, desports, ocupados }: {
  torneos: TorneoRow[]; equipos: Opcion[]; canchas: Opcion[]; arbitros: Opcion[]; canEdit: boolean;
  esSuper?: boolean;
  desports: DesportsInfo | null;
  ocupados: SlotOcupado[];
}) {
  const [modal, setModal] = useState<"create" | TorneoRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TorneoRow | null>(null);
  const [genTarget, setGenTarget] = useState<TorneoRow | null>(null);
  const pag = usePagination(torneos);

  return (
    <div>
      <PageHeader title="Torneos" subtitle={plural(torneos.length, "torneo")}>
        {canEdit && (
          <PrimaryButton onClick={() => setModal("create")}>
            <span className="text-base leading-none">＋</span> Nuevo torneo
          </PrimaryButton>
        )}
      </PageHeader>

      {torneos.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="torneos" text="Aún no hay torneos" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pag.slice.map((tr) => {
            const info = estadoInfo(ESTADO_TORNEO, tr.estado);
            return (
              <article key={tr.id} className="bg-white rounded-xl border border-ink-200 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="brand-title text-lg text-ink-900">{tr.nombre}</h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {TIPO_FUTBOL[tr.tipoFutbol] ?? tr.tipoFutbol} · {tr.partidosPorEquipo
                        ? plural(tr.partidosPorEquipo, "fecha") + " por equipo"
                        : tr.formato === "ida" ? "Solo ida" : "Ida y vuelta"} · desde {fmtFechaMedia(tr.fechaInicio)}
                    </p>
                  </div>
                  <Badge tone={info.tone}>{info.label}</Badge>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-ink-50 rounded-lg py-2">
                    <dt className="text-[11px] text-ink-500">Equipos</dt>
                    <dd className="font-bold text-ink-900">{tr.equipoIds.length}</dd>
                  </div>
                  <div className="bg-ink-50 rounded-lg py-2">
                    <dt className="text-[11px] text-ink-500">Partidos</dt>
                    <dd className="font-bold text-ink-900">{tr.partidos}</dd>
                  </div>
                  <div className="bg-ink-50 rounded-lg py-2">
                    <dt className="text-[11px] text-ink-500">Inscripción</dt>
                    <dd className="font-bold text-ink-900">{fmtMXN(tr.costoInscripcion)}</dd>
                  </div>
                </dl>

                {canEdit && (
                  ["finalizado", "cancelado"].includes(tr.estado) && !esSuper ? (
                    <p className="pt-1 border-t border-ink-100 text-xs text-ink-400">
                      Torneo {tr.estado === "finalizado" ? "finalizado" : "cancelado"}: es parte del
                      historial. Para modificarlo, contacta a DE/SPORTS.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 pt-1 border-t border-ink-100">
                      {!["finalizado", "cancelado"].includes(tr.estado) && (
                        <button onClick={() => setGenTarget(tr)} className="inline-flex items-center gap-1.5 text-xs font-bold text-azul-600 hover:text-azul-800">
                          <Icon name="calendario" className="w-4 h-4" /> Generar calendario
                        </button>
                      )}
                      <span className="flex-1" />
                      {tr.partidos > 0 && !["finalizado", "cancelado"].includes(tr.estado) && (
                        <Link href={`/admin/torneos/${tr.id}/ajuste`} className="text-xs font-semibold text-azul-600 hover:text-azul-800">
                          Ajustes
                        </Link>
                      )}
                      <button onClick={() => setModal(tr)} className="text-xs font-semibold text-azul-600 hover:text-azul-800">Editar</button>
                      <button onClick={() => setConfirmDelete(tr)} className="text-xs font-semibold text-red-500 hover:text-red-700">Eliminar</button>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {modal && (
        <TorneoFormModal
          torneo={modal === "create" ? null : modal}
          equipos={equipos}
          canchas={canchas}
          arbitros={arbitros}
          desports={desports}
          ocupados={ocupados}
          onClose={() => setModal(null)}
        />
      )}

      {genTarget && <GenerarModal torneo={genTarget} equipos={equipos} onClose={() => setGenTarget(null)} />}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Eliminar torneo">
          <p className="text-sm text-ink-700 mb-1">¿Eliminar <strong>{confirmDelete.nombre}</strong>?</p>
          <p className="text-sm text-red-600 mb-5">
            Se eliminarán sus {confirmDelete.partidos} partidos, fichas, pagos y reclamos asociados. No se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
              Cancelar
            </button>
            <form action={deleteTorneo} onSubmit={() => setConfirmDelete(null)}>
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

function GenerarModal({ torneo, equipos, onClose }: {
  torneo: TorneoRow; equipos: Opcion[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(generarCalendarioTorneo, {});
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  // Equipos con horario fijo pagado que aún no pueden respetarse en el rol:
  // sin hora elegida, o con una hora que este torneo no tiene
  const horasTorneo = useMemo(() => new Set(
    torneo.horariosPorCancha
      ? Object.values(torneo.horariosPorCancha).flatMap((porCancha) => Object.values(porCancha).flat())
      : torneo.horarios
  ), [torneo]);
  const fijosPendientes = useMemo(() => equipos.filter((e) =>
    torneo.equipoIds.includes(e.id) &&
    Number(e.horarioFijoMonto) > 0 &&
    (!e.horarioFijo || !horasTorneo.has(e.horarioFijo))
  ), [equipos, torneo.equipoIds, horasTorneo]);

  return (
    <Modal open onClose={onClose} title="Generar calendario">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={torneo.id} />
        {fijosPendientes.length > 0 && (
          <div className="text-sm text-ink-800 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 space-y-2">
            <p className="font-bold text-amber-800">
              ⚠ {fijosPendientes.length === 1
                ? `${fijosPendientes[0].nombre} pagó horario fijo y aún no tiene su hora establecida`
                : `Hay equipos que pagaron horario fijo sin su hora establecida: ${fijosPendientes.map((e) => e.nombre).join(", ")}`}
              {fijosPendientes.some((e) => e.horarioFijo) && " (o su hora no existe en este torneo)"}.
            </p>
            <p>Si generas ahora, el rol no les dará su horario. Para establecerlo:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Ve al menú <strong>Equipos</strong>.</li>
              <li>Selecciona el equipo y da clic en <strong>Editar</strong>.</li>
              <li>En <strong>Hora fija</strong>, elige una de los horarios disponibles del torneo.</li>
              <li>Guarda y regresa aquí a <strong>generar el calendario</strong>.</li>
            </ol>
          </div>
        )}
        <p className="text-sm text-ink-700">
          Se generará el rol completo ({torneo.partidosPorEquipo
            ? `${plural(torneo.partidosPorEquipo, "fecha")} garantizadas por equipo`
            : `todos contra todos, ${torneo.formato === "ida" ? "solo ida" : "ida y vuelta"}`}) para{" "}
          <strong>{torneo.equipoIds.length} equipos</strong> a partir del {fmtFechaMedia(torneo.fechaInicio)}.
          El torneo pasará a <strong>En curso</strong> y será visible en la página pública.
        </p>
        {torneo.partidosPorEquipo != null && torneo.equipoIds.length > 2 &&
          torneo.partidosPorEquipo > torneo.equipoIds.length - 1 && (
          <p className="text-sm text-ink-500">
            Las fechas exceden el todos-contra-todos ({torneo.equipoIds.length - 1}): habrá cruces
            repetidos, balanceados automáticamente — ningún par se enfrentará más de{" "}
            {Math.ceil(torneo.partidosPorEquipo / (torneo.equipoIds.length - 1))} veces.
          </p>
        )}
        {torneo.partidos > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            Este torneo ya tiene {torneo.partidos} partidos programados: serán reemplazados y se
            perderán las reprogramaciones manuales (fechas, árbitros y URLs de video).
            Si algún partido ya tiene resultado o está en curso, la regeneración se rechazará
            para proteger la tabla y las fichas.
          </p>
        )}
        <FormError error={state.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>Generar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function CheckGrid({ name, options, defaults, onSelectionChange, filtrable = false }: {
  name: string; options: Opcion[]; defaults: string[];
  onSelectionChange?: (ids: string[]) => void;
  filtrable?: boolean;
}) {
  const [sel, setSel] = useState<string[]>(defaults.filter((d) => options.some((o) => o.id === d)));
  const [filtro, setFiltro] = useState("");
  const q = filtro.trim().toLowerCase();
  // Los que no coinciden se ocultan con CSS (no se desmontan): así los ya
  // palomeados siguen enviándose con el form aunque el filtro no los muestre
  const coincide = (o: Opcion) => !q || o.nombre.toLowerCase().includes(q);
  const visibles = options.filter(coincide);
  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...sel, id] : sel.filter((x) => x !== id);
    setSel(next);
    onSelectionChange?.(next);
  };
  // "Seleccionar todo" opera sobre lo visible: con filtro activo marca (o
  // desmarca) solo las coincidencias, sin tocar lo demás ya seleccionado
  const todasVisibles = visibles.length > 0 && visibles.every((o) => sel.includes(o.id));
  const toggleTodo = () => {
    const ids = visibles.map((o) => o.id);
    const next = todasVisibles
      ? sel.filter((x) => !ids.includes(x))
      : [...new Set([...sel, ...ids])];
    setSel(next);
    onSelectionChange?.(next);
  };
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {filtrable && options.length > 0 && (
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="Filtrar por nombre…"
            aria-label="Filtrar la lista"
            className={`${inputCls} flex-1`}
          />
        )}
        {options.length > 0 && (
          <button
            type="button"
            onClick={toggleTodo}
            className="ml-auto shrink-0 text-xs font-semibold text-azul-600 hover:text-azul-800 whitespace-nowrap"
          >
            {todasVisibles ? "Quitar todo" : "Seleccionar todo"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-44 overflow-y-auto rounded-xl border border-ink-200 bg-ink-50 p-3">
        {options.map((o) => (
          <label key={o.id} className={`flex items-center gap-2 text-sm text-ink-700 ${coincide(o) ? "" : "hidden"}`}>
            <input
              type="checkbox"
              name={name}
              value={o.id}
              checked={sel.includes(o.id)}
              onChange={(e) => toggle(o.id, e.target.checked)}
              className="w-4 h-4 accent-azul-600"
            />
            <span className="truncate">{o.nombre}</span>
          </label>
        ))}
        {options.length === 0 && <p className="text-xs text-ink-400 col-span-full">No hay registros activos</p>}
        {options.length > 0 && visibles.length === 0 && (
          <p className="text-xs text-ink-400 col-span-full">Nada coincide con “{filtro}”</p>
        )}
      </div>
      {filtrable && q && sel.length > 0 && (
        <p className="text-xs text-ink-400 mt-1.5">
          {plural(sel.length, "seleccionado")} en total (el filtro no des-selecciona).
        </p>
      )}
    </div>
  );
}

/**
 * Franjas de cámara de UN día (liga conectada a DE/SPORTS): cada día elige
 * entre sus propias franjas — el rol solo programa donde sí se graba ese día.
 */
/**
 * Franjas de cámara de UNA cancha en UN día (liga conectada a DE/SPORTS).
 * Las horas reservadas por otro torneo vigente salen deshabilitadas, con el
 * nombre del torneo que las ocupa; "Seleccionar todo" marca solo las libres.
 */
function HorariosSlotDesports({ name, etiqueta, franjas, defaults, ocupadas }: {
  name: string; etiqueta: string; franjas: string[]; defaults: string[];
  ocupadas: Map<string, string>; // hora → nombre del torneo que la reserva
}) {
  const libres = franjas.filter((h) => !ocupadas.has(h));
  const [sel, setSel] = useState<string[]>(defaults.filter((h) => libres.includes(h)));
  const todas = libres.length > 0 && sel.length === libres.length;
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{etiqueta}</p>
        {libres.length > 0 && (
          <button
            type="button"
            onClick={() => setSel(todas ? [] : [...libres])}
            className="text-xs font-semibold text-azul-600 hover:text-azul-800"
          >
            {todas ? "Quitar todo" : "Seleccionar todo"}
          </button>
        )}
      </div>
      {franjas.length === 0 ? (
        <p className="text-sm text-ink-400">Este día no tiene franjas de cámara.</p>
      ) : libres.length === 0 ? (
        <p className="text-sm text-ink-400">
          Todas las franjas de este día en esta cancha están reservadas por otros torneos.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2 max-h-32 overflow-y-auto">
          {franjas.map((h) => {
            const dueno = ocupadas.get(h);
            return (
              <label
                key={h}
                title={dueno ? `Reservado por “${dueno}”` : undefined}
                className={`flex items-center gap-1.5 text-sm ${dueno ? "text-ink-300 cursor-not-allowed" : "text-ink-700"}`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={h}
                  disabled={!!dueno}
                  checked={!dueno && sel.includes(h)}
                  onChange={(e) =>
                    setSel((prev) => e.target.checked ? [...prev, h] : prev.filter((x) => x !== h))
                  }
                  className="w-4 h-4 accent-azul-600 disabled:opacity-40"
                />
                <span className={`font-mono ${dueno ? "line-through" : ""}`}>{h}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Editor libre de horarios de UNA cancha en UN día, con aviso de ocupados. */
function HorariosSlotInput({ name, etiqueta, defaults, ocupadas }: {
  name: string; etiqueta: string; defaults: string[];
  ocupadas: Map<string, string>; // hora → nombre del torneo que la reserva
}) {
  const [horas, setHoras] = useState<string[]>(defaults.length ? defaults : ["10:00"]);
  const conflicto = horas.find((h) => ocupadas.has(h));
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-2">
        {horas.map((h, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white pl-2.5 pr-1.5 py-1.5">
            <input
              type="time"
              name={name}
              required
              value={h}
              onChange={(e) => setHoras((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`Horario ${i + 1} (${etiqueta})`}
              className="bg-transparent text-sm text-ink-900 outline-none"
            />
            {horas.length > 1 && (
              <button
                type="button"
                aria-label={`Quitar horario ${i + 1} (${etiqueta})`}
                onClick={() => setHoras((prev) => prev.filter((_, j) => j !== i))}
                className="w-6 h-6 rounded-lg text-ink-400 hover:text-red-600 hover:bg-red-50 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setHoras((prev) => [...prev, ""])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-azul-400 px-3 py-2 text-sm font-semibold text-azul-600 hover:bg-azul-600/5"
        >
          <span className="text-base leading-none">＋</span> Agregar horario
        </button>
      </div>
      {conflicto && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          Las {conflicto} ya están reservadas aquí por “{ocupadas.get(conflicto)}”; elige otra hora.
        </p>
      )}
    </div>
  );
}

function TorneoFormModal({ torneo, equipos, canchas, arbitros, desports, ocupados, onClose }: {
  torneo: TorneoRow | null; equipos: Opcion[]; canchas: Opcion[]; arbitros: Opcion[];
  desports: DesportsInfo | null; ocupados: SlotOcupado[]; onClose: () => void;
}) {
  const action = torneo ? updateTorneo : createTorneo;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const { enviar, formKey, valor, valores } = useFormDraft(formAction, state.error);
  const [libre, setLibre] = useState(torneo?.categoriaLibre ?? true);
  // Fechas garantizadas: se autollenan con el natural (equipos − 1) según los
  // equipos marcados; si el admin escribe un valor, ese manda
  const [numEquipos, setNumEquipos] = useState(
    valores("equipos", torneo?.equipoIds ?? []).length
  );
  // Canchas primero: los horarios se eligen por (día, cancha)
  const [canchasSel, setCanchasSel] = useState<string[]>(
    valores("canchas", torneo?.canchaIds ?? [])
  );
  // Slots reservados por OTROS torneos: `${dia}|${canchaId}` → (hora → torneo)
  const ocupadasDe = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    for (const o of ocupados) {
      if (torneo && o.torneoId === torneo.id) continue;
      const k = `${o.dia}|${o.canchaId}`;
      if (!m.has(k)) m.set(k, new Map());
      m.get(k)!.set(o.hora, o.torneoNombre);
    }
    return m;
  }, [ocupados, torneo]);
  const VACIO = useMemo(() => new Map<string, string>(), []);
  const [fechasManual, setFechasManual] = useState<string | null>(() => {
    const v = valor("partidosPorEquipo", torneo?.partidosPorEquipo ?? null);
    return v === "" ? null : v;
  });
  const natural = numEquipos >= 2 ? numEquipos - 1 : null;
  const fechas = fechasManual ?? (natural != null ? String(natural) : "");
  const fechasNum = Number(fechas) || 0;
  // Con DE/SPORTS conectado, los horarios disponibles dependen de los días marcados
  const diasDisponibles = desports?.dias.map((d) => d.dia) ?? null;
  const [diasSel, setDiasSel] = useState<string[]>(() => {
    const base = valores("diasJuego", torneo?.diasJuego ?? ["sabado", "domingo"]);
    return diasDisponibles ? base.filter((d) => diasDisponibles.includes(d)) : base;
  });
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={torneo ? "Editar torneo" : "Nuevo torneo"} wide>
      <form key={formKey} action={enviar} className="space-y-4">
        {torneo && <input type="hidden" name="id" value={torneo.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre" htmlFor="to-nombre" className="sm:col-span-2">
            <input id="to-nombre" name="nombre" required defaultValue={valor("nombre", torneo?.nombre)} className={inputCls} />
          </Field>
          <Field label="Rama" htmlFor="to-rama">
            <select id="to-rama" name="rama" defaultValue={valor("rama", torneo?.rama ?? "varonil")} className={inputCls}>
              {Object.entries(RAMA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Tipo de fútbol" htmlFor="to-tipo">
            <select id="to-tipo" name="tipoFutbol" defaultValue={valor("tipoFutbol", torneo?.tipoFutbol ?? "futbol_11")} className={inputCls}>
              {Object.entries(TIPO_FUTBOL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <input type="hidden" name="formato" value={torneo?.formato ?? "ida"} />
          <Field label="Fecha de inicio" htmlFor="to-inicio">
            <input id="to-inicio" name="fechaInicio" type="date" required defaultValue={valor("fechaInicio", torneo?.fechaInicio)} className={inputCls} />
          </Field>
          <Field label="Categoría" htmlFor="to-libre">
            <label className="flex items-center gap-2 h-11 text-sm text-ink-700">
              <input id="to-libre" type="checkbox" name="categoriaLibre" checked={libre} onChange={(e) => setLibre(e.target.checked)} className="w-4 h-4 accent-azul-600" />
              Libre (sin límite de edad)
            </label>
          </Field>
          {!libre ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Año nac. mín." htmlFor="to-anioMin">
                <input id="to-anioMin" name="categoriaAnioMin" type="number" min={1900} max={2100} defaultValue={valor("categoriaAnioMin", torneo?.categoriaAnioMin ?? "")} className={inputCls} />
              </Field>
              <Field label="Año nac. máx." htmlFor="to-anioMax">
                <input id="to-anioMax" name="categoriaAnioMax" type="number" min={1900} max={2100} defaultValue={valor("categoriaAnioMax", torneo?.categoriaAnioMax ?? "")} className={inputCls} />
              </Field>
            </div>
          ) : <div className="hidden sm:block" />}
          <Field label={`Canchas a jugar (${canchas.length} disponibles)`} htmlFor="to-canchas" className="sm:col-span-2">
            <CheckGrid
              name="canchas"
              options={canchas}
              defaults={valores("canchas", torneo?.canchaIds ?? [])}
              onSelectionChange={setCanchasSel}
            />
            <p className="text-xs text-ink-400 mt-1.5">
              Marca primero las canchas: los horarios se eligen por cancha y por día.
            </p>
          </Field>
          <Field label="Días de juego" htmlFor="to-dias" className="sm:col-span-2">
            <div className="flex flex-wrap gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
              {(desports ? DIAS.filter((d) => diasDisponibles!.includes(d.value)) : DIAS).map((d) => (
                <label key={d.value} className="flex items-center gap-1.5 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    name="diasJuego"
                    value={d.value}
                    checked={diasSel.includes(d.value)}
                    onChange={(e) =>
                      setDiasSel((prev) => e.target.checked ? [...prev, d.value] : prev.filter((x) => x !== d.value))
                    }
                    className="w-4 h-4 accent-azul-600"
                  />
                  {d.label}
                </label>
              ))}
            </div>
            {desports && (
              <p className="text-xs text-ink-400 mt-1.5">Días con cámara en la plataforma DE/SPORTS.</p>
            )}
          </Field>
          <Field label="Horarios por cancha y día" htmlFor="to-horarios" className="sm:col-span-2">
            {canchasSel.length === 0 ? (
              <p className="text-sm text-ink-400 rounded-xl border border-ink-200 bg-ink-50 p-3">
                Marca primero las canchas a jugar.
              </p>
            ) : diasSel.length === 0 ? (
              <p className="text-sm text-ink-400 rounded-xl border border-ink-200 bg-ink-50 p-3">
                Marca los días de juego; después eliges los horarios de cada cancha en cada día.
              </p>
            ) : (
              <div className="space-y-3">
                {DIAS.filter((d) => diasSel.includes(d.value)).map((d) =>
                  canchas.filter((c) => canchasSel.includes(c.id)).map((c) => {
                    const name = `horarios__${d.value}__${c.id}`;
                    const defaults = valores(
                      name,
                      torneo?.horariosPorCancha?.[d.value]?.[c.id]
                        ?? (torneo && !torneo.horariosPorCancha ? torneo.horarios : [])
                    );
                    const ocupadas = ocupadasDe.get(`${d.value}|${c.id}`) ?? VACIO;
                    const etiqueta = `${d.label} · ${c.nombre}`;
                    return desports ? (
                      <HorariosSlotDesports
                        key={name}
                        name={name}
                        etiqueta={etiqueta}
                        franjas={desports.dias.find((x) => x.dia === d.value)?.horarios ?? []}
                        defaults={defaults}
                        ocupadas={ocupadas}
                      />
                    ) : (
                      <HorariosSlotInput key={name} name={name} etiqueta={etiqueta} defaults={defaults} ocupadas={ocupadas} />
                    );
                  })
                )}
              </div>
            )}
            <p className="text-xs text-ink-400 mt-1.5">
              {desports
                ? "Cada bloque muestra las franjas de cámara de ese día; las tachadas ya están reservadas por otro torneo (el mismo horario en otra cancha sí se puede)."
                : "Los horarios reservados por otros torneos en la misma cancha y día no se pueden repetir. Conecta el ID de DE/SPORTS en Configuración para elegir franjas de cámara."}
            </p>
          </Field>
          <Field label="Duración (min)" htmlFor="to-duracion">
            <input id="to-duracion" name="duracionPartido" type="number" min={20} max={150} defaultValue={valor("duracionPartido", torneo?.duracionPartido ?? 90)} className={inputCls} />
          </Field>
          <Field label="Descanso entre partidos (min)" htmlFor="to-descanso">
            <input id="to-descanso" name="descansoEntrePartidos" type="number" min={0} max={120} defaultValue={valor("descansoEntrePartidos", torneo?.descansoEntrePartidos ?? 30)} className={inputCls} />
          </Field>
          <Field label="Costo inscripción ($)" htmlFor="to-inscripcion">
            <input id="to-inscripcion" name="costoInscripcion" type="number" min={0} step="0.01" defaultValue={valor("costoInscripcion", torneo ? Number(torneo.costoInscripcion) : 0)} className={inputCls} />
          </Field>
          <Field label="Costo arbitraje por partido ($)" htmlFor="to-arbitraje">
            <input id="to-arbitraje" name="costoArbitraje" type="number" min={0} step="0.01" defaultValue={valor("costoArbitraje", torneo ? Number(torneo.costoArbitraje) : 0)} className={inputCls} />
          </Field>
          {torneo && (
            <Field label="Estado" htmlFor="to-estado" className="sm:col-span-2">
              <select id="to-estado" name="estado" defaultValue={valor("estado", torneo.estado)} className={inputCls}>
                {Object.entries(ESTADO_TORNEO)
                  // "Inscripciones" no tiene efecto en el sistema: solo se
                  // conserva como opción si el torneo ya la tiene
                  .filter(([value]) => value !== "inscripciones" || torneo.estado === "inscripciones")
                  .map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
              </select>
              <p className="text-xs text-ink-400 mt-1">
                &ldquo;En curso&rdquo; y &ldquo;Finalizado&rdquo; son visibles en el sitio público. Al generar el calendario pasa a &ldquo;En curso&rdquo; automáticamente.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Ojo: al guardar como Finalizado o Cancelado, el torneo pasa al historial y solo
                DE/SPORTS podrá modificarlo después.
              </p>
            </Field>
          )}
          <Field label={`Equipos participantes (${equipos.length} disponibles)`} htmlFor="to-equipos" className="sm:col-span-2">
            <CheckGrid
              name="equipos"
              options={equipos}
              defaults={valores("equipos", torneo?.equipoIds ?? [])}
              onSelectionChange={(ids) => setNumEquipos(ids.length)}
              filtrable
            />
          </Field>
          {natural != null && (
            <Field label="Partidos por equipo (fechas garantizadas)" htmlFor="to-fechas" className="sm:col-span-2">
              <input
                id="to-fechas"
                name="partidosPorEquipo"
                type="number"
                required
                min={natural}
                max={200}
                value={fechas}
                onChange={(e) => setFechasManual(e.target.value === "" ? null : e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-ink-400 mt-1.5">
                {fechasNum > natural
                  ? `Excede el todos-contra-todos (${natural}): habrá cruces repetidos, balanceados ` +
                    `automáticamente — ningún par se enfrentará más de ${Math.ceil(fechasNum / natural)} veces.`
                  : `Mínimo ${natural} con ${numEquipos} equipos (todos contra todos); puedes aumentarlo para garantizar más fechas.`}
              </p>
            </Field>
          )}
          <Field label={`Árbitros (${arbitros.length} disponibles)`} htmlFor="to-arbitros" className="sm:col-span-2">
            <CheckGrid name="arbitros" options={arbitros} defaults={valores("arbitros", torneo?.arbitroIds ?? [])} filtrable />
          </Field>
        </div>
        <FormError error={state.error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          <SubmitButton>{torneo ? "Guardar cambios" : "Crear torneo"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
