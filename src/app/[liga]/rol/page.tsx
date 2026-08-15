import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLigaPublica, getTorneoDefault, getPartidosPublicos } from "@/lib/public-data";
import { SectionTitle } from "@/components/public/shared";
import ImagenCarrusel from "@/components/public/CompartirImagenes";

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string; jornada?: string }>;
}): Promise<Metadata> {
  const { liga: slug } = await params;
  const { torneo: torneoParam, jornada: jornadaParam } = await searchParams;
  const liga = await getLigaPublica(slug);
  if (!liga) return { title: "Rol de juegos" };
  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) return { title: "Rol de juegos" };

  const partidos = await getPartidosPublicos(torneo.id);
  const jornadas = [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b);
  const pendiente = partidos.find((p) => p.estado === "programado")?.jornada;
  const jornadaSel = jornadaParam && jornadas.includes(Number(jornadaParam))
    ? Number(jornadaParam)
    : pendiente ?? jornadas[jornadas.length - 1];
  if (!jornadaSel) return { title: "Rol de juegos" };

  const titulo = `Jornada ${jornadaSel} · ${torneo.nombre}`;
  return {
    title: `Rol de juegos · J${jornadaSel}`,
    openGraph: {
      title: `${titulo} · ${liga.nombre}`,
      description: `Horarios, canchas y árbitros de la jornada ${jornadaSel}.`,
      // Vista previa del link: la jornada completa en 1200×630, sin dividir (JPEG)
      images: [{
        url: `/api/rol-og/${slug}/${torneo.id}/${jornadaSel}/imagen.jpg`,
        width: 1200,
        height: 630,
        alt: titulo,
      }],
    },
  };
}

export default async function RolPage({ params, searchParams }: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ torneo?: string; jornada?: string }>;
}) {
  const { liga: slug } = await params;
  const { torneo: torneoParam, jornada: jornadaParam } = await searchParams;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const torneo = await getTorneoDefault(liga.id, torneoParam);
  if (!torneo) {
    return <p className="text-center py-20 text-ink-500">Aún no hay rol de juegos publicado.</p>;
  }

  const partidos = await getPartidosPublicos(torneo.id);
  const jornadas = [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b);
  if (!jornadas.length) {
    return <p className="text-center py-20 text-ink-500">Este torneo aún no tiene partidos.</p>;
  }

  const pendiente = partidos.find((p) => p.estado === "programado")?.jornada;
  const jornadaSel = jornadaParam && jornadas.includes(Number(jornadaParam))
    ? Number(jornadaParam)
    : pendiente ?? jornadas[jornadas.length - 1];

  const delDia = partidos.filter((p) => p.jornada === jornadaSel);
  const totalPaginas = Math.max(1, Math.ceil(delDia.length / 4));
  const imgUrls = Array.from({ length: totalPaginas }, (_, i) =>
    `/api/rol/${slug}/${torneo.id}/${jornadaSel}${totalPaginas > 1 ? `?p=${i + 1}` : ""}`
  );

  return (
    <div>
      <SectionTitle>Rol de juegos · {torneo.nombre}</SectionTitle>
      <p className="text-sm text-ink-500 mb-5 -mt-2">
        Descarga la imagen de la jornada y compártela por WhatsApp o redes sociales.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {jornadas.map((j) => (
          <Link
            key={j}
            href={`/${slug}/rol?torneo=${torneo.id}&jornada=${j}`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              j === jornadaSel
                ? "text-white border-transparent"
                : "bg-white border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
            style={j === jornadaSel ? { backgroundColor: "var(--lg-primario)" } : undefined}
          >
            J{j}
          </Link>
        ))}
      </div>

      <ImagenCarrusel
        paginas={imgUrls}
        alt={`Rol de juegos, jornada ${jornadaSel}`}
        archivoBase={`rol-${slug}-j${jornadaSel}`}
        titulo={`Jornada ${jornadaSel} · ${torneo.nombre} · ${liga.nombre}`}
        cajaTitulo="Compartir esta jornada"
        descripcion="La imagen se genera con el branding de la liga y se actualiza sola si cambian horarios o resultados."
        notaPreview="El link compartido muestra una vista previa con la jornada completa."
      />
    </div>
  );
}
