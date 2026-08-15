import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import ArbitrosClient from "./ArbitrosClient";

export const metadata: Metadata = { title: "Árbitros" };

export default async function ArbitrosPage() {
  const { ligaId } = await requireLigaAdmin();

  const arbitros = await db
    .select({
      id: t.arbitros.id,
      nombre: t.arbitros.nombre,
      apellido: t.arbitros.apellido,
      fechaNacimiento: t.arbitros.fechaNacimiento,
      sexo: t.arbitros.sexo,
      fotoUrl: t.arbitros.fotoUrl,
      telefono: t.arbitros.telefono,
      email: t.arbitros.email,
      activo: t.arbitros.activo,
    })
    .from(t.arbitros)
    .where(eq(t.arbitros.ligaId, ligaId))
    .orderBy(t.arbitros.nombre);

  return <ArbitrosClient arbitros={arbitros} />;
}
