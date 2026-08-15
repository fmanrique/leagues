"use client";
import { useState } from "react";
import Link from "next/link";
import { TeamMark } from "@/components/public/shared";
import Paginacion from "@/components/public/Paginacion";

export interface FilaTabla {
  equipoId: string; nombre: string; color: string; logoUrl: string | null;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dif: number; pts: number;
}

const POR_PAGINA = 10;

/** Tabla de posiciones pública paginada a 10 equipos; la posición es global. */
export default function TablaPosiciones({ filas, slug, torneoId }: { filas: FilaTabla[]; slug: string; torneoId: string }) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const desde = (pagina - 1) * POR_PAGINA;
  const visibles = filas.slice(desde, desde + POR_PAGINA);

  return (
    <div>
      <div className="bg-white rounded-xl border border-ink-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-2 py-3 font-semibold">Equipo</th>
              <th className="px-2 py-3 font-semibold text-center">JJ</th>
              <th className="px-2 py-3 font-semibold text-center">G</th>
              <th className="px-2 py-3 font-semibold text-center">E</th>
              <th className="px-2 py-3 font-semibold text-center">P</th>
              <th className="px-2 py-3 font-semibold text-center">GF</th>
              <th className="px-2 py-3 font-semibold text-center">GC</th>
              <th className="px-2 py-3 font-semibold text-center">Dif</th>
              <th className="px-4 py-3 font-semibold text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {visibles.map((r, i) => {
              const pos = desde + i + 1;
              return (
                <tr
                  key={r.equipoId}
                  style={pos <= 4 ? { backgroundColor: "color-mix(in srgb, var(--lg-acento) 8%, transparent)" } : undefined}
                >
                  <td className="px-4 py-2.5 font-bold text-ink-400">{pos}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-2">
                      <TeamMark equipo={{ id: r.equipoId, nombre: r.nombre, colorLocal: r.color, logoUrl: r.logoUrl }} size={26} />
                      <Link href={`/${slug}/equipos/${r.equipoId}?torneo=${torneoId}`} className="font-semibold text-ink-900 hover:underline">{r.nombre}</Link>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.pj}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.pg}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.pe}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.pp}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.gf}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.gc}</td>
                  <td className="px-2 py-2.5 text-center text-ink-600">{r.dif > 0 ? `+${r.dif}` : r.dif}</td>
                  <td className="px-4 py-2.5 text-center font-bold" style={{ color: "var(--lg-primario)" }}>{r.pts}</td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-ink-400">Sin datos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-400 mt-2">
        Sombreado: primeros 4 lugares. Desempate: puntos, diferencia de goles y goles a favor.
      </p>
      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        leyenda={`Posiciones ${desde + 1}–${desde + visibles.length} de ${filas.length}`}
        onPagina={setPagina}
      />
    </div>
  );
}
