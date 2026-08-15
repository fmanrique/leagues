// Iconos inline (trazo 2px, estilo lucide) — sin dependencias externas
export type IconName =
  | "dashboard" | "equipos" | "jugadores" | "arbitros" | "canchas"
  | "torneos" | "calendario" | "ficha" | "estadisticas" | "pagos"
  | "reclamos" | "personalizacion" | "configuracion" | "ligas"
  | "logout" | "menu" | "chevron" | "ayuda";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  equipos: <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z" />,
  jugadores: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" /><path d="M16 3.5a4 4 0 010 7" /><path d="M22 21v-2a4 4 0 00-3-3.85" /></>,
  arbitros: <><circle cx="12" cy="5" r="3" /><path d="M9 22v-8l-2-3 3-3h4l3 3-2 3v8" /><path d="M15 11h4M5 11h4" /></>,
  canchas: <><rect x="2" y="5" width="20" height="14" rx="1" /><path d="M12 5v14" /><circle cx="12" cy="12" r="2.5" /></>,
  torneos: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v6a5 5 0 01-10 0V4z" /><path d="M7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /></>,
  calendario: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 9h18" /></>,
  ficha: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v2h6V3" /><path d="M9 11l2 2 4-4" /><path d="M9 17h6" /></>,
  estadisticas: <><path d="M3 21h18" /><rect x="5" y="12" width="3" height="6" /><rect x="10.5" y="7" width="3" height="11" /><rect x="16" y="10" width="3" height="8" /></>,
  pagos: <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" /><path d="M6 15h4" /></>,
  reclamos: <><path d="M4 21V4a1 1 0 011-1h14l-3 5 3 5H5" /></>,
  personalizacion: <><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.8-.7 1.8-1.8 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1a1.8 1.8 0 011.8-1.8H17c2.8 0 5-2.2 5-5C22 6 17.5 2 12 2z" /></>,
  configuracion: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  ligas: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  ayuda: <><circle cx="12" cy="12" r="9" /><path d="M9.2 9a2.8 2.8 0 015.5.7c0 1.8-2.7 2.3-2.7 4" /><path d="M12 17.5h.01" /></>,
};

export function Icon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
