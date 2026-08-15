import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneosPublicos } from "@/lib/public-data";
import { fmtFechaMedia } from "@/lib/format";
import { RAMA, TIPO_FUTBOL } from "@/lib/labels";
import { SectionTitle } from "@/components/public/shared";

export const metadata: Metadata = { title: "Torneos" };

export const revalidate = 60;

function TorneoArchivoCard({ slug, torneo }: {
  slug: string;
  torneo: { id: string; nombre: string; estado: string; rama: string; tipoFutbol: string; fechaInicio: string };
}) {
  const enCurso = torneo.estado === "en_curso";
  return (
    <Link
      href={`/${slug}?torneo=${torneo.id}`}
      className="block bg-white rounded-xl border border-ink-200 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-ink-900 leading-snug">{torneo.nombre}</h3>
        <span
          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
            enCurso ? "text-white" : "bg-ink-100 text-ink-600"
          }`}
          style={enCurso ? { backgroundColor: "var(--lg-primario)" } : undefined}
        >
          {enCurso ? "En curso" : "Finalizado"}
        </span>
      </div>
      <p className="text-xs text-ink-500 mb-2">
        {RAMA[torneo.rama] ?? torneo.rama} · {TIPO_FUTBOL[torneo.tipoFutbol] ?? torneo.tipoFutbol} · desde {fmtFechaMedia(torneo.fechaInicio)}
      </p>
      <span className="text-sm font-bold" style={{ color: "var(--lg-primario)" }}>
        Ver torneo →
      </span>
    </Link>
  );
}

export default async function TorneosPage({ params }: { params: Promise<{ liga: string }> }) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const torneos = await getTorneosPublicos(liga.id);
  const enCurso = torneos.filter((t) => t.estado === "en_curso");
  const finalizados = torneos.filter((t) => t.estado === "finalizado");

  // Archivo agrupado por año (más reciente primero)
  const porAnio = new Map<string, typeof finalizados>();
  for (const t of finalizados) {
    const anio = t.fechaInicio.slice(0, 4);
    const arr = porAnio.get(anio) ?? [];
    arr.push(t);
    porAnio.set(anio, arr);
  }
  const anios = [...porAnio.keys()].sort((a, b) => b.localeCompare(a));

  if (!torneos.length) {
    return <p className="text-center py-20 text-ink-500">Esta liga aún no tiene torneos publicados.</p>;
  }

  return (
    <div className="space-y-10">
      {enCurso.length > 0 && (
        <section>
          <SectionTitle>En curso</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enCurso.map((t) => <TorneoArchivoCard key={t.id} slug={slug} torneo={t} />)}
          </div>
        </section>
      )}

      {anios.map((anio) => (
        <section key={anio}>
          <SectionTitle>Finalizados · {anio}</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porAnio.get(anio)!.map((t) => <TorneoArchivoCard key={t.id} slug={slug} torneo={t} />)}
          </div>
        </section>
      ))}

      {finalizados.length === 0 && (
        <p className="text-sm text-ink-500">Aún no hay torneos finalizados en el archivo.</p>
      )}
    </div>
  );
}
