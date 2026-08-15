"use client";
import { useActionState, useState, startTransition } from "react";
import { Field, inputCls } from "@/components/admin/ui";
import { comprobarDesports, type ComprobarState } from "@/app/admin/(panel)/ligas/desports-actions";

/**
 * Campo "ID de liga DE/SPORTS" con comprobación en vivo contra el API de la
 * plataforma de videos: al comprobar muestra los días/horarios de cámara y la
 * propuesta de empate de canchas (asignar / crear / conflicto con decisión).
 * Las decisiones viajan en el mismo form como `desportsDecision:<cancha>`.
 */
export default function DesportsField({ defaultId, ligaId }: {
  defaultId: string;
  ligaId?: string; // liga a empatar (edición); en creación no hay canchas aún
}) {
  const [id, setId] = useState(defaultId);
  const [state, comprobar, comprobando] = useActionState<ComprobarState, FormData>(comprobarDesports, {});

  const lanzarComprobacion = () => {
    const fd = new FormData();
    fd.set("desportsLigaId", id);
    if (ligaId) fd.set("ligaId", ligaId);
    // El dispatch de useActionState debe correr dentro de una transición
    // (fuera de un <form action>): sin esto isPending no se actualiza
    startTransition(() => comprobar(fd));
  };

  return (
    <div className="sm:col-span-2 space-y-3">
      <Field label="ID de liga DE/SPORTS (videos)" htmlFor="lg-desports">
        <div className="flex gap-2">
          <input
            id="lg-desports"
            name="desportsLigaId"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="67d2edc75289102e84964179"
            autoComplete="off"
            className={`${inputCls} font-mono`}
          />
          <button
            type="button"
            onClick={lanzarComprobacion}
            disabled={comprobando || !id.trim()}
            className="flex-shrink-0 rounded-xl border border-azul-600 px-4 py-2.5 text-sm font-bold text-azul-600 hover:bg-azul-600 hover:text-white transition-colors disabled:opacity-50"
          >
            {comprobando ? "Comprobando…" : "Comprobar"}
          </button>
        </div>
      </Field>
      <p className="text-xs text-ink-400 -mt-1">
        Con el ID conectado, los torneos <strong>solo</strong> pueden usar días y horarios con cámara,
        y los resultados enlazan al video del partido. Si la plataforma agrega canchas u horarios
        nuevos, vuelve a guardar aquí para sincronizarlos.
      </p>
      {defaultId && !id.trim() && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          Vas a desconectar la liga de DE/SPORTS: al guardar se pierden los links
          &ldquo;Revive tu partido&rdquo; del sitio público y los torneos vuelven a capturar
          horarios libremente.
        </p>
      )}

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{state.error}</p>
      )}

      {state.ok && (
        <div className="rounded-xl border border-lima-500/50 bg-lima-500/10 p-4 space-y-3 text-sm">
          <p className="font-bold text-ink-900">✓ Liga encontrada en DE/SPORTS</p>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">Días con cámara</p>
            <div className="flex flex-wrap gap-1.5">
              {state.dias!.map((d) => (
                <span key={d.dia} className="rounded-lg bg-white border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700">
                  {d.label} · {d.horarios} horarios
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">Canchas</p>
            <ul className="space-y-2">
              {state.canchas!.map((c) => (
                <li key={c.court} className="bg-white border border-ink-200 rounded-lg px-3 py-2">
                  {c.destino === "asignada" && (
                    <span className="text-ink-700">
                      <strong>{c.court}</strong> → se asigna a tu cancha <strong>{c.canchaNombre}</strong>
                    </span>
                  )}
                  {c.destino === "nueva" && (
                    <span className="text-ink-700">
                      <strong>{c.court}</strong> → se creará en tu catálogo
                    </span>
                  )}
                  {c.destino === "conflicto" && (
                    <div className="space-y-1.5">
                      <span className="text-ink-700">
                        <strong>{c.court}</strong> se parece a tu cancha <strong>{c.canchaNombre}</strong>. ¿Es la misma?
                      </span>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-ink-700">
                          <input
                            type="radio"
                            name={`desportsDecision:${c.court}`}
                            value={c.canchaId}
                            defaultChecked
                            className="w-3.5 h-3.5 accent-azul-600"
                          />
                          Sí, es la misma (se actualiza el nombre a &ldquo;{c.court}&rdquo;)
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-ink-700">
                          <input
                            type="radio"
                            name={`desportsDecision:${c.court}`}
                            value="nueva"
                            className="w-3.5 h-3.5 accent-azul-600"
                          />
                          No, crear cancha nueva
                        </label>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-500 mt-2">El empate de canchas se aplica al guardar.</p>
          </div>
        </div>
      )}
    </div>
  );
}
