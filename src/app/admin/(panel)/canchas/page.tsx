import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import CanchasClient from "./CanchasClient";

export const metadata: Metadata = { title: "Canchas" };

export default async function CanchasPage() {
  const { ligaId } = await requireLigaAdmin();

  const canchas = await db
    .select({
      id: t.canchas.id,
      nombre: t.canchas.nombre,
      direccion: t.canchas.direccion,
      tipo: t.canchas.tipo,
      superficie: t.canchas.superficie,
      iluminacion: t.canchas.iluminacion,
      activo: t.canchas.activo,
    })
    .from(t.canchas)
    .where(eq(t.canchas.ligaId, ligaId))
    .orderBy(t.canchas.nombre);

  return <CanchasClient canchas={canchas} />;
}
