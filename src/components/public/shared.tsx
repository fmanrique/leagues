import Image from "next/image";
import Link from "next/link";
import { fmtFechaCorta, fmtFechaLarga } from "@/lib/format";
import { ESTADO_PARTIDO, estadoInfo } from "@/lib/labels";

// Re-export para las páginas públicas que los importaban de aquí
export { fmtFechaCorta, fmtFechaLarga };

export interface EquipoPublico {
  id: string; nombre: string; colorLocal: string; logoUrl?: string | null;
}

/** Escudo del equipo: logo real o iniciales sobre su color. */
export function TeamMark({ equipo, size = 32 }: { equipo: EquipoPublico; size?: number }) {
  if (equipo.logoUrl) {
    return (
      <Image
        src={equipo.logoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-contain flex-shrink-0 bg-white"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = equipo.nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <span
      className="rounded-full inline-flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: equipo.colorLocal, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export interface PartidoPublico {
  id: string; jornada: number; fecha: string; hora: string; estado: string;
  golesLocal: number | null; golesVisitante: number | null;
  cancha: string | null;
  local: EquipoPublico; visitante: EquipoPublico;
}

/** Nombre de equipo: link a su página si hay slug de liga (conserva el torneo en contexto). */
function NombreEquipo({ slug, torneoId, equipo, className }: {
  slug?: string; torneoId?: string; equipo: EquipoPublico; className: string;
}) {
  if (!slug) return <span className={className}>{equipo.nombre}</span>;
  return (
    <Link
      href={`/${slug}/equipos/${equipo.id}${torneoId ? `?torneo=${torneoId}` : ""}`}
      className={`${className} hover:underline`}
    >
      {equipo.nombre}
    </Link>
  );
}

/** Tarjeta de partido pública (marcador o programación). */
export function MatchCard({ p, slug, torneoId, destacado = false, videoUrl }: {
  p: PartidoPublico; slug?: string; torneoId?: string; destacado?: boolean;
  videoUrl?: string | null; // link al video en DE/SPORTS (disponible ~1 semana)
}) {
  const jugado = p.estado === "finalizado";
  return (
    <article
      className={`bg-white rounded-xl border border-ink-200 p-4 ${destacado ? "shadow-md" : "shadow-sm"}`}
    >
      <div className="flex items-center justify-between text-xs text-ink-500 mb-3">
        <span>J{p.jornada} · {fmtFechaCorta(p.fecha)} · {p.hora}{p.cancha ? ` · ${p.cancha}` : ""}</span>
        {jugado ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: "var(--lg-primario)" }}>
            {estadoInfo(ESTADO_PARTIDO, p.estado).corto ?? estadoInfo(ESTADO_PARTIDO, p.estado).label}
          </span>
        ) : p.estado === "programado" ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-ink-100 text-ink-600">
            {estadoInfo(ESTADO_PARTIDO, p.estado).corto}
          </span>
        ) : p.estado === "cancelado" ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
            {estadoInfo(ESTADO_PARTIDO, p.estado).label}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
            {estadoInfo(ESTADO_PARTIDO, p.estado).corto ?? estadoInfo(ESTADO_PARTIDO, p.estado).label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <TeamMark equipo={p.local} size={34} />
          <NombreEquipo
            slug={slug}
            torneoId={torneoId}
            equipo={p.local}
            className={`text-sm truncate ${jugado && (p.golesLocal ?? 0) > (p.golesVisitante ?? 0) ? "font-bold text-ink-900" : "font-semibold text-ink-700"}`}
          />
        </div>
        <div className="flex-shrink-0 text-center min-w-16">
          {jugado ? (
            <span className="brand-title text-xl text-ink-900">{p.golesLocal} - {p.golesVisitante}</span>
          ) : (
            <span className="text-xs font-bold text-ink-400 uppercase">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <NombreEquipo
            slug={slug}
            torneoId={torneoId}
            equipo={p.visitante}
            className={`text-sm truncate text-right ${jugado && (p.golesVisitante ?? 0) > (p.golesLocal ?? 0) ? "font-bold text-ink-900" : "font-semibold text-ink-700"}`}
          />
          <TeamMark equipo={p.visitante} size={34} />
        </div>
      </div>
      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-ink-50 hover:bg-ink-100 px-3 py-2 text-xs font-bold text-ink-800 transition-colors"
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] pl-0.5"
            style={{ backgroundColor: "var(--lg-primario)" }}
            aria-hidden
          >
            ▶
          </span>
          Revive tu partido
          <span className="font-normal text-ink-400">· solo en DE/SPORTS</span>
        </a>
      )}
    </article>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <h2 className="brand-title text-xl md:text-2xl text-ink-900">{children}</h2>
      {action}
    </div>
  );
}
