import { db } from "@/db";
import { publicJson, conManejo } from "@/lib/public-api";

async function handler() {
  const ligas = await db.query.ligas.findMany({
    where: (l, { eq }) => eq(l.activo, true),
    orderBy: (l, { asc }) => asc(l.nombre),
    columns: {
      slug: true, nombre: true, logoUrl: true,
      colorPrimario: true, colorSecundario: true, colorAcento: true,
    },
  });
  return publicJson({ ligas });
}

export const GET = conManejo(handler);
