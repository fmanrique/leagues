import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ROL_USUARIO } from "@/lib/labels";
import CuentaClient, { FotoPerfil } from "./CuentaClient";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader title="Mi cuenta" subtitle="Datos de tu acceso y cambio de contraseña" />
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white rounded-xl border border-ink-200 shadow-sm p-6">
          <h3 className="font-bold text-ink-900 mb-4">Datos</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Nombre</dt>
              <dd className="font-semibold text-ink-900">{user.nombre}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Usuario</dt>
              <dd className="font-mono text-ink-900">{user.username}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Rol</dt>
              <dd className="font-semibold text-ink-900">{ROL_USUARIO[user.rol] ?? user.rol}</dd>
            </div>
          </dl>
        </section>
        <div className="space-y-6">
          <FotoPerfil fotoUrl={user.fotoUrl} />
          <CuentaClient />
        </div>
      </div>
    </div>
  );
}
