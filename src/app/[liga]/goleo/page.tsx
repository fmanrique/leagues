import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneosPublicos, getTorneoDefault } from "@/lib/public-data";
import { computeGoleadores, computeTarjetas } from "@/lib/stats";
import { SectionTitle } from "@/components/public/shared";
import ImagenCarrusel from "@/components/public/CompartirImagenes";
import GoleoTarjetas from "./GoleoTarjetas";

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string }>;
}): Promise<Metadata> {
  const [{ liga: slug }, { torneo: torneoParam }] = await Promise.all([params, searchParams]);
  const base: Metadata = { title: "Goleo y tarjetas" };
  const liga = await getLigaPublica(slug);
  if (!liga) return base;
  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) return base;
  const goleadores = await computeGoleadores(torneo.id, 11);
  if (!goleadores.length) return base;

  const titulo = `Tabla de goleo · ${torneo.nombre}`;
  return {
    ...base,
    openGraph: {
      title: `${titulo} · ${liga.nombre}`,
      description: goleadores.length > 10
        ? "El top 10 de goleadores del torneo."
        : "Los goleadores del torneo.",
      // Vista previa del link: top 10 del goleo en 1200×630 (JPEG)
      images: [{
        url: `/api/goleo-og/${slug}/${torneo.id}/imagen.jpg`,
        width: 1200,
        height: 630,
        alt: titulo,
      }],
    },
  };
}

export default async function GoleoPage({ params, searchParams }: {
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

  const [goleadores, tarjetas] = await Promise.all([
    computeGoleadores(torneo.id, 50),
    computeTarjetas(torneo.id, 50),
  ]);

  return (
    <div>
      <SectionTitle
      >
        Goleo y tarjetas
      </SectionTitle>
      <p className="text-sm text-ink-500 -mt-2 mb-5">{torneo.nombre}</p>

      <GoleoTarjetas goleadores={goleadores} tarjetas={tarjetas} slug={slug} torneoId={torneo.id} />

      {goleadores.length > 0 && (
        <div className="mt-10">
          <SectionTitle>Compartir el goleo</SectionTitle>
          <ImagenCarrusel
            paginas={Array.from({ length: Math.max(1, Math.ceil(goleadores.length / 10)) }, (_, i) =>
              `/api/goleo/${slug}/${torneo.id}${goleadores.length > 10 ? `?p=${i + 1}` : ""}`
            )}
            alt="Tabla de goleo"
            archivoBase={`goleo-${slug}`}
            titulo={`Tabla de goleo · ${torneo.nombre} · ${liga.nombre}`}
            cajaTitulo="Descargar y compartir"
            descripcion="La imagen se genera con el branding de la liga (10 lugares por imagen) y se actualiza sola con cada resultado capturado."
            notaPreview="El link compartido muestra una vista previa con el top 10 de goleo."
          />
        </div>
      )}
    </div>
  );
}
