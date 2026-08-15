import { ImageResponse } from "next/og";
import { getLigaPublica, getTorneosPublicos } from "@/lib/public-data";
import { computeGoleadores } from "@/lib/stats";
import { fontOg, imagenUsable, absolutaDesde } from "@/lib/imagen-og";

const W = 1080;
const H = 1350;
// Máximo de goleadores por imagen: con más se pagina (?p=N), como la tabla
const POR_PAGINA = 10;
// Tope de la lista completa (empata con la página pública de goleo)
const MAX_GOLEADORES = 50;

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

  const todos = await computeGoleadores(torneo.id, MAX_GOLEADORES);
  if (!todos.length) return new Response("Sin goles registrados", { status: 404 });

  const url = new URL(req.url);
  const totalPaginas = Math.ceil(todos.length / POR_PAGINA);
  const pagina = Number(url.searchParams.get("p") ?? "1");
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > totalPaginas) {
    return new Response("Página inválida", { status: 404 });
  }
  const desde = (pagina - 1) * POR_PAGINA;
  const goleadores = todos.slice(desde, desde + POR_PAGINA);
  // Escala grande solo cuando TODO el goleo cabe en una imagen de ≤5 filas;
  // con paginado todas las páginas usan la escala compacta (misma geometría)
  const grande = totalPaginas === 1 && goleadores.length <= 5;
  // Última página con menos filas: relleno invisible para que las filas
  // reales midan lo mismo que en las páginas completas
  const relleno = totalPaginas > 1 ? POR_PAGINA - goleadores.length : 0;
  const absoluta = absolutaDesde(url.origin);
  const [fondo, logoLiga] = await Promise.all([
    imagenUsable(absoluta(liga.fondoRolUrl)),
    imagenUsable(absoluta(liga.logoUrl)),
  ]);
  const logoDesports = `${url.origin}/brand/logo-blanco.png`;

  const [m800i, m700i, m600, m400] = await Promise.all([
    fontOg("montserrat-800-italic.ttf"),
    fontOg("montserrat-700-italic.ttf"),
    fontOg("montserrat-600.ttf"),
    fontOg("montserrat-400.ttf"),
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

          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 40 }}>
            <span style={{ fontFamily: "MontserratBlackItalic", fontSize: 80, color: liga.colorAcento, lineHeight: 1 }}>
              TABLA DE GOLEO
            </span>
          </div>
          <span style={{ fontSize: 24, color: "#ffffffCC", marginTop: 6, letterSpacing: 2 }}>
            {totalPaginas > 1 ? `LUGARES ${desde + 1}–${desde + goleadores.length}` : `LOS ${goleadores.length} MEJORES`}
          </span>

          {/* Filas */}
          <div style={{ display: "flex", flexDirection: "column", gap: grande ? 22 : 12, marginTop: grande ? 36 : 28, flexGrow: 1 }}>
            {goleadores.map((g, i) => {
              const lugar = desde + i + 1;
              const lider = lugar === 1;
              return (
                <div
                  key={g.jugadorId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: lider ? "#ffffff24" : "#ffffff14",
                    borderLeft: `10px solid ${lider ? liga.colorAcento : liga.colorPrimario}`,
                    borderRadius: grande ? 18 : 16,
                    padding: grande ? "0 44px" : "0 34px",
                    flexGrow: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "MontserratBlackItalic",
                      fontSize: lider ? (grande ? 64 : 44) : grande ? 48 : 34,
                      color: lider ? liga.colorAcento : "#ffffff8C",
                      width: grande ? 96 : 78,
                      flexShrink: 0,
                    }}
                  >
                    {lugar}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "MontserratSemi",
                        fontSize: lider ? (grande ? 40 : 32) : grande ? 33 : 28,
                        color: "#ffffff",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        lineHeight: 1.15,
                      }}
                    >
                      {g.nombre}
                    </span>
                    <span style={{ fontSize: grande ? (lider ? 24 : 21) : 18, color: "#ffffffB3", marginTop: grande ? 4 : 2, overflow: "hidden", whiteSpace: "nowrap" }}>
                      {g.equipo}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginLeft: 20 }}>
                    <span style={{ fontFamily: "MontserratBlackItalic", fontSize: lider ? (grande ? 72 : 48) : grande ? 56 : 40, color: liga.colorAcento, lineHeight: 1 }}>
                      {g.goles}
                    </span>
                    <span style={{ fontSize: grande ? 18 : 14, color: "#ffffff99", letterSpacing: 2 }}>
                      {g.goles === 1 ? "GOL" : "GOLES"}
                    </span>
                  </div>
                </div>
              );
            })}
            {Array.from({ length: relleno }, (_, i) => (
              <div key={`relleno-${i}`} style={{ display: "flex", flexGrow: 1 }} />
            ))}
          </div>

          {/* Pie: paginación a la izquierda, DE/SPORTS a la derecha */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: grande ? 28 : 22 }}>
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
        "Content-Disposition": `inline; filename="goleo-${slug}${totalPaginas > 1 ? `-parte-${pagina}` : ""}.png"`,
      },
    }
  );
}
