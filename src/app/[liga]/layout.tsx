import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLigaPublica, getTorneosPublicos, getTorneoDefault } from "@/lib/public-data";
import LigaNav from "@/components/public/LigaNav";
import TorneoCards from "@/components/public/TorneoCards";
import RegistrarVisita from "@/components/public/RegistrarVisita";
import { fmtFechaMedia } from "@/lib/format";
import { RAMA, TIPO_FUTBOL } from "@/lib/labels";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ liga: string }> }): Promise<Metadata> {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) return {};
  return {
    title: { default: liga.nombre, template: `%s · ${liga.nombre}` },
    description: `Calendario, resultados, tabla de posiciones y estadísticas de ${liga.nombre}. Powered by DE/SPORTS.`,
    openGraph: {
      title: liga.nombre,
      siteName: "DE/SPORTS",
      url: `/${liga.slug}`,
      type: "website",
      locale: "es_MX",
      // JPEG con URL limpia: los crawlers de FB/X no procesan bien los PNG
      // dinámicos con hash de la convención opengraph-image
      images: [{ url: `/api/og/${liga.slug}/imagen.jpg`, width: 1200, height: 630, alt: liga.nombre }],
    },
  };
}

export default async function LigaLayout({ params, children }: {
  params: Promise<{ liga: string }>;
  children: React.ReactNode;
}) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  if (!liga) notFound();

  const [torneos, torneoDefault] = await Promise.all([
    getTorneosPublicos(liga.id),
    getTorneoDefault(liga.id),
  ]);

  const vars = {
    "--lg-primario": liga.colorPrimario,
    "--lg-secundario": liga.colorSecundario,
    "--lg-acento": liga.colorAcento,
  } as CSSProperties;

  return (
    <div style={vars} className="min-h-screen bg-ink-50 flex flex-col">
      <header style={{ backgroundColor: "var(--lg-primario)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 py-4">
            {liga.logoUrl ? (
              <Image
                src={liga.logoUrl}
                alt=""
                width={44}
                height={44}
                unoptimized
                className="rounded-xl object-contain bg-white/10 p-1 flex-shrink-0"
              />
            ) : (
              <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {liga.nombre[0]}
              </span>
            )}
            <div className="min-w-0">
              <p className="brand-title text-xl md:text-2xl text-white leading-tight truncate">
                {liga.nombre}
              </p>
              <p className="text-xs text-white/70">Liga oficial</p>
            </div>
          </div>
          <Suspense fallback={null}>
            <LigaNav slug={liga.slug} />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <RegistrarVisita slug={liga.slug} />
        <Suspense fallback={null}>
          <TorneoCards
            torneos={torneos.map((t) => ({
              id: t.id,
              nombre: t.nombre,
              estado: t.estado,
              meta: `${RAMA[t.rama] ?? t.rama} · ${TIPO_FUTBOL[t.tipoFutbol] ?? t.tipoFutbol} · ${t.categoriaLibre ? "Libre" : `${t.categoriaAnioMin ?? ""}–${t.categoriaAnioMax ?? ""}`} · desde ${fmtFechaMedia(t.fechaInicio)}`,
            }))}
            defaultTorneoId={torneoDefault?.id ?? null}
            slug={liga.slug}
          />
        </Suspense>
        {children}
      </main>

      <footer className="bg-ink-950 mt-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-ink-400">
            <p className="font-semibold text-ink-300">{liga.nombre}</p>
            {liga.email && <p>{liga.email}{liga.telefono ? ` · ${liga.telefono}` : ""}</p>}
          </div>
          <Link href="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[11px] uppercase tracking-wider text-ink-400">Powered by</span>
            <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={110} height={23} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
