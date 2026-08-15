import { requireUser, ligaIdOpcional } from "@/lib/auth";
import { db } from "@/db";
import { contarNoLeidas, listarNotificaciones } from "@/lib/notificaciones";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Null solo para superadmin en una base sin ligas: el shell se renderiza
  // igual (sin liga activa) para que pueda crear la primera en /admin/ligas
  const ligaId = await ligaIdOpcional(user);
  const [liga, ligas, noLeidas] = await Promise.all([
    ligaId
      ? db.query.ligas.findFirst({ where: (l, { eq }) => eq(l.id, ligaId) })
      : Promise.resolve(undefined),
    user.rol === "superadmin"
      ? db.query.ligas.findMany({
          where: (l, { eq }) => eq(l.activo, true),
          orderBy: (l, { asc }) => asc(l.nombre),
          columns: { id: true, nombre: true },
        })
      : Promise.resolve([]),
    ligaId ? contarNoLeidas(user, ligaId) : Promise.resolve(0),
  ]);
  const avisos = ligaId ? await listarNotificaciones(user, ligaId, 8) : [];

  return (
    <AdminShell
      user={user}
      liga={liga ? { id: liga.id, nombre: liga.nombre } : null}
      ligas={ligas}
      notificaciones={noLeidas}
      avisos={avisos.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        detalle: a.detalle,
        leida: a.leida,
        fecha: a.createdAt.toISOString(),
      }))}
    >
      {children}
    </AdminShell>
  );
}
