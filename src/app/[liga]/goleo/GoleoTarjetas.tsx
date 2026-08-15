"use client";
import { useState } from "react";
import Link from "next/link";
import { TeamMark } from "@/components/public/shared";
import Paginacion from "@/components/public/Paginacion";

export interface FilaGoleador {
  jugadorId: string; equipoId: string; nombre: string; equipo: string;
  equipoColor: string; equipoLogoUrl: string | null; goles: number;
}

export interface FilaTarjetas {
  jugadorId: string; equipoId: string; nombre: string; equipo: string;
  equipoColor: string; equipoLogoUrl: string | null; amarillas: number; rojas: number;
}

const POR_PAGINA = 10;

/** Listas públicas de goleo y tarjetas, cada una paginada a 10 jugadores. */
export default function GoleoTarjetas({ goleadores, tarjetas, slug, torneoId }: {
  goleadores: FilaGoleador[]; tarjetas: FilaTarjetas[]; slug: string; torneoId: string;
}) {
  const [pagGoleo, setPagGoleo] = useState(1);
  const [pagTarjetas, setPagTarjetas] = useState(1);

  const totalGoleo = Math.max(1, Math.ceil(goleadores.length / POR_PAGINA));
  const desdeGoleo = (pagGoleo - 1) * POR_PAGINA;
  const goleoVisible = goleadores.slice(desdeGoleo, desdeGoleo + POR_PAGINA);

  const totalTarjetas = Math.max(1, Math.ceil(tarjetas.length / POR_PAGINA));
  const desdeTarjetas = (pagTarjetas - 1) * POR_PAGINA;
  const tarjetasVisible = tarjetas.slice(desdeTarjetas, desdeTarjetas + POR_PAGINA);

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* Tabla de goleo */}
      <div>
        <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold text-ink-900">Tabla de goleo</h3>
          <ol className="divide-y divide-ink-100">
            {goleoVisible.map((g, i) => {
              const lugar = desdeGoleo + i + 1;
              return (
                <li key={g.jugadorId} className="flex items-center gap-3 px-5 py-2.5">
                  <span
                    className={`w-6 text-center font-bold ${lugar === 1 ? "" : "text-ink-400"}`}
                    style={lugar === 1 ? { color: "var(--lg-primario)" } : undefined}
                  >
                    {lugar}
                  </span>
                  <TeamMark equipo={{ id: g.jugadorId, nombre: g.equipo, colorLocal: g.equipoColor, logoUrl: g.equipoLogoUrl }} size={26} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink-900 truncate">{g.nombre}</span>
                    <Link href={`/${slug}/equipos/${g.equipoId}?torneo=${torneoId}`} className="block text-xs text-ink-500 truncate hover:underline">{g.equipo}</Link>
                  </span>
                  <span className="font-bold" style={{ color: "var(--lg-primario)" }}>{g.goles}</span>
                </li>
              );
            })}
            {goleadores.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-ink-400">Sin goles registrados</li>
            )}
          </ol>
        </section>
        <Paginacion
          pagina={pagGoleo}
          totalPaginas={totalGoleo}
          leyenda={`Lugares ${desdeGoleo + 1}–${desdeGoleo + goleoVisible.length} de ${goleadores.length}`}
          onPagina={setPagGoleo}
        />
      </div>

      {/* Tarjetas */}
      <div>
        <section className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <h3 className="px-5 py-4 border-b border-ink-100 font-bold text-ink-900">Tarjetas</h3>
          <ol className="divide-y divide-ink-100">
            {tarjetasVisible.map((c) => (
              <li key={c.jugadorId} className="flex items-center gap-3 px-5 py-2.5">
                <TeamMark equipo={{ id: c.jugadorId, nombre: c.equipo, colorLocal: c.equipoColor, logoUrl: c.equipoLogoUrl }} size={26} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink-900 truncate">{c.nombre}</span>
                  <Link href={`/${slug}/equipos/${c.equipoId}?torneo=${torneoId}`} className="block text-xs text-ink-500 truncate hover:underline">{c.equipo}</Link>
                </span>
                {c.amarillas > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                    <span className="inline-block w-3 h-4 rounded-[2px] bg-amber-400" /> {c.amarillas}
                  </span>
                )}
                {c.rojas > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                    <span className="inline-block w-3 h-4 rounded-[2px] bg-red-500" /> {c.rojas}
                  </span>
                )}
              </li>
            ))}
            {tarjetas.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-ink-400">Sin tarjetas registradas</li>
            )}
          </ol>
        </section>
        <Paginacion
          pagina={pagTarjetas}
          totalPaginas={totalTarjetas}
          leyenda={`${desdeTarjetas + 1}–${desdeTarjetas + tarjetasVisible.length} de ${tarjetas.length}`}
          onPagina={setPagTarjetas}
        />
      </div>
    </div>
  );
}
