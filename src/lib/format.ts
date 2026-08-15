/**
 * Formateadores únicos de fecha, moneda y personas.
 * Toda la app (admin y público) importa de aquí — no definir helpers locales.
 */

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Interpreta un YYYY-MM-DD como mediodía local (evita off-by-one por UTC). */
function fechaLocal(d: string): Date {
  return new Date(d + "T12:00:00");
}

/** "Dom 15 Ene" — para listados compactos de partidos. */
export function fmtFechaCorta(d: string): string {
  if (!d) return "";
  const date = fechaLocal(d);
  return `${DIAS[date.getDay()]} ${date.getDate()} ${MESES[date.getMonth()]}`;
}

/** "15 Ene 2026" — para fechas sueltas (inicio de torneo, pagos). */
export function fmtFechaMedia(d: string): string {
  if (!d) return "";
  const date = fechaLocal(d);
  return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

/** "domingo, 15 de enero" — para encabezados del sitio público. */
export function fmtFechaLarga(d: string): string {
  if (!d) return "";
  return fechaLocal(d).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
}

/** "15 Ene 2026 · 14:30" — para timestamps (reclamos, fichas). */
export function fmtFechaHora(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()} · ${hh}:${mm}`;
}

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", minimumFractionDigits: 2,
});

/** "$1,234.50" — formato único de moneda. */
export function fmtMXN(monto: number | string): string {
  const n = typeof monto === "string" ? Number(monto) : monto;
  return Number.isFinite(n) ? mxn.format(n) : "—";
}

/**
 * Fecha de "hoy" (YYYY-MM-DD) en hora de México, sin importar la TZ del
 * server (en Vercel es UTC: después de las 18:00 locales "hoy" ya sería
 * mañana y los partidos de la noche desaparecerían de "próximos").
 */
/** "1 torneo" / "3 torneos" — evita subtítulos tipo "1 torneos". */
export function plural(n: number, singular: string, plurales?: string): string {
  return `${n} ${n === 1 ? singular : plurales ?? `${singular}s`}`;
}

export function hoyMexico(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

/** Edad en años a partir de YYYY-MM-DD; null si no hay fecha. */
export function edad(fechaNacimiento: string | null | undefined): number | null {
  if (!fechaNacimiento) return null;
  const nac = fechaLocal(fechaNacimiento);
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

/** "Nombre ApellidoP ApellidoM" sin dobles espacios. */
export function nombreCompleto(p: { nombre: string; apellidoPaterno?: string | null; apellidoMaterno?: string | null; apellido?: string | null }): string {
  return [p.nombre, p.apellidoPaterno ?? p.apellido, p.apellidoMaterno]
    .filter(Boolean).join(" ").trim();
}
