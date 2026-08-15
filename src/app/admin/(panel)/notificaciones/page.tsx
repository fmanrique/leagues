import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser, requireLigaId } from "@/lib/auth";
import { listarNotificaciones, marcarTodasLeidas } from "@/lib/notificaciones";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { fmtFechaHora } from "@/lib/format";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const user = await requireUser();
  const ligaId = await requireLigaId(user);
  const avisos = await listarNotificaciones(user, ligaId, 100);
  const noLeidas = avisos.filter((a) => !a.leida).length;

  async function marcarTodas() {
    "use server";
    const u = await requireUser();
    const lid = await requireLigaId(u);
    await marcarTodasLeidas(u, lid);
    revalidatePath("/admin", "layout");
  }

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle={noLeidas ? `${noLeidas} sin leer` : "Todo al día"}
      >
        {noLeidas > 0 && (
          <form action={marcarTodas}>
            <button
              type="submit"
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Marcar todas como leídas
            </button>
          </form>
        )}
      </PageHeader>

      {avisos.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-sm">
          <EmptyState icon="reclamos" text="Aún no tienes notificaciones" />
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-ink-200 shadow-sm divide-y divide-ink-100">
          {avisos.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/notificaciones/ir/${a.id}`}
                className={`flex items-start gap-3 px-5 py-3.5 hover:bg-ink-50/70 transition-colors ${a.leida ? "opacity-60" : ""}`}
              >
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.leida ? "bg-ink-200" : "bg-azul-600"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{a.titulo}</span>
                  {a.detalle && <span className="block text-sm text-ink-600 mt-0.5">{a.detalle}</span>}
                </span>
                <span className="text-xs text-ink-400 whitespace-nowrap mt-1">{fmtFechaHora(a.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
