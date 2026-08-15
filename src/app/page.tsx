import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { inArray, eq, and, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, tables as t } from "@/db";
import { siteUrl } from "@/lib/site";
import LigasBuscador from "@/components/public/LigasBuscador";
import MenuLanding from "@/components/public/MenuLanding";
import NavbarFlotante from "@/components/public/NavbarFlotante";

export const dynamic = "force-dynamic";

/** Admin de la plataforma de videos DE/SPORTS (sistema aparte del de ligas). */
const ADMIN_VIDEOS_URL = process.env.NEXT_PUBLIC_DESPORTS_ADMIN_URL ?? "https://de-sports.com.mx/login";
const WHATSAPP_URL = "https://wa.me/528112762885";
const CONTACTO_EMAIL = "contacto@de-sports.com.mx";

export const metadata: Metadata = {
  title: "DE/SPORTS · Ligas de fútbol con video: resultados, tablas y rol de juegos",
  description:
    "DE/SPORTS es la plataforma de ligas de fútbol amateur en Monterrey, México, donde cada " +
    "partido queda grabado en video. Consulta resultados, tabla de posiciones, tabla de goleo y " +
    "rol de juegos de tu liga, y revive tus jugadas. Juega hoy, revívelo siempre.",
  keywords: [
    "ligas de fútbol", "fútbol amateur", "Monterrey", "tabla de posiciones", "rol de juegos",
    "tabla de goleo", "video de partidos", "fútbol 7", "fútbol rápido", "DE/SPORTS",
    "administración de ligas", "resultados de fútbol",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "DE/SPORTS",
    title: "DE/SPORTS · Juega hoy, revívelo siempre",
    description:
      "Ligas de fútbol amateur con cada partido en video: resultados, tablas, goleo y rol de juegos de tu liga.",
    images: [{ url: "/brand/logo-azul.png", width: 760, height: 160, alt: "DE/SPORTS" }],
  },
};

/** Marcadores recientes de todas las ligas activas para la cinta del hero. */
async function ultimosResultados() {
  const local = alias(t.equipos, "local");
  const visitante = alias(t.equipos, "visitante");
  return db
    .select({
      id: t.partidos.id,
      jornada: t.partidos.jornada,
      golesLocal: t.partidos.golesLocal,
      golesVisitante: t.partidos.golesVisitante,
      local: local.nombre,
      visitante: visitante.nombre,
      liga: t.ligas.nombre,
      slug: t.ligas.slug,
    })
    .from(t.partidos)
    .innerJoin(t.torneos, eq(t.partidos.torneoId, t.torneos.id))
    .innerJoin(t.ligas, and(eq(t.torneos.ligaId, t.ligas.id), eq(t.ligas.activo, true)))
    .innerJoin(local, eq(t.partidos.equipoLocalId, local.id))
    .innerJoin(visitante, eq(t.partidos.equipoVisitanteId, visitante.id))
    .where(eq(t.partidos.estado, "finalizado"))
    .orderBy(desc(t.partidos.fecha), desc(t.partidos.hora))
    .limit(12);
}

