import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";

// Tope por archivo. El cliente comprime antes de subir; esto acota el caso en
// que la compresión no aplique (SVG) o el navegador no la soporte.
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
/**
 * Sólo PNG y JPEG: son los únicos formatos que Satori (next/og) puede decodificar
 * al generar la imagen del rol de juegos. El cliente convierte WebP/HEIC a uno
 * de estos antes de enviar, así que el usuario puede elegir cualquier foto.
 */
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

/** Directorio del driver local; se sirve por /api/uploads/[...path]. */
export const UPLOAD_DIR = join(process.cwd(), ".uploads");

export class UploadError extends Error {}

/**
 * Guarda una imagen subida y devuelve su URL pública.
 *
 * Driver "supabase" (producción): sube a Supabase Storage y devuelve la URL
 * pública del CDN. Driver "local" (dev/review): escribe en `.uploads/` y
 * devuelve una URL servida por el route handler — el filesystem de Vercel es
 * de sólo lectura, así que en producción hay que usar el driver de Supabase.
 */
export async function saveImage(file: File, prefix: string): Promise<string> {
  if (!ALLOWED[file.type]) {
    throw new UploadError("Formato no soportado. Usa PNG o JPG.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 3 MB`);
  }

  const ext = ALLOWED[file.type] ?? extname(file.name) ?? ".png";
  const key = `${prefix}/${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "supabase" && driver !== "local") {
    throw new UploadError(`STORAGE_DRIVER="${driver}" no es válido; usa "supabase" o "local"`);
  }
  // El filesystem de Vercel es de solo lectura: el driver local ahí no funciona.
  if (driver === "local" && process.env.VERCEL) {
    throw new UploadError(
      "El almacenamiento de imágenes no está configurado: define STORAGE_DRIVER=supabase " +
      "(con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET) en las " +
      "variables de entorno de Vercel."
    );
  }

  if (driver === "supabase") {
    const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "desport";
    const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !token) throw new UploadError("Storage de Supabase no configurado");
    const res = await fetch(`${base}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
        "Content-Type": file.type,
        "cache-control": "31536000",
      },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      if (res.status === 404) {
        throw new UploadError(`No existe el bucket "${bucket}" en Supabase Storage. Créalo como bucket público.`);
      }
      throw new UploadError(`Supabase rechazó la imagen (${res.status}): ${detalle.slice(0, 140)}`);
    }
    return `${base}/storage/v1/object/public/${bucket}/${key}`;
  }

  const dir = join(UPLOAD_DIR, prefix);
  await mkdir(dir, { recursive: true });
  const filename = key.slice(prefix.length + 1);
  await writeFile(join(dir, filename), bytes);
  return `/api/uploads/${prefix}/${filename}`;
}

/**
 * Extrae la llave interna a partir de una URL generada por `saveImage`.
 * Devuelve null si la URL no es nuestra (nunca borramos algo ajeno).
 */
function keyDesdeUrl(url: string): { driver: "supabase" | "local"; key: string } | null {
  const local = url.match(/^\/api\/uploads\/(.+)$/);
  if (local) {
    const key = decodeURIComponent(local[1]);
    // El path debe quedar dentro de UPLOAD_DIR
    if (key.includes("..") || key.includes("\0") || key.startsWith("/")) return null;
    return { driver: "local", key };
  }

  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "desport";
  if (base && url.startsWith(`${base}/storage/v1/object/public/${bucket}/`)) {
    const key = url.slice(`${base}/storage/v1/object/public/${bucket}/`.length);
    return key ? { driver: "supabase", key } : null;
  }
  return null;
}

/**
 * Borra una imagen previamente subida. Es best-effort: si falla (permisos, ya
 * no existe, red) sólo se registra — nunca debe tumbar la acción del usuario,
 * porque el dato que importa (la referencia en la base) ya se actualizó.
 */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const parsed = keyDesdeUrl(url);
  if (!parsed) return; // URL externa o con formato inesperado: no la tocamos

  try {
    if (parsed.driver === "supabase") {
      const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "desport";
      const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!base || !token) return;
      await fetch(`${base}/storage/v1/object/${bucket}/${parsed.key}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, apikey: token },
      });
      return;
    }
    await unlink(join(UPLOAD_DIR, parsed.key));
  } catch (e) {
    console.warn(`[storage] no se pudo borrar ${url}:`, e instanceof Error ? e.message : e);
  }
}
