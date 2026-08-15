"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";

export interface TorneoCard {
  id: string;
  nombre: string;
  estado: string;
  meta: string; // "Varonil · Fútbol 11 · desde 10 Ene 2026"
}

/**
 * Selector de torneo bajo el header. Para que escale con muchos torneos:
 * sólo muestra los EN CURSO (fila horizontal scrolleable) + acceso al archivo
 * completo en /torneos. Si se está viendo un torneo finalizado (desde el
 * archivo), su tarjeta se antepone para no perder el contexto.
 */
export default function TorneoCards({ torneos, defaultTorneoId, slug }: {
  torneos: TorneoCard[];
  defaultTorneoId: string | null;
  slug: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actual = searchParams.get("torneo") ?? defaultTorneoId;

  const enCurso = torneos.filter((t) => t.estado === "en_curso");
  const viendo = torneos.find((t) => t.id === actual);
  const visibles = [...enCurso];
  if (viendo && !visibles.some((t) => t.id === viendo.id)) visibles.unshift(viendo);

  const hayMas = torneos.length > visibles.length;
  // Con un solo torneo y sin archivo, el selector no aporta nada
  if (visibles.length <= 1 && !hayMas) return null;

  return (
    <div
      className="flex gap-3 mb-8 overflow-x-auto pb-1 -mx-1 px-1"
      role="navigation"
      aria-label="Torneos de la liga"
    >
      {visibles.map((t) => {
        const activo = t.id === actual;
        return (
          <Link
            key={t.id}
            href={`${pathname}?torneo=${t.id}`}
            aria-current={activo ? "true" : undefined}
            className={`flex-shrink-0 w-64 rounded-xl bg-white p-3.5 pl-4 border-l-4 transition-all ${
              activo
                ? "border shadow-md"
                : "border border-ink-200 border-l-ink-200 shadow-sm hover:shadow-md hover:border-l-ink-400"
            }`}
            style={
              activo
                ? ({ borderColor: "var(--lg-primario)", borderLeftWidth: 4 } as CSSProperties)
                : undefined
            }
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-ink-900 text-sm leading-snug truncate">{t.nombre}</h3>
              {activo ? (
                <span
                  className="flex-shrink-0 text-[11px] font-bold text-white rounded-full px-2 py-0.5"
                  style={{ backgroundColor: "var(--lg-primario)" }}
                >
                  Viendo ✓
                </span>
              ) : (
                <span className="flex-shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 bg-ink-100 text-ink-600">
                  {t.estado === "finalizado" ? "Finalizado" : "En curso"}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-500 mt-1 truncate">{t.meta}</p>
          </Link>
        );
      })}

      {hayMas && (
        <Link
          href={`/${slug}/torneos`}
          className="flex-shrink-0 w-44 rounded-xl border border-dashed border-ink-300 bg-transparent p-3.5 flex flex-col items-center justify-center text-center hover:border-ink-400 hover:bg-white/60 transition-colors"
        >
          <span className="text-sm font-bold" style={{ color: "var(--lg-primario)" }}>
            Todos los torneos →
          </span>
          <span className="text-xs text-ink-500 mt-0.5">{torneos.length} en total</span>
        </Link>
      )}
    </div>
  );
}
