import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLigaPublica, getPartidosPublicos, getTorneosPublicos } from "@/lib/public-data";

const W = 1080;
const H = 1350;

async function font(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), "src", "assets", "fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const FORMATOS_SATORI = ["image/png", "image/jpeg"];
const MAX_IMAGEN = 6 * 1024 * 1024;

/**
 * Devuelve la URL sólo si la imagen es utilizable por Satori (PNG/JPEG y de un
 * tamaño razonable). Cualquier otra cosa devuelve null para que el rol se
 * genere sin esa imagen en vez de fallar por completo.
 */
async function imagenUsable(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const largo = Number(res.headers.get("content-length") ?? 0);
    if (!FORMATOS_SATORI.includes(tipo)) {
      console.warn(`[rol] imagen ignorada por formato ${tipo}: ${url}`);
      return null;
    }
    if (largo > MAX_IMAGEN) {
      console.warn(`[rol] imagen ignorada por tamaño (${largo} bytes): ${url}`);
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function fmtFecha(d: string) {
  const date = new Date(d + "T12:00:00");
  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return `${dias[date.getDay()]} ${date.getDate()} ${meses[date.getMonth()]}`;
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
  const deJornada = todos.filter((p) => p.jornada === jornada);
  if (!deJornada.length) return new Response("Jornada sin partidos", { status: 404 });

  // Paginado: máximo 4 partidos por imagen (?p=N)
  const POR_PAGINA = 4;
  const totalPaginas = Math.ceil(deJornada.length / POR_PAGINA);
  const url = new URL(req.url);
  const pagina = Number(url.searchParams.get("p") ?? "1");
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > totalPaginas) {
    return new Response("Página inválida", { status: 404 });
  }
  const partidos = deJornada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  // Última página con menos partidos: misma densidad y relleno invisible para
  // que las tarjetas midan lo mismo que en las páginas completas
  const relleno = totalPaginas > 1 ? POR_PAGINA - partidos.length : 0;

  const origin = new URL(req.url).origin;
  const absoluta = (u: string | null | undefined) =>
    u ? (u.startsWith("http") ? u : `${origin}${u}`) : null;

  // Satori sólo decodifica PNG/JPEG y se atraganta con archivos enormes. Si una
  // imagen no sirve, la omitimos: el rol se genera igual, sin ella.
  const [fondo, logoLiga] = await Promise.all([
    imagenUsable(absoluta(liga.fondoRolUrl)),
    imagenUsable(absoluta(liga.logoUrl)),
  ]);
  const logoDesports = `${origin}/brand/logo-blanco.png`;

  const fechas = [...new Set(partidos.map((p) => p.fecha))].sort();
  const rangoFechas = fechas.map(fmtFecha).join("  ·  ");

  // Densidad según partidos por jornada: todo debe caber en 1080×1350.
  // Ligas grandes (24 equipos = 12 partidos/jornada) usan la escala mínima;
  // con >12 se sacrifica la línea de cancha/árbitro. Con paginado, todas las
  // páginas (incluida la última) usan la densidad de una página completa.
  const n = totalPaginas > 1 ? POR_PAGINA : partidos.length;
  const d = n <= 4
    ? { gap: 26, pad: "30px 44px 26px", equipo: 36, marcador: 52, hora: 44, fecha: 20, info: 23, infoMt: 14, infoPt: 14, logo: 92, ligaFs: 34, torneoFs: 22, headerMt: 40, jornadaFs: 88, fechasFs: 24, listaMt: 32, pieMt: 24, conInfo: true, llenar: true }
    : n <= 6
    ? { gap: 16, pad: "18px 30px 14px", equipo: 29, marcador: 36, hora: 29, fecha: 16, info: 18, infoMt: 9, infoPt: 8, logo: 92, ligaFs: 34, torneoFs: 22, headerMt: 40, jornadaFs: 88, fechasFs: 24, listaMt: 36, pieMt: 28, conInfo: true }
    : n <= 8
    ? { gap: 12, pad: "14px 28px 11px", equipo: 27, marcador: 33, hora: 26, fecha: 15, info: 17, infoMt: 7, infoPt: 7, logo: 84, ligaFs: 32, torneoFs: 21, headerMt: 32, jornadaFs: 78, fechasFs: 22, listaMt: 28, pieMt: 22, conInfo: true , llenar: false }
    : n <= 10
    ? { gap: 10, pad: "11px 26px 9px", equipo: 25, marcador: 30, hora: 24, fecha: 14, info: 16, infoMt: 5, infoPt: 5, logo: 72, ligaFs: 30, torneoFs: 20, headerMt: 24, jornadaFs: 68, fechasFs: 20, listaMt: 22, pieMt: 18, conInfo: true , llenar: false }
    : n <= 12
    ? { gap: 7, pad: "7px 24px 6px", equipo: 22, marcador: 26, hora: 21, fecha: 12, info: 14, infoMt: 3, infoPt: 3, logo: 60, ligaFs: 28, torneoFs: 18, headerMt: 18, jornadaFs: 56, fechasFs: 18, listaMt: 16, pieMt: 12, conInfo: true , llenar: false }
    : { gap: 6, pad: "8px 22px 8px", equipo: 21, marcador: 24, hora: 20, fecha: 12, info: 0, infoMt: 0, infoPt: 0, logo: 54, ligaFs: 26, torneoFs: 17, headerMt: 14, jornadaFs: 50, fechasFs: 16, listaMt: 12, pieMt: 10, conInfo: false , llenar: false };

  const [m800i, m700i, m600, m400] = await Promise.all([
    font("montserrat-800-italic.ttf"),
    font("montserrat-700-italic.ttf"),
    font("montserrat-600.ttf"),
    font("montserrat-400.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: liga.colorSecundario,
          fontFamily: "MontserratRegular",
          position: "relative",
        }}
      >
        {/* Fondo personalizado o decoración con colores de la liga */}
        {fondo ? (
          <img
            src={fondo}
            width={W}
            height={H}
            style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
            <div style={{ position: "absolute", right: -140, top: -140, width: 480, height: 480, borderRadius: 480, backgroundColor: liga.colorPrimario, opacity: 0.5 }} />
            <div style={{ position: "absolute", left: -120, bottom: -160, width: 420, height: 420, borderRadius: 420, backgroundColor: liga.colorAcento, opacity: 0.25 }} />
          </div>
        )}
        {/* Velo para legibilidad */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
            background: `linear-gradient(180deg, ${liga.colorSecundario}E6 0%, ${liga.colorSecundario}99 35%, ${liga.colorSecundario}E6 100%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: n > 10 ? "40px 64px 28px" : "56px 64px 40px", position: "relative" }}>
          {/* Encabezado */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {logoLiga && (
              <img src={logoLiga} width={d.logo} height={d.logo} style={{ borderRadius: 16, objectFit: "contain" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "MontserratBoldItalic", fontSize: d.ligaFs, color: "#ffffff", lineHeight: 1.1 }}>
                {liga.nombre}
              </span>
              <span style={{ fontSize: d.torneoFs, color: "#ffffffB3", marginTop: 4 }}>{torneo.nombre}</span>
            </div>
          </div>

          {/* Título de jornada */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: d.headerMt }}>
            <span style={{ fontFamily: "MontserratBlackItalic", fontSize: d.jornadaFs, color: liga.colorAcento, lineHeight: 1 }}>
              JORNADA {jornada}
            </span>
          </div>
          <span style={{ fontSize: d.fechasFs, color: "#ffffffCC", marginTop: 6, letterSpacing: 2 }}>{rangoFechas}</span>

          {/* Partidos */}
          <div style={{ display: "flex", flexDirection: "column", gap: d.gap, marginTop: d.listaMt, flexGrow: 1, justifyContent: "flex-start" }}>
            {partidos.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  backgroundColor: "#ffffff14",
                  borderLeft: `10px solid ${liga.colorPrimario}`,
                  borderRadius: 18,
                  padding: d.pad,
                  ...(d.llenar ? { flexGrow: 1 } : {}),
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "MontserratSemi",
                      fontSize: d.equipo,
                      color: "#ffffff",
                      flexGrow: 1,
                      flexBasis: 0,
                      minWidth: 0,
                      overflow: "hidden",
                      lineHeight: 1.12,
                      ...(d.llenar ? { lineClamp: 2 } : { whiteSpace: "nowrap" }),
                    }}
                  >
                    {p.local.nombre}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 190, flexShrink: 0 }}>
                    {p.estado === "finalizado" ? (
                      <span style={{ fontFamily: "MontserratBlackItalic", fontSize: d.marcador, color: liga.colorAcento }}>
                        {p.golesLocal} - {p.golesVisitante}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "MontserratBoldItalic", fontSize: d.hora, color: liga.colorAcento }}>
                        {p.hora}
                      </span>
                    )}
                    <span style={{ fontSize: d.fecha, color: "#ffffff99", marginTop: 2 }}>{fmtFecha(p.fecha)}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: "MontserratSemi",
                      fontSize: d.equipo,
                      color: "#ffffff",
                      flexGrow: 1,
                      flexBasis: 0,
                      minWidth: 0,
                      overflow: "hidden",
                      lineHeight: 1.12,
                      justifyContent: "flex-end",
                      textAlign: "right",
                      ...(d.llenar ? { lineClamp: 2 } : { whiteSpace: "nowrap" }),
                    }}
                  >
                    {p.visitante.nombre}
                  </span>
                </div>
                {/* Cancha y árbitro del partido (se omite en jornadas de >12 partidos) */}
                {d.conInfo && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 26,
                      marginTop: d.infoMt,
                      paddingTop: d.infoPt,
                      borderTop: "1px solid #ffffff1f",
                    }}
                  >
                    <span style={{ fontSize: d.info, color: "#ffffffB3" }}>
                      ⚽ {p.cancha ?? "Cancha por definir"}
                    </span>
                    <span style={{ fontSize: d.info, color: "#ffffffB3" }}>
                      🏳 Árbitro: {p.arbitro ?? "Por asignar"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {Array.from({ length: relleno }, (_, i) => (
              <div key={`relleno-${i}`} style={{ display: "flex", ...(d.llenar ? { flexGrow: 1 } : {}) }} />
            ))}
          </div>

          {/* Pie: paginación a la izquierda, DE/SPORTS a la derecha */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: d.pieMt }}>
            <span style={{ fontFamily: "MontserratBoldItalic", fontSize: 26, color: "#ffffff8C" }}>
              {totalPaginas > 1 ? `${pagina}/${totalPaginas}` : ""}
            </span>
            <img src={logoDesports} width={n > 10 ? 170 : 214} height={n > 10 ? 36 : 45} />
          </div>
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
        { name: "MontserratRegular", data: m400, weight: 400 },
      ],
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "Content-Disposition": `inline; filename="rol-jornada-${jornada}${totalPaginas > 1 ? `-parte-${pagina}` : ""}.png"`,
      },
    }
  );
}
