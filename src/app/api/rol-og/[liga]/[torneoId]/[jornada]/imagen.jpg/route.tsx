import { ImageResponse } from "next/og";
import { getLigaPublica, getPartidosPublicos, getTorneosPublicos } from "@/lib/public-data";
import { fontOg as font, comoJpeg } from "@/lib/imagen-og";

/**
 * OG image del rol (1200×630, formato link-preview): la jornada COMPLETA en
 * una sola imagen, sin dividir — es la vista previa al compartir la URL en
 * Facebook/X/LinkedIn/WhatsApp. Se sirve como JPEG con URL terminada en .jpg
 * (los crawlers de redes no procesan bien PNG dinámicos). La imagen 1080×1350
 * paginada es aparte.
 */

const W = 1200;
const H = 630;

function fmtFecha(d: string) {
  const date = new Date(d + "T12:00:00");
  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return `${dias[date.getDay()]} ${date.getDate()} ${meses[date.getMonth()]}`;
}

// Sólo PNG/JPEG servibles a Satori; los uploads ya vienen normalizados así
function usable(url: string | null | undefined): string | null {
  return url && /\.(png|jpe?g)$/i.test(url) ? url : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ liga: string; torneoId: string; jornada: string }> }
) {
  const { liga: slug, torneoId, jornada: jornadaRaw } = await params;
  const jornada = Number(jornadaRaw);
  if (!Number.isInteger(jornada) || jornada < 1) return new Response("Jornada inválida", { status: 400 });

  const liga = await getLigaPublica(slug);
  if (!liga) return new Response("Liga no encontrada", { status: 404 });
  const torneos = await getTorneosPublicos(liga.id);
  const torneo = torneos.find((t) => t.id === torneoId);
  if (!torneo) return new Response("Torneo no encontrado", { status: 404 });

  const todos = await getPartidosPublicos(torneo.id);
  const partidos = todos.filter((p) => p.jornada === jornada);
  if (!partidos.length) return new Response("Jornada sin partidos", { status: 404 });

  const n = partidos.length;
  // 1 columna hasta 6 partidos; 2 columnas después (hasta ~16 legible)
  const cols = n <= 6 ? 1 : 2;
  const porCol = Math.ceil(n / cols);
  const columnas = Array.from({ length: cols }, (_, c) =>
    partidos.slice(c * porCol, (c + 1) * porCol)
  );
  const fs = n <= 4 ? 26 : n <= 6 ? 23 : n <= 10 ? 20 : n <= 14 ? 17 : 15;
  const fsSub = n <= 4 ? 16 : n <= 6 ? 15 : n <= 10 ? 13 : 12;
  const rowPad = n <= 6 ? "12px 20px 9px" : n <= 10 ? "8px 16px 6px" : "6px 14px 5px";
  const gap = n <= 6 ? 10 : 6;

  const fechas = [...new Set(partidos.map((p) => p.fecha))].sort().map(fmtFecha).join(" · ");

  const origin = new URL(req.url).origin;
  const absoluta = (u: string | null | undefined) =>
    u ? (u.startsWith("http") ? u : `${origin}${u}`) : null;
  const fondoOg = usable(absoluta(liga.fondoOgUrl));
  const logoLiga = usable(absoluta(liga.logoUrl));
  const logoDesports = `${origin}/brand/logo-blanco.png`;

  const [m800i, m700i, m600] = await Promise.all([
    font("montserrat-800-italic.ttf"),
    font("montserrat-700-italic.ttf"),
    font("montserrat-600.ttf"),
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
        {/* Fondo custom de la liga o decoración con sus colores */}
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
        {/* Velo para legibilidad sobre el fondo */}
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
              JORNADA {jornada}
            </span>
            <span style={{ fontSize: 17, color: "#ffffffCC", letterSpacing: 2, marginTop: 4 }}>{fechas}</span>
          </div>
        </div>

        {/* Partidos: jornada completa */}
        <div style={{ display: "flex", gap: 18, marginTop: 22, flexGrow: 1, position: "relative" }}>
          {columnas.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap, flexGrow: 1, flexBasis: 0, justifyContent: "center" }}>
              {col.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#ffffff14",
                    borderLeft: `6px solid ${liga.colorPrimario}`,
                    borderRadius: 12,
                    padding: rowPad,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: fs, color: "#ffffff", flexGrow: 1, flexBasis: 0, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textAlign: "right", justifyContent: "flex-end" }}>
                      {p.local.nombre}
                    </span>
                    <span style={{ fontFamily: "MontserratBoldItalic", fontSize: fs, color: liga.colorAcento, width: n <= 6 ? 120 : 96, flexShrink: 0, justifyContent: "center", textAlign: "center" }}>
                      {p.estado === "finalizado" ? `${p.golesLocal}-${p.golesVisitante}` : "VS"}
                    </span>
                    <span style={{ fontSize: fs, color: "#ffffff", flexGrow: 1, flexBasis: 0, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
                      {p.visitante.nombre}
                    </span>
                  </div>
                  {/* Día, hora y cancha del partido */}
                  <span style={{ fontSize: fsSub, color: "#ffffff99", marginTop: 3, justifyContent: "center", textAlign: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {`${fmtFecha(p.fecha)} · ${p.hora} hrs${p.cancha ? ` · ${p.cancha}` : ""}`}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Pie: solo el logo DE/SPORTS */}
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
  return comoJpeg(png, `rol-${slug}-j${jornada}.jpg`, 60);
}
