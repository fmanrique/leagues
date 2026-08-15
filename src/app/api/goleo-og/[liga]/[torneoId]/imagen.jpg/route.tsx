import { ImageResponse } from "next/og";
import { getLigaPublica, getTorneosPublicos } from "@/lib/public-data";
import { computeGoleadores } from "@/lib/stats";
import { fontOg, imagenUsable, absolutaDesde, comoJpeg } from "@/lib/imagen-og";

/**
 * OG image del goleo (1200×630, JPEG con URL .jpg): vista previa al compartir
 * la página de goleo. Muestra hasta los primeros 10 lugares; la leyenda TOP 10
 * solo aparece cuando hay más de 10 goleadores.
 */

const W = 1200;
const H = 630;
const TOP = 10;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ liga: string; torneoId: string }> }
) {
  const { liga: slug, torneoId } = await params;

  const liga = await getLigaPublica(slug);
  if (!liga) return new Response("Liga no encontrada", { status: 404 });
  const torneos = await getTorneosPublicos(liga.id);
  const torneo = torneos.find((t) => t.id === torneoId);
  if (!torneo) return new Response("Torneo no encontrado", { status: 404 });

  const todos = await computeGoleadores(torneo.id, TOP + 1);
  if (!todos.length) return new Response("Sin goles registrados", { status: 404 });

  const esTop = todos.length > TOP;
  const filas = todos.slice(0, TOP);
  const porCol = Math.ceil(filas.length / 2);
  const columnas = [filas.slice(0, porCol), filas.slice(porCol)].filter((c) => c.length);

  const url = new URL(req.url);
  const absoluta = absolutaDesde(url.origin);
  const [fondoOg, logoLiga] = await Promise.all([
    imagenUsable(absoluta(liga.fondoOgUrl)),
    imagenUsable(absoluta(liga.logoUrl)),
  ]);
  const logoDesports = `${url.origin}/brand/logo-blanco.png`;

  const [m800i, m700i, m600] = await Promise.all([
    fontOg("montserrat-800-italic.ttf"),
    fontOg("montserrat-700-italic.ttf"),
    fontOg("montserrat-600.ttf"),
  ]);

  const png = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: liga.colorSecundario,
          position: "relative",
          fontFamily: "MontserratSemi",
          padding: "36px 48px 28px",
        }}
      >
        {fondoOg ? (
          <img
            src={fondoOg}
            width={W}
            height={H}
            style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
            <div style={{ position: "absolute", right: -120, top: -140, width: 380, height: 380, borderRadius: 380, backgroundColor: liga.colorPrimario, opacity: 0.35 }} />
            <div style={{ position: "absolute", left: -100, bottom: -160, width: 320, height: 320, borderRadius: 320, backgroundColor: liga.colorAcento, opacity: 0.2 }} />
          </div>
        )}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
            background: `linear-gradient(180deg, ${liga.colorSecundario}E6 0%, ${liga.colorSecundario}99 45%, ${liga.colorSecundario}E6 100%)`,
          }}
        />

        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logoLiga && (
              <img src={logoLiga} width={64} height={64} style={{ borderRadius: 14, objectFit: "contain" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "MontserratBoldItalic", fontSize: 30, color: "#ffffff" }}>{liga.nombre}</span>
              <span style={{ fontSize: 19, color: "#ffffffB3", marginTop: 2 }}>{torneo.nombre}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontFamily: "MontserratBlackItalic", fontSize: 52, color: liga.colorAcento, lineHeight: 1 }}>
              TABLA DE GOLEO
            </span>
            {esTop && (
              <span style={{ fontSize: 17, color: "#ffffffCC", letterSpacing: 3, marginTop: 4 }}>TOP 10</span>
            )}
          </div>
        </div>

        {/* Goleadores en dos columnas */}
        <div style={{ display: "flex", gap: 18, marginTop: 22, flexGrow: 1, position: "relative" }}>
          {columnas.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 10, flexGrow: 1, flexBasis: 0, justifyContent: "center" }}>
              {col.map((g, i) => {
                const lugar = ci * porCol + i + 1;
                const lider = lugar === 1;
                return (
                  <div
                    key={g.jugadorId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: lider ? "#ffffff24" : "#ffffff14",
                      borderLeft: `6px solid ${lider ? liga.colorAcento : liga.colorPrimario}`,
                      borderRadius: 12,
                      padding: "8px 18px",
                      flexGrow: 1,
                    }}
                  >
                    <span style={{ fontFamily: "MontserratBlackItalic", fontSize: 26, color: lider ? liga.colorAcento : "#ffffff8C", width: 46, flexShrink: 0 }}>
                      {lugar}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
                      <span style={{ fontFamily: "MontserratSemi", fontSize: 22, color: "#ffffff", overflow: "hidden", whiteSpace: "nowrap", lineHeight: 1.15 }}>
                        {g.nombre}
                      </span>
                      <span style={{ fontSize: 15, color: "#ffffffB3", marginTop: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
                        {g.equipo}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ fontFamily: "MontserratBlackItalic", fontSize: 28, color: liga.colorAcento }}>{g.goles}</span>
                      <span style={{ fontSize: 14, color: "#ffffff99", letterSpacing: 1 }}>
                        {g.goles === 1 ? "GOL" : "GOLES"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pie: DE/SPORTS a la derecha */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 14, position: "relative" }}>
          <img src={logoDesports} width={170} height={36} />
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "MontserratBlackItalic", data: m800i, weight: 800, style: "italic" },
        { name: "MontserratBoldItalic", data: m700i, weight: 700, style: "italic" },
        { name: "MontserratSemi", data: m600, weight: 600 },
      ],
    }
  );
  return comoJpeg(png, `goleo-${slug}.jpg`, 60);
}
