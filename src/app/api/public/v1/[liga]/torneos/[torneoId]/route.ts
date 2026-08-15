import { publicJson, notFound, conManejo } from "@/lib/public-api";
import { getLigaPublica, getTorneosPublicos, getPartidosPublicos } from "@/lib/public-data";
import { computeStandings, computeGoleadores, computeTarjetas } from "@/lib/stats";

async function handler(_req: Request, { params }: { params: Promise<{ liga: string; torneoId: string }> }) {
  const { liga: slug, torneoId } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) return notFound("Liga no encontrada");
  const torneos = await getTorneosPublicos(liga.id);
  const torneo = torneos.find((t) => t.id === torneoId);
  if (!torneo) return notFound("Torneo no encontrado");

  const [tabla, goleo, tarjetas, partidos] = await Promise.all([
    computeStandings(torneo.id),
    computeGoleadores(torneo.id),
    computeTarjetas(torneo.id),
    getPartidosPublicos(torneo.id),
  ]);

  return publicJson({ torneo, tabla, goleo, tarjetas, partidos });
}

export const GET = conManejo(handler);
