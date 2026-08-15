"use client";
import { useState } from "react";

/**
 * Carrusel + acciones de descarga/compartir para imágenes generadas con el
 * branding de la liga (rol de juegos, tabla de posiciones, goleo). Con una
 * sola imagen no hay flechas ni miniaturas; con varias se navega y las
 * acciones aplican a la imagen visible.
 */
export default function ImagenCarrusel({ paginas, alt, archivoBase, titulo, cajaTitulo, descripcion, notaPreview }: {
  paginas: string[]; // URLs de cada imagen, en orden
  alt: string;
  archivoBase: string; // "tabla-liga-mty"
  titulo: string; // texto al compartir
  cajaTitulo: string; // encabezado del panel de acciones
  descripcion: string;
  notaPreview?: string; // nota sobre la vista previa del link (desktop)
}) {
  const [idx, setIdx] = useState(0);
  const varias = paginas.length > 1;
  const actual = paginas[idx];
  const nombreArchivo = varias ? `${archivoBase}-parte-${idx + 1}.png` : `${archivoBase}.png`;

  return (
    <div className="grid lg:grid-cols-[minmax(0,480px)_1fr] gap-8 items-start">
      <div>
        <div className="relative">
          {/* Todas las páginas se montan y precargan: cambiar de imagen es
              instantáneo en vez de esperar la generación de cada PNG */}
          {paginas.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={i === idx ? `${alt}${varias ? `, parte ${i + 1} de ${paginas.length}` : ""}` : ""}
              width={1080}
              height={1350}
              className={`w-full rounded-2xl border border-ink-200 shadow-lg ${i === idx ? "" : "hidden"}`}
            />
          ))}
          {varias && (
            <>
              <button
                onClick={() => setIdx((i) => (i - 1 + paginas.length) % paginas.length)}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-xl font-bold backdrop-blur-sm transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => setIdx((i) => (i + 1) % paginas.length)}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-xl font-bold backdrop-blur-sm transition-colors"
              >
                ›
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/50 text-white text-xs font-bold px-2.5 py-1 backdrop-blur-sm">
                {idx + 1} / {paginas.length}
              </span>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {varias && (
          <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1" role="tablist" aria-label="Partes de la imagen">
            {paginas.map((url, i) => (
              <button
                key={url}
                role="tab"
                aria-selected={i === idx}
                aria-label={`Parte ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? "shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                style={i === idx ? { borderColor: "var(--lg-primario)" } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" width={64} height={80} className="w-16 h-20 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AccionesCompartir
        imgUrl={actual}
        nombreArchivo={nombreArchivo}
        titulo={titulo}
        cajaTitulo={cajaTitulo}
        descripcion={descripcion}
        notaPreview={notaPreview}
      />
    </div>
  );
}

function IconoFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.09 24 12.07z" />
    </svg>
  );
}

function IconoX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
    </svg>
  );
}

function IconoLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function AccionesCompartir({ imgUrl, nombreArchivo, titulo, cajaTitulo, descripcion, notaPreview }: {
  imgUrl: string; nombreArchivo: string; titulo: string;
  cajaTitulo: string; descripcion: string; notaPreview?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  /** URL actual de la página (incluye torneo y jornada) para compartir. */
  const urlActual = () => (typeof window !== "undefined" ? window.location.href : "");

  const abrirShare = (red: "facebook" | "x" | "linkedin") => {
    const url = encodeURIComponent(urlActual());
    const texto = encodeURIComponent(titulo);
    const destinos = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${texto}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(destinos[red], "_blank", "noopener,noreferrer,width=640,height=560");
  };

  // Mobile: share nativo con la imagen adjunta (WhatsApp/Instagram directo)
  const compartirNativo = async () => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], nombreArchivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: titulo, text: titulo });
        return;
      }
      await navigator.clipboard.writeText(urlActual());
      setMsg("Link copiado al portapapeles");
      setTimeout(() => setMsg(null), 3000);
    } catch {
      /* usuario canceló el share */
    }
  };

  const iconBtn =
    "inline-flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-colors";
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "var(--lg-primario)";
    e.currentTarget.style.color = "#fff";
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "var(--lg-primario)";
  };

  return (
    <div className="bg-white rounded-2xl border border-ink-200 shadow-sm p-6 space-y-4">
      <h3 className="font-bold text-ink-900">{cajaTitulo}</h3>
      <p className="text-sm text-ink-500">{descripcion}</p>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={imgUrl}
          download={nombreArchivo}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--lg-primario)" }}
        >
          ⬇ Descargar PNG
        </a>

        {/* Solo mobile: share nativo con la imagen adjunta */}
        <button
          onClick={compartirNativo}
          className="sm:hidden inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold"
          style={{ borderColor: "var(--lg-primario)", color: "var(--lg-primario)" }}
        >
          ↗ Compartir
        </button>
      </div>

      {/* Compartir en redes: se comparte el link de esta página */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-sm font-semibold text-ink-700">Compartir en:</span>
        <button
          onClick={() => abrirShare("facebook")}
          aria-label="Compartir en Facebook"
          title="Facebook"
          className={iconBtn}
          style={{ borderColor: "var(--lg-primario)", color: "var(--lg-primario)" }}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        >
          <IconoFacebook />
        </button>
        <button
          onClick={() => abrirShare("x")}
          aria-label="Compartir en X (Twitter)"
          title="X (Twitter)"
          className={iconBtn}
          style={{ borderColor: "var(--lg-primario)", color: "var(--lg-primario)" }}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        >
          <IconoX />
        </button>
        <button
          onClick={() => abrirShare("linkedin")}
          aria-label="Compartir en LinkedIn"
          title="LinkedIn"
          className={iconBtn}
          style={{ borderColor: "var(--lg-primario)", color: "var(--lg-primario)" }}
          onMouseEnter={hoverOn}
          onMouseLeave={hoverOff}
        >
          <IconoLinkedIn />
        </button>
      </div>

      {msg && <p className="text-sm font-semibold text-ink-600">{msg}</p>}
      <p className="text-xs text-ink-400 sm:hidden">
        En el celular, &ldquo;Compartir&rdquo; abre WhatsApp/Instagram directamente con la imagen adjunta.
      </p>
      {notaPreview && <p className="text-xs text-ink-400 hidden sm:block">{notaPreview}</p>}
    </div>
  );
}
