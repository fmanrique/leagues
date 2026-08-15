"use client";

/** Controles de paginación del sitio público (número activo en color de liga). */
export default function Paginacion({ pagina, totalPaginas, leyenda, onPagina }: {
  pagina: number;
  totalPaginas: number;
  leyenda: string;
  onPagina: (n: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const btn =
    "px-3 py-1.5 rounded-lg text-xs font-bold border bg-white border-ink-200 text-ink-600 hover:border-ink-400 disabled:opacity-40 disabled:hover:border-ink-200";
  return (
    <div className="flex items-center justify-between gap-3 mt-3">
      <span className="text-xs text-ink-500">{leyenda}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPagina(Math.max(1, pagina - 1))} disabled={pagina === 1} aria-label="Página anterior" className={btn}>
          ‹
        </button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPagina(n)}
            aria-current={n === pagina ? "page" : undefined}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              n === pagina ? "text-white border-transparent" : "bg-white border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
            style={n === pagina ? { backgroundColor: "var(--lg-primario)" } : undefined}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPagina(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina === totalPaginas}
          aria-label="Página siguiente"
          className={btn}
        >
          ›
        </button>
      </div>
    </div>
  );
}
