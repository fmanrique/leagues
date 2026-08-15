import { ImageResponse } from "next/og";
import { getLigaPublica, getTorneosPublicos } from "@/lib/public-data";
import { computeStandings } from "@/lib/stats";
import { fontOg, imagenUsable, absolutaDesde } from "@/lib/imagen-og";

const W = 1080;
const H = 1350;
// Máximo de equipos por imagen: con más se pagina (?p=N), como el rol
const POR_PAGINA = 10;

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

  const tabla = await computeStandings(torneo.id);
  if (!tabla.length) return new Response("Tabla sin datos", { status: 404 });

  const totalPaginas = Math.ceil(tabla.length / POR_PAGINA);
  const url = new URL(req.url);
  const pagina = Number(url.searchParams.get("p") ?? "1");
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > totalPaginas) {
    return new Response("Página inválida", { status: 404 });
  }
  const desde = (pagina - 1) * POR_PAGINA;
  const filas = tabla.slice(desde, desde + POR_PAGINA);
  // Última página con menos filas: relleno invisible para que las filas
  // reales midan lo mismo que en las páginas completas
  const relleno = totalPaginas > 1 ? POR_PAGINA - filas.length : 0;

  const absoluta = absolutaDesde(url.origin);
  const [fondo, logoLiga] = await Promise.all([
    imagenUsable(absoluta(liga.fondoRolUrl)),
    imagenUsable(absoluta(liga.logoUrl)),
  ]);
  const logoDesports = `${url.origin}/brand/logo-blanco.png`;

  // Densidad: hasta 8 filas se estira para llenar; con más se compacta
  const n = filas.length;
  const d = n <= 8
    ? { fila: 30, num: 26, pos: 30, pad: "0 34px", llenar: true }
    : { fila: 26, num: 23, pos: 26, pad: "0 30px", llenar: true };

  const [m800i, m700i, m600, m400] = await Promise.all([
    fontOg("montserrat-800-italic.ttf"),
    fontOg("montserrat-700-italic.ttf"),
    fontOg("montserrat-600.ttf"),
    fontOg("montserrat-400.ttf"),
  ]);

  const colNum = (v: number | string, opts?: { bold?: boolean; color?: string }) => (
    <span
      style={{
        width: 74,
        flexShrink: 0,
        textAlign: "center",
        justifyContent: "center",
        display: "flex",
        fontSize: d.num,
        color: opts?.color ?? "#ffffffCC",
        ...(opts?.bold ? { fontFamily: "MontserratBoldItalic" } : {}),
      }}
    >
      {v}
    </span>
  );

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
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
            background: `linear-gradient(180deg, ${liga.colorSecundario}E6 0%, ${liga.colorSecundario}99 35%, ${liga.colorSecundario}E6 100%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "56px 64px 40px", position: "relative" }}>
          {/* Encabezado */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {logoLiga && (
              <img src={logoLiga} width={92} height={92} style={{ borderRadius: 16, objectFit: "contain" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "MontserratBoldItalic", fontSize: 34, color: "#ffffff", lineHeight: 1.1 }}>
                {liga.nombre}
              </span>
              <span style={{ fontSize: 22, color: "#ffffffB3", marginTop: 4 }}>{torneo.nombre}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 36 }}>
            <span style={{ fontFamily: "MontserratBlackItalic", fontSize: 74, color: liga.colorAcento, lineHeight: 1 }}>
              TABLA GENERAL
            </span>
          </div>
          {totalPaginas > 1 && (
            <span style={{ fontSize: 24, color: "#ffffffCC", marginTop: 6, letterSpacing: 2 }}>
              POSICIONES {desde + 1}–{desde + filas.length}
            </span>
          )}

          {/* Encabezados de columna */}
          <div style={{ display: "flex", alignItems: "center", padding: d.pad, marginTop: 28, marginBottom: 10 }}>
            <span style={{ width: 64, flexShrink: 0, fontSize: 20, color: "#ffffff8C", fontFamily: "MontserratSemi" }}>#</span>
            <span style={{ flexGrow: 1, fontSize: 20, color: "#ffffff8C", fontFamily: "MontserratSemi" }}>EQUIPO</span>
            {["JJ", "G", "E", "P", "DIF", "PTS"].map((h) => (
              <span key={h} style={{ width: 74, flexShrink: 0, textAlign: "center", justifyContent: "center", display: "flex", fontSize: 20, color: "#ffffff8C", fontFamily: "MontserratSemi" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Filas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexGrow: 1 }}>
            {filas.map((r, i) => {
              const pos = desde + i + 1;
              const destacado = pos <= 4;
              return (
                <div
                  key={r.equipoId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: destacado ? "#ffffff24" : "#ffffff14",
                    borderLeft: `10px solid ${destacado ? liga.colorAcento : liga.colorPrimario}`,
                    borderRadius: 16,
                    padding: d.pad,
                    ...(d.llenar ? { flexGrow: 1 } : { height: 84 }),
                  }}
                >
                  <span style={{ width: 64, flexShrink: 0, fontFamily: "MontserratBlackItalic", fontSize: d.pos, color: destacado ? liga.colorAcento : "#ffffff8C" }}>
                    {pos}
                  </span>
                  <span
                    style={{
                      flexGrow: 1,
                      flexBasis: 0,
                      minWidth: 0,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      fontFamily: "MontserratSemi",
                      fontSize: d.fila,
                      color: "#ffffff",
                    }}
                  >
                    {r.nombre}
                  </span>
                  {colNum(r.pj)}
                  {colNum(r.pg)}
                  {colNum(r.pe)}
                  {colNum(r.pp)}
                  {colNum(r.dif > 0 ? `+${r.dif}` : r.dif)}
                  {colNum(r.pts, { bold: true, color: liga.colorAcento })}
                </div>
              );
            })}
            {Array.from({ length: relleno }, (_, i) => (
              <div key={`relleno-${i}`} style={{ display: "flex", flexGrow: 1 }} />
            ))}
          </div>

          {/* Pie: paginación a la izquierda, DE/SPORTS a la derecha */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
            <span style={{ fontFamily: "MontserratBoldItalic", fontSize: 26, color: "#ffffff8C" }}>
              {totalPaginas > 1 ? `${pagina}/${totalPaginas}` : ""}
            </span>
            <img src={logoDesports} width={214} height={45} />
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
        "Content-Disposition": `inline; filename="tabla-${slug}${totalPaginas > 1 ? `-parte-${pagina}` : ""}.png"`,
      },
    }
  );
}
