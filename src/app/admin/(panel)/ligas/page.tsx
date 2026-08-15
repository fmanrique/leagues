import type { Metadata } from "next";
import { countDistinct, eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireUser } from "@/lib/auth";
import LigasClient from "./LigasClient";

export const metadata: Metadata = { title: "Ligas" };

export default async function LigasPage() {
  await requireUser(["superadmin"]);

  const ligas = await db
    .select({
      id: t.ligas.id,
      nombre: t.ligas.nombre,
      slug: t.ligas.slug,
      direccion: t.ligas.direccion,
      telefono: t.ligas.telefono,
      email: t.ligas.email,
      desportsLigaId: t.ligas.desportsLigaId,
      activo: t.ligas.activo,
      equipos: countDistinct(t.equipos.id),
      torneos: countDistinct(t.torneos.id),
    })
    .from(t.ligas)
    .leftJoin(t.equipos, eq(t.equipos.ligaId, t.ligas.id))
    .leftJoin(t.torneos, eq(t.torneos.ligaId, t.ligas.id))
    .groupBy(t.ligas.id)
    .orderBy(t.ligas.nombre);

  return <LigasClient ligas={ligas} />;
}
