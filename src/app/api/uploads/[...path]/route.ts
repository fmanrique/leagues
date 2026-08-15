import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Sirve las imágenes subidas con el driver de storage local (dev / review).
 * Next.js sólo publica `public/` con lo que existía al build, así que los
 * archivos escritos en runtime necesitan esta ruta. En producción (Vercel) se
 * usa Supabase Storage y estas URLs no se generan.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const rel = normalize(path.join("/"));
  // Sin escapes fuera del directorio de uploads
  if (rel.startsWith("..") || rel.includes("\0")) {
    return new Response("Ruta inválida", { status: 400 });
  }
  const ext = extname(rel).toLowerCase();
  if (!MIME[ext]) return new Response("Formato no permitido", { status: 400 });

  try {
    const bytes = await readFile(join(UPLOAD_DIR, rel));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": MIME[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrada", { status: 404 });
  }
}
