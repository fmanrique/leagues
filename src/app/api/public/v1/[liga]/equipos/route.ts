import { publicJson, notFound, conManejo } from "@/lib/public-api";
import { getLigaPublica, getEquiposPublicos } from "@/lib/public-data";

async function handler(_req: Request, { params }: { params: Promise<{ liga: string }> }) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) return notFound("Liga no encontrada");
  const equipos = await getEquiposPublicos(liga.id);
  return publicJson({ equipos });
}

export const GET = conManejo(handler);
