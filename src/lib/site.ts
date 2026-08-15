/**
 * URL canónica del sitio: SITE_URL en producción (configurar en Vercel con el
 * dominio real), VERCEL_URL como fallback en previews, localhost en dev.
 */
export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3070";
}
