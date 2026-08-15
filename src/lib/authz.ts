import "server-only";
import { redirect } from "next/navigation";
import { requireUser, requireLigaId, type SessionUser } from "./auth";
import { db } from "@/db";

/** Usuario con permiso de gestión sobre la liga activa (DE/SPORTS o admin de liga). */
export async function requireLigaAdmin(): Promise<{ user: SessionUser; ligaId: string }> {
  const user = await requireUser(["superadmin", "admin_liga"]);
  const ligaId = await requireLigaId(user);
  return { user, ligaId };
}

/** Cualquier usuario del panel, con su liga activa resuelta. */
export async function requirePanelUser(): Promise<{ user: SessionUser; ligaId: string }> {
  const user = await requireUser();
  const ligaId = await requireLigaId(user);
  return { user, ligaId };
}

/** Verifica que un equipo pertenezca a la liga activa; redirige si no. */
export async function assertEquipoEnLiga(equipoId: string, ligaId: string): Promise<void> {
  const eq = await db.query.equipos.findFirst({
    where: (e, { eq: eqOp, and }) => and(eqOp(e.id, equipoId), eqOp(e.ligaId, ligaId)),
    columns: { id: true },
  });
  if (!eq) redirect("/admin");
}
