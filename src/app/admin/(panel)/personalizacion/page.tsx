import type { Metadata } from "next";
import { db } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import PersonalizacionClient from "./PersonalizacionClient";

export const metadata: Metadata = { title: "Personalización" };

export default async function PersonalizacionPage() {
  const { ligaId } = await requireLigaAdmin();
  const liga = await db.query.ligas.findFirst({ where: (l, { eq }) => eq(l.id, ligaId) });
  if (!liga) return null;

  return (
    <PersonalizacionClient
      liga={{
        nombre: liga.nombre,
        slug: liga.slug,
        logoUrl: liga.logoUrl,
        colorPrimario: liga.colorPrimario,
        colorSecundario: liga.colorSecundario,
        colorAcento: liga.colorAcento,
        fondoRolUrl: liga.fondoRolUrl,
        fondoOgUrl: liga.fondoOgUrl,
      }}
    />
  );
}
