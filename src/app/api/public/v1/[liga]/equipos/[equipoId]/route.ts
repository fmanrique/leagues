import { publicJson, notFound, conManejo } from "@/lib/public-api";
import { getLigaPublica, getEquiposPublicos, getPlantillaPublica } from "@/lib/public-data";

async function handler(_req: Request, { params }: { params: Promise<{ liga: string; equipoId: string }> }) {
  const { liga: slug, equipoId } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) return notFound("Liga no encontrada");
  const equipos = await getEquiposPublicos(liga.id);
  const equipo = equipos.find((e) => e.id === equipoId);
  if (!equipo) return notFound("Equipo no encontrado");
  const plantilla = await getPlantillaPublica(equipo.id);
  return publicJson({ equipo, plantilla });
}

export const GET = conManejo(handler);
