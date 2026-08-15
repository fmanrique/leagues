import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy (antes middleware): chequeo optimista (solo presencia de cookie): la verificación real de la
// sesión ocurre en la capa de datos (requireUser) — el edge no toca Postgres.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("calccio_session");

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !hasSession) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
