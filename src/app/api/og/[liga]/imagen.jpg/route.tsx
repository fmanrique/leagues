import { ImageResponse } from "next/og";
import { getLigaPublica } from "@/lib/public-data";
import { fontOg, comoJpeg } from "@/lib/imagen-og";

const size = { width: 1200, height: 630 };

// Satori sólo decodifica PNG/JPEG; los uploads ya vienen normalizados así
function usable(url: string | null): string | null {
  return url && /\.(png|jpe?g)$/i.test(url) ? url : null;
}

/**
 * og:image por liga en JPEG con URL limpia (/api/og/<slug>/imagen.jpg):
 * los crawlers de Facebook/X no procesan bien los PNG dinámicos con hash
 * de la convención opengraph-image.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ liga: string }> }) {
  const { liga: slug } = await params;
  const liga = await getLigaPublica(slug);
  const [m800i, m600] = await Promise.all([
    fontOg("montserrat-800-italic.ttf"),
    fontOg("montserrat-600.ttf"),
  ]);

  const primario = liga?.colorPrimario ?? "#024BCD";
  const secundario = liga?.colorSecundario ?? "#0f172a";
  const logo = usable(liga?.logoUrl ?? null);

  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(135deg, ${primario} 0%, ${secundario} 100%)`,
          fontFamily: "Montserrat",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              width={120}
              height={120}
              style={{ objectFit: "contain", borderRadius: 24, background: "rgba(255,255,255,0.12)", padding: 12 }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 120, height: 120, borderRadius: 24,
                background: "rgba(255,255,255,0.15)", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 64, fontWeight: 800, fontStyle: "italic",
              }}
            >
              {(liga?.nombre ?? "DS")[0]}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#fff", fontSize: 58, fontWeight: 800, fontStyle: "italic", lineHeight: 1.1 }}>
              {liga?.nombre ?? "DE/SPORTS"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 26, fontWeight: 600, marginTop: 10 }}>
              Calendario · Resultados · Tabla · Goleo
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
          <div style={{ color: "#C4FF02", fontSize: 30, fontWeight: 800, fontStyle: "italic", display: "flex" }}>
            DE/SPORTS
          </div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 22, fontWeight: 600, display: "flex" }}>
            Juega hoy, revívelo siempre
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Montserrat", data: m800i, weight: 800, style: "italic" },
        { name: "Montserrat", data: m600, weight: 600, style: "normal" },
      ],
    }
  );
  return comoJpeg(png, `liga-${slug}.jpg`, 3600);
}