const FAQ = [
  {
    q: "¿Qué es DE/SPORTS?",
    a: "DE/SPORTS es una plataforma mexicana de ligas de fútbol amateur con sede en Monterrey, " +
      "Nuevo León. Combina la administración completa de la liga (rol de juegos, resultados, " +
      "tabla de posiciones, tabla de goleo y fichas arbitrales) con cámaras instaladas en las " +
      "canchas que graban cada partido, para que los jugadores lo revivan y compartan en video.",
  },
  {
    q: "¿Cómo veo el video de mi partido?",
    a: "Entra a tu liga, abre el rol de juegos o los resultados y busca tu partido: si la cancha " +
      "tiene cámaras DE/SPORTS, verás el botón “Revive tu partido”, que te lleva directo al video " +
      "del día, cancha y horario en que jugaste. El video está disponible durante la semana " +
      "siguiente al partido.",
  },
  {
    q: "¿Cómo consulto la tabla de posiciones y el rol de juegos de mi liga?",
    a: "Busca tu liga en esta página y entra a su sitio: ahí están la tabla de posiciones, la " +
      "tabla de goleo, los resultados por jornada y el rol de juegos con fecha, hora y cancha de " +
      "cada partido. No necesitas cuenta ni contraseña para consultarlo.",
  },
  {
    q: "¿Qué necesito para administrar mi liga en DE/SPORTS?",
    a: "Una cuenta de administrador de liga. Desde el panel generas el calendario completo del " +
      "torneo en un clic, capturas fichas arbitrales, apruebas altas de jugadores, llevas pagos y " +
      "publicas la página de tu liga con tus propios colores y logotipo. Escríbenos por WhatsApp " +
      "al 81 1276 2885 para empezar.",
  },
  {
    q: "¿En qué ciudades está DE/SPORTS?",
    a: "La plataforma nació en Monterrey, Nuevo León, y está creciendo con ligas y canchas con " +
      "cámaras en más estados de México.",
  },
];

