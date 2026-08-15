import { requireUser, requireLigaId } from "@/lib/auth";
import { db } from "@/db";
import { contarNoLeidas, listarNotificaciones } from "@/lib/notificaciones";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ligaId = await requireLigaId(user);
  const [liga, ligas, noLeidas] = await Promise.all([
    db.query.ligas.findFirst({ where: (l, { eq }) => eq(l.id, ligaId) }),
    user.rol === "superadmin"
      ? db.query.ligas.findMany({
          where: (l, { eq }) => eq(l.activo, true),
          orderBy: (l, { asc }) => asc(l.nombre),
          columns: { id: true, nombre: true },
        })
      : Promise.resolve([]),
    contarNoLeidas(user, ligaId),
  ]);
  const avisos = await listarNotificaciones(user, ligaId, 8);

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
