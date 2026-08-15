import { publicJson, notFound, conManejo } from "@/lib/public-api";
import { getLigaPublica, getTorneosPublicos } from "@/lib/public-data";

async function handler(_req: Request, { params }: { params: Promise<{ liga: string }> }) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) return notFound("Liga no encontrada");
  const torneos = await getTorneosPublicos(liga.id);
  const { id: _id, ...ligaPublica } = liga;
  return publicJson({ liga: ligaPublica, torneos });
}

export const GET = conManejo(handler);
