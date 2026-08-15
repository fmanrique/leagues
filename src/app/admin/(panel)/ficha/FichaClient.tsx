"use client";
import { useState, useMemo, useActionState, useEffect } from "react";
import {
  PageHeader, SubmitButton, Modal, Field, inputCls, FormError, EmptyState, Badge, TeamBadge,
  usePagination, Pagination,
} from "@/components/admin/ui";
import { fmtFechaCorta, fmtFechaHora } from "@/lib/format";
import { guardarFicha, type ActionState } from "./actions";

interface EquipoMini { id: string; nombre: string; colorLocal: string }
// Como viene de la base: un renglón por gol (minuto quedó en desuso)
interface GolInput { jugadorId: string; equipoId: string; minuto: number }
// Como se captura: un renglón por jugador con su cantidad de goles
interface GolCaptura { jugadorId: string; equipoId: string; cantidad: number }
interface TarjetaInput { jugadorId: string; equipoId: string; minuto: number; tipo: "amarilla" | "roja" }

/** Agrupa los goles guardados (renglón por gol) en capturas por jugador. */
function agruparGoles(goles: GolInput[]): GolCaptura[] {
  const mapa = new Map<string, GolCaptura>();
  for (const g of goles) {
    const clave = `${g.equipoId}|${g.jugadorId}`;
    const previo = mapa.get(clave);
    if (previo) previo.cantidad++;
    else mapa.set(clave, { jugadorId: g.jugadorId, equipoId: g.equipoId, cantidad: 1 });
  }
  return [...mapa.values()];
}
export interface PartidoFicha {
  id: string; torneo: string; jornada: number; fecha: string; hora: string;
  estado: string; golesLocal: number | null; golesVisitante: number | null;
  fichaCompletada: boolean; fichaFechaCaptura: string | null; observaciones: string;
  local: EquipoMini; visitante: EquipoMini;
  goles: GolInput[]; tarjetas: TarjetaInput[];
}
export interface JugadorOpcion { id: string; equipoId: string; nombre: string }

