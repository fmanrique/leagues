import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, requireLigaId } from "@/lib/auth";
import { listarNotificaciones, marcarLeida } from "@/lib/notificaciones";

/**
 * Abre una notificación: la marca como leída y redirige a su destino.
 * Solo dentro del alcance del usuario (su liga / su equipo); un id ajeno
 * simplemente regresa a la bandeja.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ligaId = await requireLigaId(user);

  const propias = await listarNotificaciones(user, ligaId, 200);
  const aviso = propias.find((n) => n.id === id);
  if (aviso) {
    await marcarLeida(user, ligaId, id);
    revalidatePath("/admin", "layout");
  }
  redirect(aviso?.url ?? "/admin/notificaciones");
}
