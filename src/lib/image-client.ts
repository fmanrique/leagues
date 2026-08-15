/**
 * Compresión y normalización de imágenes en el navegador antes de subirlas.
 *
 * Dos razones para hacerlo aquí:
 *  1. Los Server Actions de Next.js tienen un límite de cuerpo y Vercel corta
 *     a 4.5 MB por request; una foto de celular pesa 3–8 MB.
 *  2. El generador del rol de juegos (next/og → Satori) SÓLO decodifica PNG y
 *     JPEG. Si guardáramos WebP, la imagen del rol saldría sin logo ni fondo.
 *     Por eso todo lo que subimos se normaliza a PNG (si tiene transparencia)
 *     o JPEG (si no la tiene).
 */

export type CompressOptions = {
  maxWidth: number;
  maxHeight: number;
  /** Calidad 0–1 para JPEG. */
  quality?: number;
  /** Peso objetivo; si se excede, se baja calidad o tamaño. */
  targetBytes?: number;
};

/** Formatos que Satori puede decodificar: lo que guardamos debe ser uno de estos. */
const FORMATOS_SEGUROS = ["image/png", "image/jpeg"];

export async function compressImage(file: File, opts: CompressOptions): Promise<File> {
  const { maxWidth, maxHeight, quality = 0.85, targetBytes = 900 * 1024 } = opts;

  if (typeof document === "undefined") return file;

  // Ya es un formato seguro y pesa poco: no hay nada que ganar
  if (FORMATOS_SEGUROS.includes(file.type) && file.size <= targetBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // el browser no pudo decodificarlo; que el servidor lo rechace
  }

  const escala = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = dibujar(bitmap, escala);
  bitmap.close?.();
  if (!canvas) return file;

  const conAlfa = tieneTransparencia(canvas);
  let blob = await toBlob(canvas, conAlfa ? "image/png" : "image/jpeg", quality);
  if (!blob) return file;

  if (blob.size > targetBytes) {
    blob = conAlfa
      ? await reducirPng(file, canvas, targetBytes, blob)
      : await reducirJpeg(canvas, targetBytes, blob);
  }

  // Si no mejoramos y el original ya era seguro, nos quedamos con el original
  if (blob.size >= file.size && FORMATOS_SEGUROS.includes(file.type)) return file;

  const ext = blob.type === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}

/** JPEG: bajamos calidad progresivamente. */
async function reducirJpeg(canvas: HTMLCanvasElement, target: number, actual: Blob): Promise<Blob> {
  let mejor = actual;
  for (const q of [0.75, 0.6, 0.45, 0.3]) {
    const intento = await toBlob(canvas, "image/jpeg", q);
    if (intento && intento.size < mejor.size) mejor = intento;
    if (mejor.size <= target) break;
  }
  return mejor;
}

/**
 * PNG: la calidad no aplica, así que para bajar el peso reducimos dimensiones.
 * Mantenemos PNG para no perder la transparencia del logo.
 */
async function reducirPng(
  file: File, canvas: HTMLCanvasElement, target: number, actual: Blob
): Promise<Blob> {
  let mejor = actual;
  for (const factor of [0.75, 0.5, 0.35]) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return mejor;
    }
    const escala = Math.min(1, (canvas.width * factor) / bitmap.width, (canvas.height * factor) / bitmap.height);
    const menor = dibujar(bitmap, escala);
    bitmap.close?.();
    if (!menor) return mejor;
    const intento = await toBlob(menor, "image/png", 1);
    if (intento && intento.size < mejor.size) mejor = intento;
    if (mejor.size <= target) break;
  }
  return mejor;
}

function dibujar(bitmap: ImageBitmap, escala: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Muestrea el canvas buscando algún píxel no opaco. */
function tieneTransparencia(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true; // ante la duda, conservamos PNG
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Un píxel de cada 16 basta para detectar transparencia real
    for (let i = 3; i < data.length; i += 4 * 16) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Presets por tipo de imagen del sistema. */
export const IMAGE_PRESETS = {
  logo: { maxWidth: 1000, maxHeight: 1000, targetBytes: 400 * 1024 },
  fondoRol: { maxWidth: 1080, maxHeight: 1350, targetBytes: 900 * 1024 },
  fondoOg: { maxWidth: 1200, maxHeight: 630, targetBytes: 600 * 1024 },
  foto: { maxWidth: 600, maxHeight: 600, targetBytes: 250 * 1024 },
} satisfies Record<string, CompressOptions>;
