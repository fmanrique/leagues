import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables as t } from "@/db";
import { requireLigaAdmin } from "@/lib/authz";
import ConfiguracionClient from "./ConfiguracionClient";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const { user, ligaId } = await requireLigaAdmin();

  const liga = await db.query.ligas.findFirst({
    where: (l, { eq }) => eq(l.id, ligaId),
    columns: { id: true, nombre: true, direccion: true, telefono: true, email: true, desportsLigaId: true },
  });
  if (!liga) redirect("/admin");

  const [usuarios, equipos, arbitros] = await Promise.all([
    db
      .select({
        id: t.usuarios.id,
        username: t.usuarios.username,
        nombre: t.usuarios.nombre,
        rol: t.usuarios.rol,
        activo: t.usuarios.activo,
        equipoNombre: t.equipos.nombre,
        arbitroNombre: t.arbitros.nombre,
        arbitroApellido: t.arbitros.apellido,
      })
      .from(t.usuarios)
      .leftJoin(t.equipos, eq(t.usuarios.equipoId, t.equipos.id))
      .leftJoin(t.arbitros, eq(t.usuarios.arbitroId, t.arbitros.id))
      .where(eq(t.usuarios.ligaId, ligaId))
      .orderBy(t.usuarios.username),
    db
      .select({ id: t.equipos.id, nombre: t.equipos.nombre })
      .from(t.equipos)
      .where(eq(t.equipos.ligaId, ligaId))
      .orderBy(t.equipos.nombre),
    db
      .select({ id: t.arbitros.id, nombre: t.arbitros.nombre, apellido: t.arbitros.apellido })
      .from(t.arbitros)
      .where(eq(t.arbitros.ligaId, ligaId))
      .orderBy(t.arbitros.nombre),
  ]);

  return (
    <ConfiguracionClient
      liga={liga}
      usuarios={usuarios.map((u) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
        asociado: u.equipoNombre ?? (u.arbitroNombre ? `${u.arbitroNombre} ${u.arbitroApellido ?? ""}`.trim() : null),
      }))}
      equipos={equipos}
      arbitros={arbitros.map((a) => ({ id: a.id, nombre: `${a.nombre} ${a.apellido}`.trim() }))}
      currentUserId={user.id}
    />
  );
}
