import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/ui";
import { ROL_USUARIO } from "@/lib/labels";
import { seccionesParaRol, type Bloque } from "./contenido";

export const metadata: Metadata = { title: "Ayuda" };

/** Convierte los **énfasis** del texto en <strong>. */
function Enfasis({ texto }: { texto: string }) {
  const partes = texto.split("**");
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="font-bold text-ink-900">{p}</strong> : p
      )}
    </>
  );
}

function BloqueView({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case "p":
      return <p className="text-sm leading-relaxed text-ink-700"><Enfasis texto={b.texto ?? ""} /></p>;
    case "pasos":
      return (
        <ol className="space-y-2.5">
          {(b.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-700">
              <span className="mt-0.5 inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-azul-600 text-white text-xs font-bold">
                {i + 1}
              </span>
              <span><Enfasis texto={item} /></span>
            </li>
          ))}
        </ol>
      );
    case "lista":
      return (
        <ul className="space-y-2.5">
          {(b.items ?? []).map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
              <span aria-hidden className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-azul-600" />
              <span><Enfasis texto={item} /></span>
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <p className="text-sm leading-relaxed text-ink-800 bg-lima-500/15 border border-lima-600/30 rounded-xl px-4 py-3">
          <span className="font-bold text-lima-800">Tip: </span>
          <Enfasis texto={b.texto ?? ""} />
        </p>
      );
    case "ojo":
      return (
        <p className="text-sm leading-relaxed text-ink-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="font-bold text-amber-700">Ojo: </span>
          <Enfasis texto={b.texto ?? ""} />
        </p>
      );
  }
}

export default async function AyudaPage() {
  const user = await requireUser();
  const secciones = seccionesParaRol(user.rol);

  return (
    <div>
      <PageHeader
        title="Ayuda"
        subtitle={`Guía de la plataforma para tu perfil: ${ROL_USUARIO[user.rol] ?? user.rol}`}
      />

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* Índice */}
        <nav
          aria-label="Índice de la ayuda"
          // Pegado bajo el header sticky (h-16) + el mismo aire que el hueco
          // lateral entre este índice y el menú general (p-6 del contenido)
          className="mb-6 lg:mb-0 lg:sticky lg:top-22 bg-white rounded-xl border border-ink-200 shadow-sm p-3"
        >
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Contenido</p>
          <ul className="flex flex-wrap lg:flex-col gap-1">
            {secciones.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-700 hover:bg-azul-600/5 hover:text-azul-600 transition-colors"
                >
                  <Icon name={s.icono} className="w-4 h-4 shrink-0 text-azul-600" />
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contenido */}
        <div className="space-y-10">
          {secciones.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-azul-600 text-white">
                  <Icon name={s.icono} className="w-5 h-5" />
                </span>
                <h2 className="brand-title text-2xl text-ink-900">{s.titulo}</h2>
              </div>
              <p className="text-sm text-ink-500 mb-4">{s.descripcion}</p>
              <div className="space-y-4">
                {s.temas.map((tema) => (
                  <article
                    key={tema.id}
                    id={`${s.id}-${tema.id}`}
                    className="bg-white rounded-xl border border-ink-200 shadow-sm p-6"
                  >
                    <h3 className="font-bold text-ink-900 mb-3">{tema.titulo}</h3>
                    <div className="space-y-3">
                      {tema.bloques.map((b, i) => <BloqueView key={i} b={b} />)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-ink-400 pb-4">
            ¿No encontraste lo que buscabas? Contacta a tu administrador de liga, o a DE/SPORTS
            por WhatsApp al 81 1276 2885.
          </p>
        </div>
      </div>
    </div>
  );
}
