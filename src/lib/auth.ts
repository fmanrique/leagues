import "server-only";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, lt, ne } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { db, tables as t } from "@/db";

export const SESSION_COOKIE = "calccio_session";
const SESSION_HOURS = 8;

/**
 * Cookies Secure solo cuando el sitio corre sobre HTTPS. En el Mac (review vía
 * Tailscale http://100.92.10.40) SESSION_SECURE=false; en Vercel queda true.
 */
export function cookieSecure(): boolean {
  if (process.env.SESSION_SECURE != null) return process.env.SESSION_SECURE === "true";
  return process.env.NODE_ENV === "production";
}

export type SessionUser = {
  id: string;
  username: string;
  nombre: string;
  fotoUrl: string | null;
  rol: "superadmin" | "admin_liga" | "admin_equipo" | "arbitro";
  ligaId: string | null;
  equipoId: string | null;
  arbitroId: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ── Rate limit de login (best-effort por instancia) ──────────────────────────
const attempts = new Map<string, { count: number; resetAt: number }>();
export function loginRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10; // 10 intentos / 10 min
}

// ── Login / logout ───────────────────────────────────────────────────────────

/**
 * Hash argon2 de relleno: cuando el usuario no existe se verifica contra esto
 * para que la latencia sea la misma que con un usuario real (evita enumerar
 * usernames midiendo tiempos de respuesta).
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$/iIbddju+NBz3H6aV8HTkA$mhvBEMzLQw4lqJH88SsXeFhTuAQ8mhlfh1YJmeWUMLA";

export async function login(username: string, password: string): Promise<SessionUser | "inactivo" | null> {
  const user = await db.query.usuarios.findFirst({
    where: (u, { eq }) => eq(u.username, username),
  });
  if (!user) {
    await verify(DUMMY_HASH, password).catch(() => false);
    return null;
  }
  const ok = await verify(user.passwordHash, password);
  if (!ok) return null;
  // Con credenciales correctas sí se informa la desactivación (si no, el
  // usuario pensará que olvidó su contraseña)
  if (!user.activo) return "inactivo";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.insert(t.sesiones).values({
    usuarioId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });
  // Limpieza oportunista de sesiones vencidas
  db.delete(t.sesiones).where(lt(t.sesiones.expiresAt, new Date())).catch(() => {});

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return toSessionUser(user);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(t.sesiones).where(eq(t.sesiones.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Cierra las demás sesiones del usuario (deja viva la del navegador actual).
 * Se usa al cambiar la contraseña: quien tuviera la anterior queda fuera.
 */
export async function revokeOtherSessions(usuarioId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const conditions = [eq(t.sesiones.usuarioId, usuarioId)];
  if (token) conditions.push(ne(t.sesiones.tokenHash, hashToken(token)));
  await db.delete(t.sesiones).where(and(...conditions));
}

// ── Lectura de sesión (DAL) ──────────────────────────────────────────────────

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.query.sesiones.findFirst({
    where: (s, { eq }) => eq(s.tokenHash, hashToken(token)),
    with: { usuario: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const user = session.usuario;
  if (!user || !user.activo) return null;
  return toSessionUser(user);
});

/** Exige sesión (y opcionalmente rol); redirige a /admin/login si no hay. */
export async function requireUser(roles?: SessionUser["rol"][]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (roles && !roles.includes(user.rol)) redirect("/admin");
  return user;
}

/**
 * Liga efectiva del usuario. El superadmin DeSport opera sobre la liga
 * seleccionada (cookie `calccio_liga`); el resto sobre la suya.
 */
export async function requireLigaId(user: SessionUser): Promise<string> {
  if (user.rol !== "superadmin") {
    if (!user.ligaId) redirect("/admin/login");
    return user.ligaId;
  }
  const cookieStore = await cookies();
  const selected = cookieStore.get("calccio_liga")?.value;
  if (selected) {
    const liga = await db.query.ligas.findFirst({ where: (l, { eq }) => eq(l.id, selected) });
    if (liga) return liga.id;
  }
  const first = await db.query.ligas.findFirst({
    where: (l, { eq }) => eq(l.activo, true),
    orderBy: (l, { asc }) => asc(l.createdAt),
  });
  if (!first) redirect("/admin/ligas");
  return first.id;
}

function toSessionUser(u: typeof t.usuarios.$inferSelect): SessionUser {
  return {
    id: u.id,
    username: u.username,
    nombre: u.nombre,
    fotoUrl: u.fotoUrl,
    rol: u.rol,
    ligaId: u.ligaId,
    equipoId: u.equipoId,
    arbitroId: u.arbitroId,
  };
}
