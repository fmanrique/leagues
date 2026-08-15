import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneosPublicos, getTorneoDefault } from "@/lib/public-data";
import { computeStandings } from "@/lib/stats";
import { SectionTitle } from "@/components/public/shared";
import ImagenCarrusel from "@/components/public/CompartirImagenes";
import TablaPosiciones from "./TablaPosiciones";

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string }>;
}): Promise<Metadata> {
  const [{ liga: slug }, { torneo: torneoParam }] = await Promise.all([params, searchParams]);
  const base: Metadata = { title: "Tabla de posiciones" };
  const liga = await getLigaPublica(slug);
  if (!liga) return base;
  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) return base;
  const tabla = await computeStandings(torneo.id);
  if (!tabla.length || !tabla.some((r) => r.pj > 0)) return base;

  const titulo = `Tabla de posiciones · ${torneo.nombre}`;
  return {
    ...base,
    openGraph: {
      title: `${titulo} · ${liga.nombre}`,
      description: tabla.length > 10
        ? `Top 10 de ${tabla.length} equipos del torneo.`
        : `Posiciones de los ${tabla.length} equipos del torneo.`,
      // Vista previa del link: top 10 de la tabla en 1200×630 (JPEG)
      images: [{
        url: `/api/tabla-og/${slug}/${torneo.id}/imagen.jpg`,
        width: 1200,
        height: 630,
        alt: titulo,
      }],
    },
  };
}

export default async function TablaPage({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string }>;
}) {
  const [{ liga: slug }, { torneo: torneoParam }] = await Promise.all([params, searchParams]);
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const [torneos, torneo] = await Promise.all([
    getTorneosPublicos(liga.id),
    getTorneoDefault(liga.id, torneoParam),
  ]);

  if (!torneo) {
    return (
      <p className="text-center py-20 text-ink-500">
        Esta liga aún no tiene torneos publicados.
      </p>
    );
  }

  const tabla = await computeStandings(torneo.id);

  // Imagen compartible: máx. 10 posiciones por imagen (paginada como el rol)
  const totalPaginas = Math.max(1, Math.ceil(tabla.length / 10));
  const imgUrls = Array.from({ length: totalPaginas }, (_, i) =>
    `/api/tabla/${slug}/${torneo.id}${totalPaginas > 1 ? `?p=${i + 1}` : ""}`
  );
  const hayJugados = tabla.some((r) => r.pj > 0);

  return (
    <div>
      <SectionTitle
      >
        Tabla de posiciones
      </SectionTitle>
      <p className="text-sm text-ink-500 -mt-2 mb-5">{torneo.nombre}</p>

      <TablaPosiciones filas={tabla} slug={slug} torneoId={torneo.id} />

      {tabla.length > 0 && hayJugados && (
        <div className="mt-10">
          <SectionTitle>Compartir la tabla</SectionTitle>
          <ImagenCarrusel
            paginas={imgUrls}
            alt="Tabla de posiciones"
            archivoBase={`tabla-${slug}`}
            titulo={`Tabla de posiciones · ${torneo.nombre} · ${liga.nombre}`}
            cajaTitulo="Descargar y compartir"
            descripcion="La imagen se genera con el branding de la liga y se actualiza sola con cada resultado capturado."
            notaPreview="El link compartido muestra una vista previa con el top 10 de la tabla."
          />
        </div>
      )}
    </div>
  );
}