export default function FichaClient({ partidos, jugadores }: {
  partidos: PartidoFicha[]; jugadores: JugadorOpcion[];
}) {
  // Fecha local del navegador (suficiente para distinguir "por jugar")
  const hoy = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [filtro, setFiltro] = useState<"pendientes" | "completadas" | "todos">("pendientes");
  const [torneoFiltro, setTorneoFiltro] = useState("");
  const [jornadaFiltro, setJornadaFiltro] = useState("");
  const [target, setTarget] = useState<PartidoFicha | null>(null);
  const [ver, setVer] = useState<PartidoFicha | null>(null);

  const torneos = useMemo(() => [...new Set(partidos.map((p) => p.torneo))].sort(), [partidos]);
  const jornadas = useMemo(() => {
    const base = torneoFiltro ? partidos.filter((p) => p.torneo === torneoFiltro) : partidos;
    return [...new Set(base.map((p) => p.jornada))].sort((a, b) => a - b);
  }, [partidos, torneoFiltro]);

  const visibles = useMemo(() => partidos.filter((p) => {
    if (filtro !== "todos" && (filtro === "pendientes" ? p.fichaCompletada : !p.fichaCompletada)) return false;
    if (torneoFiltro && p.torneo !== torneoFiltro) return false;
    if (jornadaFiltro && p.jornada !== Number(jornadaFiltro)) return false;
    return true;
  }), [partidos, filtro, torneoFiltro, jornadaFiltro]);
  const pag = usePagination(visibles);

  return (
    <div>
      <PageHeader title="Ficha Arbitral" subtitle="Captura de resultados, goles y tarjetas">
        <select
          value={torneoFiltro}
          onChange={(e) => { setTorneoFiltro(e.target.value); setJornadaFiltro(""); }}
          aria-label="Filtrar por torneo"
          className={`${inputCls} w-52 bg-white`}
        >
          <option value="">Todos los torneos</option>
          {torneos.map((tn) => <option key={tn} value={tn}>{tn}</option>)}
        </select>
        <select
          value={jornadaFiltro}
          onChange={(e) => setJornadaFiltro(e.target.value)}
          aria-label="Filtrar por jornada"
          className={`${inputCls} w-44 bg-white`}
        >
          <option value="">Todas las jornadas</option>
          {jornadas.map((j) => <option key={j} value={j}>Jornada {j}</option>)}
        </select>
        <div className="flex rounded-xl border border-ink-200 bg-white p-1">
          {([["pendientes", "Pendientes"], ["completadas", "Completadas"], ["todos", "Todos"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filtro === v ? "bg-azul-600 text-white" : "text-ink-600 hover:text-azul-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      {visibles.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="ficha" text={filtro === "pendientes" ? "No hay fichas pendientes" : "Sin partidos"} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {pag.slice.map((p) => (
            <article key={p.id} className="bg-white rounded-xl border border-ink-200 shadow-sm p-4">
              <div className="flex items-center justify-between text-xs text-ink-500 mb-3">
                <span>{p.torneo} · J{p.jornada} · {fmtFechaCorta(p.fecha)} {p.hora}</span>
                {/* "Por jugar" (fecha futura) no es lo mismo que una ficha atrasada */}
                {p.fichaCompletada
                  ? <Badge tone="lima">Completada</Badge>
                  : p.estado === "suspendido"
                  ? <Badge tone="gris">Suspendido</Badge>
                  : p.fecha > hoy
                  ? <Badge tone="azul">Por jugar</Badge>
                  : <Badge tone="ambar">Pendiente</Badge>}
              </div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <TeamBadge nombre={p.local.nombre} color={p.local.colorLocal} />
                  <span className="text-sm font-semibold text-ink-900 truncate">{p.local.nombre}</span>
                </span>
                {p.fichaCompletada ? (
                  <span className="font-bold text-ink-900">{p.golesLocal} - {p.golesVisitante}</span>
                ) : (
                  <span className="text-ink-400 text-sm">vs</span>
                )}
                <span className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                  <span className="text-sm font-semibold text-ink-900 truncate">{p.visitante.nombre}</span>
                  <TeamBadge nombre={p.visitante.nombre} color={p.visitante.colorLocal} />
                </span>
              </div>
              <div className="flex gap-2">
                {p.fichaCompletada && (
                  <button
                    onClick={() => setVer(p)}
                    className="flex-1 rounded-xl border-2 border-azul-600 py-2 text-sm font-bold text-azul-600 hover:bg-azul-600 hover:text-white transition"
                  >
                    Ver ficha
                  </button>
                )}
                <button
                  onClick={() => setTarget(p)}
                  className="flex-1 rounded-xl bg-azul-600 hover:bg-azul-700 py-2 text-sm font-bold text-white transition"
                >
                  {p.fichaCompletada ? "Editar ficha" : "Capturar ficha"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total} onPage={pag.setPage} pageSize={pag.pageSize} onPageSize={pag.setPageSize} />

      {target && (
        <FichaModal
          partido={target}
          jugadores={jugadores}
          onClose={() => setTarget(null)}
        />
      )}

      {ver && (
        <FichaVista
          partido={ver}
          jugadores={jugadores}
          onClose={() => setVer(null)}
          onEditar={() => { setTarget(ver); setVer(null); }}
        />
      )}
    </div>
  );
}

/** Vista de solo lectura de una ficha completada. */
function FichaVista({ partido, jugadores, onClose, onEditar }: {
  partido: PartidoFicha; jugadores: JugadorOpcion[]; onClose: () => void; onEditar: () => void;
}) {
  const nombreDe = (id: string) => jugadores.find((j) => j.id === id)?.nombre ?? "Jugador dado de baja";
  const equipoDe = (id: string) =>
    id === partido.local.id ? partido.local : partido.visitante;
  const golesAgrupados = agruparGoles(partido.goles).sort((a, b) => b.cantidad - a.cantidad);
  const totalGoles = partido.goles.length;
  const tarjetasOrdenadas = [...partido.tarjetas].sort((a, b) => a.minuto - b.minuto);

  return (
    <Modal open onClose={onClose} title={`Ficha arbitral · Jornada ${partido.jornada}`} wide>
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-4 bg-ink-50 rounded-xl py-4">
          <span className="flex items-center gap-2">
            <TeamBadge nombre={partido.local.nombre} color={partido.local.colorLocal} />
            <span className="text-sm font-semibold">{partido.local.nombre}</span>
          </span>
          <span className="brand-title text-3xl text-ink-900">{partido.golesLocal} - {partido.golesVisitante}</span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">{partido.visitante.nombre}</span>
            <TeamBadge nombre={partido.visitante.nombre} color={partido.visitante.colorLocal} />
          </span>
        </div>
        <p className="text-xs text-ink-500 text-center -mt-2">
          {partido.torneo} · {fmtFechaCorta(partido.fecha)} {partido.hora}
          {partido.fichaFechaCaptura && <> · Capturada el {fmtFechaHora(partido.fichaFechaCaptura)}</>}
        </p>

        <section>
          <h4 className="text-sm font-bold text-ink-900 mb-2">⚽ Goles ({totalGoles})</h4>
          {golesAgrupados.length === 0 ? (
            <p className="text-sm text-ink-400">Sin goles</p>
          ) : (
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
              {golesAgrupados.map((g, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-12 text-xs font-bold text-ink-700">⚽ ×{g.cantidad}</span>
                  <TeamBadge nombre={equipoDe(g.equipoId).nombre} color={equipoDe(g.equipoId).colorLocal} size={22} />
                  <span className="font-semibold text-ink-900">{nombreDe(g.jugadorId)}</span>
                  <span className="text-xs text-ink-500 ml-auto">{equipoDe(g.equipoId).nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-sm font-bold text-ink-900 mb-2">Tarjetas ({tarjetasOrdenadas.length})</h4>
          {tarjetasOrdenadas.length === 0 ? (
            <p className="text-sm text-ink-400">Sin tarjetas</p>
          ) : (
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
              {tarjetasOrdenadas.map((c, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-12 text-xs font-bold text-ink-500">{c.minuto}&apos;</span>
                  <span>{c.tipo === "roja" ? "🟥" : "🟨"}</span>
                  <TeamBadge nombre={equipoDe(c.equipoId).nombre} color={equipoDe(c.equipoId).colorLocal} size={22} />
                  <span className="font-semibold text-ink-900">{nombreDe(c.jugadorId)}</span>
                  <span className="text-xs text-ink-500 ml-auto">{equipoDe(c.equipoId).nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {partido.observaciones && (
          <section>
            <h4 className="text-sm font-bold text-ink-900 mb-2">Observaciones</h4>
            <p className="text-sm text-ink-700 bg-ink-50 rounded-xl px-4 py-3">{partido.observaciones}</p>
          </section>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cerrar
          </button>
          <button onClick={onEditar} className="rounded-xl bg-azul-600 hover:bg-azul-700 px-4 py-2.5 text-sm font-bold text-white">
            Editar ficha
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FichaModal({ partido, jugadores, onClose }: {
  partido: PartidoFicha; jugadores: JugadorOpcion[]; onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(guardarFicha, {});
  const [goles, setGoles] = useState<GolCaptura[]>(() => agruparGoles(partido.goles));
  const [tarjetas, setTarjetas] = useState<TarjetaInput[]>(partido.tarjetas);
  // Un triunfo por default se reconoce por sus observaciones (fichas nuevas,
  // que sí traen goles) o por marcador sin goles capturados (fichas viejas):
  // se pre-marca para que re-editar no lo pierda
  const fueDefault = partido.fichaCompletada && (
    partido.observaciones.startsWith("Partido ganado por default") ||
    (partido.goles.length === 0 && ((partido.golesLocal ?? 0) > 0 || (partido.golesVisitante ?? 0) > 0))
  );
  const [porDefault, setPorDefault] = useState<"" | "local" | "visitante">(
    fueDefault ? ((partido.golesLocal ?? 0) > (partido.golesVisitante ?? 0) ? "local" : "visitante") : ""
  );
  // El prefijo "Partido ganado por default…" lo agrega el servidor: se quita
  // del textarea para no duplicarlo al re-guardar
  const [observaciones, setObservaciones] = useState(
    partido.observaciones.replace(/^Partido ganado por default \([0-9-]+\)\.\s*/, "")
  );
  useEffect(() => { if (state.ok) onClose(); }, [state.ok, onClose]);

  const equipos = [partido.local, partido.visitante];
  const jugadoresDe = (equipoId: string) => jugadores.filter((j) => j.equipoId === equipoId);
  const suma = (equipoId: string) =>
    goles.filter((g) => g.equipoId === equipoId).reduce((acc, g) => acc + (g.cantidad || 0), 0);
  const marcador = porDefault
    ? { local: porDefault === "local" ? 2 : 0, visitante: porDefault === "visitante" ? 2 : 0 }
    : { local: suma(partido.local.id), visitante: suma(partido.visitante.id) };
  const ganadorId = porDefault === "local" ? partido.local.id
    : porDefault === "visitante" ? partido.visitante.id : null;

  // Al activar el default (o cambiar de ganador), los goles se reinician al
  // equipo ganador: un renglón con los 2 goles, editable (se puede partir en 2)
  const elegirDefault = (lado: "" | "local" | "visitante") => {
    setPorDefault(lado);
    if (lado) {
      const id = lado === "local" ? partido.local.id : partido.visitante.id;
      setGoles((prev) => {
        const delGanador = prev.filter((g) => g.equipoId === id);
        return delGanador.length ? delGanador : [{ jugadorId: "", equipoId: id, cantidad: 2 }];
      });
    }
  };

  const payload = JSON.stringify({
    partidoId: partido.id,
    goles,
    tarjetas: porDefault ? [] : tarjetas,
    observaciones,
    porDefault: porDefault || null,
  });

  const setGol = (i: number, patch: Partial<GolCaptura>) =>
    setGoles((prev) => prev.map((g, idx) => {
      if (idx !== i) return g;
      const next = { ...g, ...patch };
      // Cambió de equipo → resetea jugador
      if (patch.equipoId && patch.equipoId !== g.equipoId) next.jugadorId = "";
      return next;
    }));
  const setTarjeta = (i: number, patch: Partial<TarjetaInput>) =>
    setTarjetas((prev) => prev.map((c, idx) => {
      if (idx !== i) return c;
      const next = { ...c, ...patch };
      if (patch.equipoId && patch.equipoId !== c.equipoId) next.jugadorId = "";
      return next;
    }));

  const golesValidos = goles.every((g) => g.jugadorId && g.cantidad >= 1);
  const filasValidas = porDefault !== ""
    ? golesValidos && ganadorId !== null && suma(ganadorId) === 2 &&
      goles.every((g) => g.equipoId === ganadorId)
    : golesValidos && tarjetas.every((c) => c.jugadorId);

  return (
    <Modal open onClose={onClose} title={`Ficha: ${partido.local.nombre} vs ${partido.visitante.nombre}`} wide>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="payload" value={payload} />

        <div className="flex items-center justify-center gap-4 bg-ink-50 rounded-xl py-3">
          <span className="flex items-center gap-2">
            <TeamBadge nombre={partido.local.nombre} color={partido.local.colorLocal} />
            <span className="text-sm font-semibold">{partido.local.nombre}</span>
          </span>
          <span className="brand-title text-2xl text-ink-900">{marcador.local} - {marcador.visitante}</span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">{partido.visitante.nombre}</span>
            <TeamBadge nombre={partido.visitante.nombre} color={partido.visitante.colorLocal} />
          </span>
        </div>

        {/* Retiro / no presentación: triunfo por default sin goleadores */}
        <div className="rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input
              type="checkbox"
              checked={porDefault !== ""}
              onChange={(e) => elegirDefault(e.target.checked ? "local" : "")}
              className="w-4 h-4 accent-azul-600"
            />
            Partido ganado por default (el rival no se presentó o se retiró)
          </label>
          {porDefault !== "" && (
            <div className="flex flex-wrap items-center gap-4 pl-6">
              <span className="text-sm text-ink-600">Ganador:</span>
              {(["local", "visitante"] as const).map((lado) => (
                <label key={lado} className="flex items-center gap-1.5 text-sm text-ink-800">
                  <input
                    type="radio"
                    name="pd-ganador"
                    checked={porDefault === lado}
                    onChange={() => elegirDefault(lado)}
                    className="w-4 h-4 accent-azul-600"
                  />
                  {lado === "local" ? partido.local.nombre : partido.visitante.nombre}
                </label>
              ))}
              <span className="text-xs text-ink-500 basis-full pl-0">
                El marcador por regla queda <strong>2-0</strong>. Captura abajo los 2 goles del
                ganador: del mismo jugador o de dos jugadores distintos. No se capturan tarjetas.
              </span>
            </div>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-ink-900">⚽ Goles</h4>
            <button
              type="button"
              onClick={() => setGoles((g) => [...g, { jugadorId: "", equipoId: ganadorId ?? partido.local.id, cantidad: 1 }])}
              className="text-xs font-bold text-azul-600 hover:text-azul-800"
            >
              ＋ Agregar goleador
            </button>
          </div>
          <p className="text-xs text-ink-500 mb-2">
            {porDefault
              ? `Captura los 2 goles por default del ganador (${ganadorId === partido.local.id ? partido.local.nombre : partido.visitante.nombre}): un renglón con 2, o dos renglones con 1.`
              : "Un renglón por jugador que anotó, con cuántos goles metió. El marcador se suma solo."}
          </p>
          {goles.length > 0 && (
            <div className="grid grid-cols-[1fr_1.4fr_110px_32px] gap-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              <span>Equipo</span>
              <span>Jugador que anotó</span>
              <span>No. de goles</span>
              <span />
            </div>
          )}
          <div className="space-y-2">
            {goles.map((g, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_110px_32px] gap-2 items-center">
                <select
                  value={g.equipoId}
                  onChange={(e) => setGol(i, { equipoId: e.target.value })}
                  disabled={porDefault !== ""}
                  aria-label="Equipo del goleador"
                  className={`${inputCls} disabled:opacity-60`}
                >
                  {(porDefault ? equipos.filter((eq) => eq.id === ganadorId) : equipos)
                    .map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
                <select value={g.jugadorId} onChange={(e) => setGol(i, { jugadorId: e.target.value })} aria-label="Jugador que anotó" className={inputCls}>
                  <option value="">Elegir jugador…</option>
                  {jugadoresDe(g.equipoId).map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
                <input
                  type="number" min={1} max={30} value={g.cantidad} aria-label="Número de goles"
                  onChange={(e) => setGol(i, { cantidad: Number(e.target.value) })}
                  className={inputCls}
                />
                <button type="button" onClick={() => setGoles((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Quitar goleador" className="text-red-500 hover:text-red-700 font-bold">
                  ✕
                </button>
              </div>
            ))}
            {goles.length === 0 && <p className="text-xs text-ink-400">Sin goles capturados (marcador 0-0)</p>}
          </div>
        </section>

        {porDefault === "" && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-ink-900">🟨 Tarjetas</h4>
            <button
              type="button"
              onClick={() => setTarjetas((c) => [...c, { jugadorId: "", equipoId: partido.local.id, tipo: "amarilla", minuto: 0 }])}
              className="text-xs font-bold text-azul-600 hover:text-azul-800"
            >
              ＋ Agregar tarjeta
            </button>
          </div>
          <p className="text-xs text-ink-500 mb-2">Un renglón por cada tarjeta mostrada.</p>
          {tarjetas.length > 0 && (
            <div className="grid grid-cols-[1fr_1.4fr_110px_70px_32px] gap-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              <span>Equipo</span>
              <span>Jugador amonestado</span>
              <span>Tipo</span>
              <span>Minuto</span>
              <span />
            </div>
          )}
          <div className="space-y-2">
            {tarjetas.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_110px_70px_32px] gap-2 items-center">
                <select value={c.equipoId} onChange={(e) => setTarjeta(i, { equipoId: e.target.value })} aria-label="Equipo del amonestado" className={inputCls}>
                  {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
                <select value={c.jugadorId} onChange={(e) => setTarjeta(i, { jugadorId: e.target.value })} aria-label="Jugador amonestado" className={inputCls}>
                  <option value="">Elegir jugador…</option>
                  {jugadoresDe(c.equipoId).map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
                <select value={c.tipo} onChange={(e) => setTarjeta(i, { tipo: e.target.value as "amarilla" | "roja" })} aria-label="Tipo de tarjeta" className={inputCls}>
                  <option value="amarilla">🟨 Amarilla</option>
                  <option value="roja">🟥 Roja</option>
                </select>
                <input
                  type="number" min={0} max={150} value={c.minuto} aria-label="Minuto de la tarjeta" placeholder="Min."
                  onChange={(e) => setTarjeta(i, { minuto: Number(e.target.value) })}
                  className={inputCls}
                />
                <button type="button" onClick={() => setTarjetas((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Quitar tarjeta" className="text-red-500 hover:text-red-700 font-bold">
                  ✕
                </button>
              </div>
            ))}
            {tarjetas.length === 0 && <p className="text-xs text-ink-400">Sin tarjetas</p>}
          </div>
        </section>
        )}

        <Field label="Observaciones" htmlFor="fi-obs">
          <textarea
            id="fi-obs" rows={3} value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputCls}
            placeholder="Incidencias del partido…"
          />
        </Field>

        <FormError error={state.error} />
        <p className="text-xs text-ink-500">
          Al guardar, el partido se marca como <strong>finalizado</strong> con marcador {marcador.local}-{marcador.visitante}.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Cancelar
          </button>
          {filasValidas
            ? <SubmitButton>Guardar ficha</SubmitButton>
            : <span className="text-xs text-amber-700 self-center">
                {porDefault
                  ? "Captura exactamente los 2 goles del ganador (con jugador elegido)"
                  : "Completa el jugador de cada fila"}
              </span>}
        </div>
      </form>
    </Modal>
  );
}
