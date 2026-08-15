"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { ROL_USUARIO } from "@/lib/labels";
import { logoutAction, selectLigaAction } from "@/app/admin/actions";

/** Switcher de liga para superadmin: nombre en grande + dropdown de cambio. */
function LigaSwitcher({ liga, ligas }: {
  liga: { id: string; nombre: string } | null;
  ligas: { id: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 -ml-2.5 hover:bg-ink-50 transition-colors disabled:opacity-60 min-w-0"
      >
        <span className="brand-title text-lg text-ink-900 truncate">
          {liga?.nombre ?? "Elegir liga"}
        </span>
        {isPending ? (
          <span className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-azul-600/25 border-t-azul-600 animate-spin" />
        ) : (
          <span className="w-5 h-5 flex-shrink-0 rounded-md bg-azul-600/10 text-azul-600 flex items-center justify-center group-hover:bg-azul-600 group-hover:text-white transition-colors">
            <Icon name="chevron" className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Cambiar de liga"
          className="absolute left-0 top-full mt-2 min-w-72 max-w-96 bg-white rounded-xl border border-ink-200 shadow-xl shadow-ink-900/10 py-2 z-50"
        >
          <p className="px-4 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Cambiar de liga
          </p>
          {ligas.map((l) => {
            const activa = l.id === liga?.id;
            return (
              <button
                key={l.id}
                role="option"
                aria-selected={activa}
                onClick={() => {
                  setOpen(false);
                  if (!activa) startTransition(() => selectLigaAction(l.id));
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                  ${activa ? "text-azul-600 font-bold bg-azul-600/5" : "text-ink-700 font-semibold hover:bg-ink-50"}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activa ? "bg-lima-500" : "bg-ink-200"}`} />
                <span className="truncate">{l.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Rol = "superadmin" | "admin_liga" | "admin_equipo" | "arbitro";
export interface AvisoResumen {
  id: string; titulo: string; detalle: string; leida: boolean; fecha: string;
}
interface Props {
  user: { nombre: string; rol: Rol; fotoUrl: string | null };
  liga: { id: string; nombre: string } | null;
  ligas: { id: string; nombre: string }[];
  notificaciones: number;
  avisos: AvisoResumen[];
  children: React.ReactNode;
}

/** Campana de avisos: contador, dropdown con los recientes y link a la página completa. */
function Campana({ noLeidas, avisos }: { noLeidas: number; avisos: AvisoResumen[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // Los avisos los generan OTROS usuarios: refresco ligero para que el
  // contador aparezca sin recargar a mano
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ""}`}
        aria-expanded={open}
        className="relative w-9 h-9 rounded-xl hover:bg-ink-100 flex items-center justify-center text-ink-500 hover:text-ink-800 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-11 z-40 w-80 bg-white rounded-xl border border-ink-200 shadow-lg overflow-hidden">
            <p className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-100">
              Notificaciones
            </p>
            {avisos.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-400 text-center">Sin notificaciones</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-ink-100">
                {avisos.map((a) => (
                  <li key={a.id}>
                    <a
                      href={`/admin/notificaciones/ir/${a.id}`}
                      className={`block px-4 py-2.5 hover:bg-ink-50 transition-colors ${a.leida ? "opacity-60" : ""}`}
                    >
                      <span className="flex items-start gap-2">
                        {!a.leida && <span className="mt-1.5 w-2 h-2 rounded-full bg-azul-600 flex-shrink-0" aria-hidden />}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink-900 truncate">{a.titulo}</span>
                          {a.detalle && <span className="block text-xs text-ink-500 truncate">{a.detalle}</span>}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/notificaciones"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-sm font-bold text-azul-600 hover:bg-ink-50 border-t border-ink-100"
            >
              Ver todas →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

const sections: { path: string; icon: IconName; label: string; roles: Rol[]; group: string | null }[] = [
  { path: "/admin", icon: "dashboard", label: "Dashboard", roles: ["superadmin", "admin_liga", "admin_equipo", "arbitro"], group: null },
  { path: "/admin/equipos", icon: "equipos", label: "Equipos", roles: ["superadmin", "admin_liga", "admin_equipo"], group: "Gestión" },
  { path: "/admin/jugadores", icon: "jugadores", label: "Jugadores", roles: ["superadmin", "admin_liga", "admin_equipo"], group: "Gestión" },
  { path: "/admin/arbitros", icon: "arbitros", label: "Árbitros", roles: ["superadmin", "admin_liga"], group: "Gestión" },
  { path: "/admin/canchas", icon: "canchas", label: "Canchas", roles: ["superadmin", "admin_liga"], group: "Gestión" },
  { path: "/admin/torneos", icon: "torneos", label: "Torneos", roles: ["superadmin", "admin_liga", "admin_equipo", "arbitro"], group: "Competencia" },
  { path: "/admin/calendario", icon: "calendario", label: "Calendario", roles: ["superadmin", "admin_liga", "admin_equipo", "arbitro"], group: "Competencia" },
  { path: "/admin/ficha", icon: "ficha", label: "Ficha Arbitral", roles: ["superadmin", "admin_liga", "arbitro"], group: "Competencia" },
  { path: "/admin/estadisticas", icon: "estadisticas", label: "Estadísticas", roles: ["superadmin", "admin_liga", "admin_equipo", "arbitro"], group: "Reportes" },
  { path: "/admin/pagos", icon: "pagos", label: "Pagos", roles: ["superadmin", "admin_liga", "admin_equipo"], group: "Reportes" },
  { path: "/admin/reclamos", icon: "reclamos", label: "Reclamos", roles: ["superadmin", "admin_liga", "admin_equipo"], group: "Reportes" },
  { path: "/admin/personalizacion", icon: "personalizacion", label: "Personalización", roles: ["superadmin", "admin_liga"], group: "Liga" },
  { path: "/admin/configuracion", icon: "configuracion", label: "Configuración", roles: ["superadmin", "admin_liga"], group: "Liga" },
  { path: "/admin/ligas", icon: "ligas", label: "Ligas", roles: ["superadmin"], group: "DE/SPORTS" },
  { path: "/admin/ayuda", icon: "ayuda", label: "Ayuda", roles: ["superadmin", "admin_liga", "admin_equipo", "arbitro"], group: "Soporte" },
];

export default function AdminShell({ user, liga, ligas, notificaciones, avisos, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const visible = sections.filter((s) => s.roles.includes(user.rol));
  const suelto = visible.filter((s) => s.group === null);
  const grupos: { nombre: string; items: typeof sections }[] = [];
  for (const s of visible) {
    if (!s.group) continue;
    const g = grupos.find((x) => x.nombre === s.group);
    if (g) g.items.push(s);
    else grupos.push({ nombre: s.group, items: [s] });
  }

  const isActive = (path: string) =>
    pathname === path || (path !== "/admin" && pathname.startsWith(path + "/"));

  const NavLink = ({ s }: { s: (typeof sections)[number] }) => (
    <Link
      href={s.path}
      onClick={() => setSidebarOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-semibold transition-colors
        ${isActive(s.path) ? "bg-lima-500 text-azul-900" : "text-azul-100 hover:text-white hover:bg-azul-700"}`}
    >
      <Icon name={s.icon} className="w-5 h-5 flex-shrink-0" />
      <span>{s.label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {sidebarOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-azul-950/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-azul-600 z-50 flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logotipo oficial DE/SPORTS sobre azul (manual p.6) */}
        <div className="h-16 flex items-center px-5 border-b border-white/10 flex-shrink-0">
          <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={150} height={31} priority />
        </div>

        <nav className="nav-scroll flex-1 overflow-y-auto py-4 px-3">
          {suelto.map((s) => <NavLink key={s.path} s={s} />)}

          {grupos.map((g) => {
            const cerrado = collapsed[g.nombre] ?? false;
            const contieneActiva = g.items.some((s) => isActive(s.path));
            return (
              <div key={g.nombre}>
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [g.nombre]: !cerrado }))}
                  aria-expanded={!cerrado}
                  className="w-full flex items-center justify-between px-3 mt-4 mb-2 group"
                >
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${contieneActiva && cerrado ? "text-lima-400" : "text-azul-300"} group-hover:text-white transition-colors`}>
                    {g.nombre}
                  </span>
                  <Icon
                    name="chevron"
                    className={`w-3.5 h-3.5 text-azul-300 group-hover:text-white transition-transform ${cerrado ? "-rotate-90" : ""}`}
                  />
                </button>
                {!cerrado && g.items.map((s) => <NavLink key={s.path} s={s} />)}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="lg:ml-64">
        <header className="h-16 bg-white/90 backdrop-blur-sm border-b border-ink-200 flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-ink-500 hover:text-ink-900"
            aria-label="Abrir menú"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>

          {/* Liga activa arriba-izquierda: switcher para superadmin, nombre fijo para el resto */}
          {user.rol === "superadmin" ? (
            <LigaSwitcher liga={liga} ligas={ligas} />
          ) : (
            liga && <span className="brand-title text-lg text-ink-900 truncate">{liga.nombre}</span>
          )}

          <span className="flex-1" />

          {/* Avisos */}
          {user.rol !== "arbitro" && <Campana noLeidas={notificaciones} avisos={avisos} />}

          {/* Sesión */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-ink-200">
            <Link
              href="/admin/cuenta"
              title="Mi cuenta"
              className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-ink-100 transition-colors"
            >
              {user.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.fotoUrl}
                  alt={user.nombre}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-ink-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-lima-500 flex items-center justify-center text-sm font-bold text-azul-900 flex-shrink-0">
                  {user.nombre[0]}
                </div>
              )}
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-sm font-semibold text-ink-900 max-w-40 truncate">{user.nombre}</div>
                <div className="text-xs text-ink-500">{ROL_USUARIO[user.rol] ?? user.rol}</div>
              </div>
            </Link>
            <form action={logoutAction}>
              <button type="submit" title="Cerrar sesión" className="text-ink-400 hover:text-red-500 transition-colors block">
                <Icon name="logout" className="w-5 h-5" />
              </button>
            </form>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
