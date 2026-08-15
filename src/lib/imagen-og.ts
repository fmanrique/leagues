import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** Carga una fuente empaquetada para Satori (rutas incluidas vía outputFileTracingIncludes). */
export async function fontOg(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), "src", "assets", "fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const FORMATOS_SATORI = ["image/png", "image/jpeg"];
const MAX_IMAGEN = 6 * 1024 * 1024;

/**
 * Devuelve la URL sólo si la imagen es utilizable por Satori (PNG/JPEG y de un
 * tamaño razonable). Cualquier otra cosa devuelve null para que la imagen se
 * genere sin ella en vez de fallar por completo.
 */
export async function imagenUsable(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const largo = Number(res.headers.get("content-length") ?? 0);
    if (!FORMATOS_SATORI.includes(tipo)) {
      console.warn(`[og] imagen ignorada por formato ${tipo}: ${url}`);
      return null;
    }
    if (largo > MAX_IMAGEN) {
      console.warn(`[og] imagen ignorada por tamaño (${largo} bytes): ${url}`);
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** URL absoluta a partir del origin de la request (para archivos subidos en local). */
export function absolutaDesde(origin: string) {
  return (u: string | null | undefined) => (u ? (u.startsWith("http") ? u : `${origin}${u}`) : null);
}

/**
 * Convierte la salida PNG de Satori (ImageResponse) a JPEG. Los crawlers de
 * redes sociales (Facebook/X) son quisquillosos con las og:image dinámicas:
 * JPEG con URL limpia terminada en .jpg es lo que funciona de forma confiable.
 */
export async function comoJpeg(imagen: Response, nombreArchivo: string, cacheSegundos = 300): Promise<Response> {
  const png = Buffer.from(await imagen.arrayBuffer());
  const jpeg = await sharp(png).flatten({ background: "#0f172a" }).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
      "Cache-Control": `public, s-maxage=${cacheSegundos}, stale-while-revalidate=${cacheSegundos * 2}`,
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
    },
  });
}
