"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { seg: "", label: "Inicio" },
  { seg: "torneos", label: "Torneos" },
  { seg: "calendario", label: "Calendario" },
  { seg: "tabla", label: "Tabla" },
  { seg: "goleo", label: "Goleo" },
  { seg: "equipos", label: "Equipos" },
  { seg: "rol", label: "Rol de juegos" },
];

export default function LigaNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/${slug}`;
  // El torneo seleccionado es el contexto: se conserva al cambiar de sección
  const torneo = searchParams.get("torneo");
  const query = torneo ? `?torneo=${torneo}` : "";

  return (
    <nav className="flex gap-1 overflow-x-auto -mx-1 px-1" aria-label="Secciones de la liga">
      {tabs.map((t) => {
        const href = t.seg ? `${base}/${t.seg}` : base;
        const active = t.seg
          ? pathname === href || pathname.startsWith(href + "/")
          : pathname === base;
        return (
          <Link
            key={t.seg}
            href={`${href}${query}`}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors
              ${active
                ? "bg-ink-50 text-ink-900"
                : "text-white/80 hover:text-white hover:bg-white/10"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
