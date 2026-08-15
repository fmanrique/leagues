import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/db";

const CORS = { "Access-Control-Allow-Origin": "*" };

/** Respuesta JSON pública con cache CDN (60s + SWR). */
export function publicJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...CORS,
    },
  });
}

export function notFound(msg = "No encontrado"): NextResponse {
  return NextResponse.json({ error: msg }, { status: 404, headers: CORS });
}

/**
 * Envuelve un handler público: ante cualquier error (DB caída, etc.) responde
 * JSON 500 con CORS en vez del error HTML default de Next, para que los
 * consumidores externos siempre reciban el contrato JSON.
 */
export function conManejo<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[public-api]", e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: "Error interno; intenta de nuevo" },
        { status: 500, headers: { "Cache-Control": "no-store", ...CORS } }
      );
    }
  };
}

/** Liga pública por slug (solo activas). */
export async function findLigaBySlug(slug: string) {
  return db.query.ligas.findFirst({
    where: (l, { and, eq }) => and(eq(l.slug, slug), eq(l.activo, true)),
    columns: {
      id: true, slug: true, nombre: true, logoUrl: true,
      colorPrimario: true, colorSecundario: true, colorAcento: true,
      direccion: true, email: true, telefono: true,
    },
  });
}
