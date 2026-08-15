"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export interface LigaCard {
  slug: string;
  nombre: string;
  direccion: string;
  logoUrl: string | null;
  colorPrimario: string;
  torneosEnCurso: number;
}

const RECIENTES_KEY = "calccio:ligas-recientes";

/** Lee los slugs de ligas visitadas (la más reciente primero). */
function leerRecientes(): string[] {
  try {
    const raw = localStorage.getItem(RECIENTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Registra la visita a una liga; se usa desde el layout público. */
export function registrarLigaVisitada(slug: string) {
  try {
    const sin = leerRecientes().filter((s) => s !== slug);
    localStorage.setItem(RECIENTES_KEY, JSON.stringify([slug, ...sin].slice(0, 6)));
  } catch {
    /* localStorage no disponible */
  }
}

function TarjetaLiga({ liga }: { liga: LigaCard }) {
  return (
    <Link
      href={`/${liga.slug}`}
      className="flex items-center gap-4 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl p-4 transition-colors group"
    >
      {liga.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={liga.logoUrl}
          alt=""
          width={56}
          height={56}
          className="w-14 h-14 rounded-xl object-contain bg-white/90 p-1 flex-shrink-0"
        />
      ) : (
        <span
          className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
          style={{ backgroundColor: liga.colorPrimario }}
        >
          {liga.nombre[0]}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-bold text-white group-hover:text-lima-500 transition-colors truncate">
          {liga.nombre}
        </span>
        <span className="block text-xs text-azul-200 truncate mt-0.5">
          {liga.torneosEnCurso > 0
            ? `${liga.torneosEnCurso} torneo${liga.torneosEnCurso === 1 ? "" : "s"} en curso`
            : liga.direccion || "Liga oficial"}
        </span>
      </span>
    </Link>
  );
}

export default function LigasBuscador({ ligas }: { ligas: LigaCard[] }) {
  const [query, setQuery] = useState("");
  const [recientes, setRecientes] = useState<LigaCard[]>([]);

  useEffect(() => {
    const slugs = leerRecientes();
    setRecientes(
      slugs
        .map((s) => ligas.find((l) => l.slug === s))
        .filter((l): l is LigaCard => Boolean(l))
    );
  }, [ligas]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ligas;
    return ligas.filter(
      (l) => l.nombre.toLowerCase().includes(q) || l.direccion.toLowerCase().includes(q)
    );
  }, [ligas, query]);

  return (
    <div className="w-full max-w-3xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar liga…"
        aria-label="Buscar liga"
        className="w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-3.5 text-white placeholder:text-azul-200 focus:outline-none focus:border-lima-500 transition-colors mb-8"
      />

      {!query && recientes.length > 0 && ligas.length > 3 && (
        <section className="mb-8">
          <h2 className="text-azul-200 text-xs font-bold uppercase tracking-widest mb-3">Recientes</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {recientes.map((l) => (
              <TarjetaLiga key={l.slug} liga={l} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-azul-200 text-xs font-bold uppercase tracking-widest mb-3">
          {query ? "Resultados" : "Todas las ligas"}
        </h2>
        {filtradas.length === 0 ? (
          <p className="text-azul-200 text-sm py-8 text-center">
            Ninguna liga coincide con &ldquo;{query}&rdquo;
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtradas.map((l) => (
              <TarjetaLiga key={l.slug} liga={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