export default async function HomePage() {
  const ligas = await db.query.ligas.findMany({
    where: (l, { eq: eqOp }) => eqOp(l.activo, true),
    orderBy: (l, { asc }) => asc(l.nombre),
    columns: { id: true, slug: true, nombre: true, direccion: true, logoUrl: true, colorPrimario: true },
  });

  // Torneos en curso por liga (para el subtítulo de cada card)
  const enCurso = ligas.length
    ? await db
        .select({ ligaId: t.torneos.ligaId })
        .from(t.torneos)
        .where(and(inArray(t.torneos.ligaId, ligas.map((l) => l.id)), eq(t.torneos.estado, "en_curso")))
    : [];
  const conteo = new Map<string, number>();
  for (const r of enCurso) conteo.set(r.ligaId, (conteo.get(r.ligaId) ?? 0) + 1);

  const resultados = await ultimosResultados();

  const base = siteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#org`,
        name: "DE/SPORTS",
        url: base,
        logo: `${base}/brand/logo-azul.png`,
        slogan: "Juega hoy, revívelo siempre",
        description:
          "Plataforma de ligas de fútbol amateur con video: administración de torneos, resultados, " +
          "tablas y grabación de partidos con cámaras en cancha.",
        email: CONTACTO_EMAIL,
        telephone: "+52 81 1276 2885",
        address: { "@type": "PostalAddress", addressLocality: "Monterrey", addressRegion: "Nuevo León", addressCountry: "MX" },
        sameAs: [
          "https://de-sports.com.mx",
          "https://www.instagram.com/de_sports.mx",
          "https://www.tiktok.com/@de.sports.mx",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#web`,
        url: base,
        name: "DE/SPORTS Ligas",
        inLanguage: "es-MX",
        publisher: { "@id": `${base}/#org` },
      },
      {
        "@type": "ItemList",
        name: "Ligas de fútbol en DE/SPORTS",
        itemListElement: ligas.map((l, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: l.nombre,
          url: `${base}/${l.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-azul-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <NavbarFlotante adminVideosUrl={ADMIN_VIDEOS_URL} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-azul-600 bg-[radial-gradient(ellipse_at_top_right,rgba(196,255,2,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(8,29,69,0.9),transparent_60%)]">
        <Image
          src="/landing/jugada.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          className="object-cover object-right opacity-25 mix-blend-luminosity pointer-events-none select-none [mask-image:linear-gradient(to_left,black_20%,transparent_75%)]"
          aria-hidden
        />
        <header className="relative max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 md:px-10 py-5">
          <Image
            src="/brand/logo-blanco.png"
            alt="DE/SPORTS — Juega hoy, revívelo siempre"
            width={190}
            height={40}
            priority
          />
          <nav aria-label="Secciones" className="hidden lg:flex items-center gap-6 text-sm font-semibold text-azul-200">
            <a href="#ligas" className="hover:text-white transition-colors">Ligas</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#para-tu-liga" className="hover:text-white transition-colors">Para tu liga</a>
            <a href="#preguntas" className="hover:text-white transition-colors">Preguntas</a>
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <a
              href={ADMIN_VIDEOS_URL}
              className="text-xs font-semibold text-azul-200 hover:text-white border border-white/25 hover:border-white/60 rounded-xl px-3.5 py-2 transition-colors"
            >
              Admin de videos
            </a>
            <Link
              href="/admin"
              className="text-xs font-semibold text-azul-950 bg-lima-500 hover:bg-lima-400 rounded-xl px-3.5 py-2 transition-colors"
            >
              Admin de ligas
            </Link>
          </div>
          <MenuLanding adminVideosUrl={ADMIN_VIDEOS_URL} />
        </header>

        <section className="relative max-w-6xl mx-auto px-6 md:px-10 pt-14 md:pt-24 pb-16 md:pb-24">
          <p className="entra text-lima-500 text-xs font-bold uppercase tracking-[0.25em] mb-5">
            Fútbol amateur · Monterrey, México
          </p>
          <h1 className="entra brand-title text-5xl sm:text-6xl md:text-8xl leading-[0.95] uppercase">
            Juega hoy,
            <br />
            <span className="text-lima-500">revívelo siempre.</span>
          </h1>
          <p className="entra-2 mt-7 max-w-2xl text-azul-100 text-base md:text-lg leading-relaxed">
            DE/SPORTS es la plataforma de <strong className="text-white">ligas de fútbol con video</strong>:
            consulta los resultados, la tabla de posiciones, la tabla de goleo y el rol de juegos de tu
            liga — y como cada cancha tiene cámaras, tu partido queda grabado para que lo vuelvas a
            ver y lo compartas.
          </p>
          <div className="entra-3 mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#ligas"
              className="brand-title rounded-2xl bg-lima-500 hover:bg-lima-400 text-azul-950 text-lg px-7 py-3.5 transition-colors"
            >
              Encuentra tu liga
            </a>
            <a
              href="#como-funciona"
              className="rounded-2xl border border-white/30 hover:border-white/70 text-white font-semibold px-6 py-3.5 transition-colors"
            >
              Cómo funciona
            </a>
          </div>
        </section>
      </div>

      {/* ── Cinta de marcadores reales ───────────────────────────────────── */}
      {resultados.length > 0 && (
        <aside
          aria-label="Resultados recientes"
          className="border-y border-lima-500/25 bg-azul-950 overflow-hidden py-3"
        >
          <div className="marquesina gap-10 px-5">
            {[...resultados, ...resultados].map((r, i) => (
              <Link
                key={`${r.id}-${i}`}
                href={`/${r.slug}`}
                aria-hidden={i >= resultados.length}
                tabIndex={i >= resultados.length ? -1 : undefined}
                className="flex items-center gap-2.5 whitespace-nowrap text-sm text-azul-200 hover:text-white transition-colors"
              >
                <span className="text-lima-500 text-[10px]" aria-hidden>▶</span>
                <span className="font-semibold text-white">{r.local}</span>
                <span className="brand-title text-lima-500">
                  {r.golesLocal}–{r.golesVisitante}
                </span>
                <span className="font-semibold text-white">{r.visitante}</span>
                <span className="text-xs text-azul-300">J{r.jornada} · {r.liga}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}

      {/* ── Buscador y ligas ─────────────────────────────────────────────── */}
      <section id="ligas" className="scroll-mt-6 bg-azul-950">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col items-center">
          <h2 className="brand-title text-3xl md:text-4xl text-center">Encuentra tu liga</h2>
          <p className="text-azul-200 text-sm text-center mt-2 mb-9">
            Resultados, tablas y rol de juegos — sin cuentas ni contraseñas
          </p>
          <LigasBuscador
            ligas={ligas.map((l) => ({
              slug: l.slug,
              nombre: l.nombre,
              direccion: l.direccion,
              logoUrl: l.logoUrl,
              colorPrimario: l.colorPrimario,
              torneosEnCurso: conteo.get(l.id) ?? 0,
            }))}
          />
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="scroll-mt-6 bg-ink-50 text-ink-900">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="text-azul-600 text-xs font-bold uppercase tracking-[0.25em] mb-3">Cómo funciona</p>
          <h2 className="brand-title text-3xl md:text-5xl uppercase">
            Juega. Revive. <span className="text-azul-600">Comparte.</span>
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                paso: "1",
                titulo: "Juega",
                texto:
                  "Tu liga programa el torneo en DE/SPORTS: rol de juegos con fecha, hora y cancha, " +
                  "resultados por jornada y tablas siempre al día. Tú solo llegas a jugar.",
              },
              {
                paso: "2",
                titulo: "Revive",
                texto:
                  "Las cámaras instaladas en la cancha graban tu partido completo. Al terminar, lo " +
                  "encuentras junto a tu resultado con el botón “Revive tu partido”.",
              },
              {
                paso: "3",
                titulo: "Comparte",
                texto:
                  "Descarga tus mejores jugadas y compártelas en redes. Tus goles dejan de contarse " +
                  "de palabra: se enseñan.",
              },
            ].map((s) => (
              <article key={s.paso} className="relative bg-white rounded-2xl border border-ink-200 shadow-sm p-7 overflow-hidden">
                <span aria-hidden className="brand-title absolute -top-4 -right-2 text-[7rem] leading-none text-azul-600/8 select-none">
                  {s.paso}
                </span>
                <h3 className="brand-title text-2xl text-azul-600 uppercase">{s.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-700 relative">{s.texto}</p>
              </article>
            ))}
          </div>

          <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 text-sm text-ink-700">
            {[
              "Tabla de posiciones y tabla de goleo por torneo",
              "Rol de juegos con fecha, hora y cancha",
              "Resultados con ficha de goles y tarjetas",
              "Video de tu partido durante toda la semana",
            ].map((f) => (
              <li key={f} className="flex gap-2.5">
                <span aria-hidden className="text-lima-600 font-black mt-px">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── La liga en números ───────────────────────────────────────────── */}
      <section className="bg-azul-600 bg-[radial-gradient(ellipse_at_bottom_right,rgba(196,255,2,0.12),transparent_55%)] overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="relative mb-10 lg:mb-0 max-w-md mx-auto lg:mx-0 w-full">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/20">
              <Image
                src="/landing/cancha-aerea.jpg"
                alt="Cancha de fútbol iluminada de noche, vista aérea"
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                quality={72}
                className="object-cover"
              />
              <div aria-hidden className="absolute inset-0 bg-azul-600/25 mix-blend-multiply" />
            </div>
            <div className="absolute -bottom-8 -right-3 md:-right-8 w-1/2 aspect-[4/3] rounded-2xl overflow-hidden border-4 border-azul-600 shadow-2xl rotate-2">
              <Image
                src="/landing/equipo.jpg"
                alt="Jugadores amateurs disputando el balón"
                fill
                sizes="(min-width: 1024px) 20vw, 45vw"
                quality={72}
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <p className="text-lima-500 text-xs font-bold uppercase tracking-[0.25em] mb-3">Cámaras en la cancha</p>
            <h2 className="brand-title text-3xl md:text-5xl uppercase leading-tight">
              Cada partido queda grabado
            </h2>
            <p className="mt-5 text-azul-100 leading-relaxed max-w-md">
              En las canchas DE/SPORTS no hay camarógrafo ni configuración: la cámara graba tu
              partido completo, de silbatazo a silbatazo, y el video aparece junto a tu resultado.
            </p>
            <ul className="mt-9 space-y-5 max-w-md">
              {[
                ["Grabación automática", "La cámara conoce el rol de juegos y graba sola en el día, cancha y horario de tu partido."],
                ["Disponible toda la semana", "Entra a tu liga, abre tu resultado y dale a “Revive tu partido” los días siguientes al juego."],
                ["Clips para compartir", "Descarga tus mejores jugadas y publícalas en tus redes con la marca de tu club."],
                ["Desde cualquier dispositivo", "El video se ve en el celular, la tablet o la tele — sin instalar nada."],
              ].map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-3.5">
                  <span aria-hidden className="mt-1 inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-lima-500 text-azul-950 text-[10px] pl-0.5 font-black">▶</span>
                  <span>
                    <span className="block font-bold text-white">{titulo}</span>
                    <span className="block mt-0.5 text-sm text-azul-100 leading-relaxed">{texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Para dueños de liga ──────────────────────────────────────────── */}
      <section id="para-tu-liga" className="scroll-mt-6 bg-azul-950">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-lima-500 text-xs font-bold uppercase tracking-[0.25em] mb-3">Para tu liga</p>
            <h2 className="brand-title text-3xl md:text-5xl uppercase leading-tight">
              Tu liga, administrada de principio a fin
            </h2>
            <p className="mt-6 text-azul-100 leading-relaxed">
              El administrador de ligas de DE/SPORTS genera el calendario completo del torneo en un
              clic — con fechas garantizadas para todos los equipos, horarios fijos y reprogramación
              automática cuando un equipo se da de baja. Fichas arbitrales digitales, control de
              pagos, aprobación de jugadores y la página pública de tu liga con tu logotipo y tus
              colores, conectada a los videos de tus canchas.
            </p>
            <p className="mt-8 text-sm text-azul-300">
              ¿Quieres llevar tu liga a DE/SPORTS o poner cámaras en tu cancha?{" "}
              <a href={WHATSAPP_URL} className="text-lima-500 hover:text-lima-300 font-semibold underline underline-offset-4">
                Escríbenos por WhatsApp
              </a>
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            {[
              ["Calendario en un clic", "Rol de juegos completo por vueltas, con cruces repetidos mínimos y jornadas garantizadas."],
              ["Fichas arbitrales", "Goles, tarjetas y observaciones capturados por el árbitro desde su teléfono."],
              ["Altas con aprobación", "Los capitanes proponen jugadores y cambios; la liga aprueba con un clic."],
              ["Pagos al día", "Inscripciones, arbitrajes, multas y horarios fijos en un solo control."],
              ["Tu marca", "Página pública con tu logotipo, colores e imagen para compartir en redes."],
              ["Video integrado", "Cada partido enlazado automáticamente a la grabación de su cancha y horario."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-white">{titulo}</h3>
                <p className="mt-1.5 text-sm text-azul-200 leading-relaxed">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Preguntas frecuentes ─────────────────────────────────────────── */}
      <section id="preguntas" className="scroll-mt-6 bg-ink-50 text-ink-900">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <h2 className="brand-title text-3xl md:text-4xl uppercase text-center">Preguntas frecuentes</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group bg-white rounded-2xl border border-ink-200 shadow-sm open:shadow-md transition-shadow">
                <summary className="flex items-center justify-between gap-4 cursor-pointer select-none px-6 py-4 font-bold text-ink-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-azul-600 font-black transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-ink-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Image
          src="/landing/balon.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          className="object-cover object-center"
          aria-hidden
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-azul-950/90 via-azul-900/80 to-azul-950/95" />
        <div className="relative max-w-4xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
          <h2 className="brand-title text-4xl md:text-6xl uppercase leading-tight">
            La cancha te está <span className="text-lima-500">esperando</span>
          </h2>
          <p className="mt-5 text-azul-100 md:text-lg max-w-xl mx-auto leading-relaxed">
            Busca tu liga, checa a qué hora juegas y cuando termine el partido, revívelo en video.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#ligas"
              className="brand-title rounded-2xl bg-lima-500 hover:bg-lima-400 text-azul-950 text-lg px-7 py-3.5 transition-colors"
            >
              Encuentra tu liga
            </a>
            <a
              href={WHATSAPP_URL}
              className="rounded-2xl border border-white/30 hover:border-white/70 font-semibold px-6 py-3.5 transition-colors"
            >
              Lleva DE/SPORTS a tu cancha
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-azul-950 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={160} height={34} />
            <p className="mt-4 text-sm text-azul-300 leading-relaxed max-w-xs">
              Ligas de fútbol amateur con video. Hecho en Monterrey, México.
            </p>
          </div>
          <nav aria-label="Enlaces" className="text-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-azul-300 mb-3">Plataforma</h3>
            <ul className="space-y-2 text-azul-200">
              <li><a href="#ligas" className="hover:text-white transition-colors">Encuentra tu liga</a></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Administrador de ligas</Link></li>
              <li><a href={ADMIN_VIDEOS_URL} className="hover:text-white transition-colors">Administrador de videos</a></li>
              <li><a href="https://de-sports.com.mx" className="hover:text-white transition-colors">de-sports.com.mx</a></li>
            </ul>
          </nav>
          <div className="text-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-azul-300 mb-3">Contacto</h3>
            <ul className="space-y-2 text-azul-200">
              <li><a href={WHATSAPP_URL} className="hover:text-white transition-colors">WhatsApp · 81 1276 2885</a></li>
              <li><a href={`mailto:${CONTACTO_EMAIL}`} className="hover:text-white transition-colors">{CONTACTO_EMAIL}</a></li>
            </ul>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.instagram.com/de_sports.mx"
                aria-label="Instagram de DE/SPORTS (@de_sports.mx)"
                className="inline-flex w-10 h-10 items-center justify-center rounded-xl border border-white/15 text-azul-200 hover:text-lima-500 hover:border-lima-500/60 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.52.01-4.76.07-1.08.05-1.66.23-2.05.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.05-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.08.23 1.66.38 2.05.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.05.38 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.08-.05 1.66-.23 2.05-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.05.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.08-.23-1.66-.38-2.05-.2-.51-.44-.88-.82-1.26a3.4 3.4 0 0 0-1.26-.82c-.39-.15-.97-.33-2.05-.38C15.52 4.01 15.15 4 12 4Zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88Zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28Zm5.14-3.11a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@de.sports.mx"
                aria-label="TikTok de DE/SPORTS (@de.sports.mx)"
                className="inline-flex w-10 h-10 items-center justify-center rounded-xl border border-white/15 text-azul-200 hover:text-lima-500 hover:border-lima-500/60 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16.6 2h-3.02v13.63a2.9 2.9 0 1 1-2.9-2.9c.3 0 .58.05.85.13V9.77a6 6 0 0 0-.85-.06 5.98 5.98 0 1 0 5.98 5.98V8.61a7.6 7.6 0 0 0 4.44 1.42V7a4.6 4.6 0 0 1-3.1-1.5A4.62 4.62 0 0 1 16.6 2Z" />
                </svg>
              </a>
              <a
                href={WHATSAPP_URL}
                aria-label="WhatsApp de DE/SPORTS"
                className="inline-flex w-10 h-10 items-center justify-center rounded-xl border border-white/15 text-azul-200 hover:text-lima-500 hover:border-lima-500/60 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.94L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.12 15.08l-.3-.18-3.08.89.9-3-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.3 4.02c-.18 0-.47.07-.72.34-.25.27-.94.92-.94 2.24 0 1.32.96 2.6 1.1 2.78.13.18 1.86 2.98 4.6 4.06 2.28.9 2.74.72 3.24.67.5-.04 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.31-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07a7.42 7.42 0 0 1-2.18-1.35 8.2 8.2 0 0 1-1.51-1.88c-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.13-.6-1.46-.83-2-.2-.46-.4-.4-.55-.41l-.53-.01Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-6xl mx-auto px-6 md:px-10 py-5 text-xs text-azul-400">
            © {new Date().getFullYear()} DE/SPORTS · Juega hoy, revívelo siempre
            <span className="block sm:inline sm:ml-3 text-azul-400/70">
              Fotografías: Unsplash — W. Tingey, I. Helmi, J. Glas, D. Clarke
            </span>
          </p>
        </div>
      </footer>
    </main>
  );
}
