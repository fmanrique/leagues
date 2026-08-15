/**
 * Fuente única de labels y tonos de Badge para los estados del dominio.
 * El mismo estado se llama y se pinta igual en todas las pantallas
 * (admin y sitio público).
 */

export type BadgeTone = "azul" | "lima" | "gris" | "rojo" | "ambar";

interface EstadoInfo {
  label: string;
  /** Variante compacta para el sitio público (badges chicos). */
  corto?: string;
  tone: BadgeTone;
}

export const ESTADO_PARTIDO: Record<string, EstadoInfo> = {
  programado: { label: "Programado", corto: "Próximo", tone: "azul" },
  en_curso: { label: "En curso", corto: "En vivo", tone: "ambar" },
  finalizado: { label: "Finalizado", corto: "Final", tone: "lima" },
  // Gris (no ámbar) para no confundirse con "En vivo" en badges chicos
  suspendido: { label: "Suspendido", tone: "gris" },
  cancelado: { label: "Cancelado", tone: "rojo" },
};

export const ESTADO_TORNEO: Record<string, EstadoInfo> = {
  configuracion: { label: "Configuración", tone: "gris" },
  inscripciones: { label: "Inscripciones", tone: "azul" },
  en_curso: { label: "En curso", tone: "lima" },
  finalizado: { label: "Finalizado", tone: "gris" },
  cancelado: { label: "Cancelado", tone: "rojo" },
};

export const ESTADO_PAGO: Record<string, EstadoInfo> = {
  pendiente: { label: "Pendiente", tone: "ambar" },
  pagado: { label: "Pagado", tone: "lima" },
  cancelado: { label: "Cancelado", tone: "gris" },
};

export const ESTADO_RECLAMO: Record<string, EstadoInfo> = {
  pendiente: { label: "Pendiente", tone: "ambar" },
  en_revision: { label: "En revisión", tone: "azul" },
  resuelto: { label: "Resuelto", tone: "lima" },
  rechazado: { label: "Rechazado", tone: "rojo" },
};

export const ROL_USUARIO: Record<string, string> = {
  superadmin: "DE/SPORTS",
  admin_liga: "Admin de Liga",
  admin_equipo: "Admin de Equipo",
  arbitro: "Árbitro",
};

export const RAMA: Record<string, string> = {
  varonil: "Varonil",
  femenil: "Femenil",
  mixto: "Mixto",
};

export const TIPO_FUTBOL: Record<string, string> = {
  futbol_11: "Fútbol 11",
  futbol_7: "Fútbol 7",
  futbol_5: "Fútbol 5",
};

export const TIPO_PAGO: Record<string, string> = {
  inscripcion: "Inscripción",
  arbitraje: "Arbitraje",
  multa: "Multa",
  horario_fijo: "Horario fijo",
  otro: "Otro",
};

export const TIPO_RECLAMO: Record<string, string> = {
  protesta: "Protesta",
  apelacion: "Apelación",
  queja: "Queja",
  otro: "Otro",
};

export function estadoInfo(mapa: Record<string, EstadoInfo>, estado: string): EstadoInfo {
  return mapa[estado] ?? { label: estado, tone: "gris" };
}
