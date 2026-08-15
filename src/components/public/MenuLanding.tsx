"use client";
import { useState } from "react";
import Link from "next/link";

const SECCIONES = [
  ["#ligas", "Ligas"],
  ["#como-funciona", "Cómo funciona"],
  ["#para-tu-liga", "Para tu liga"],
  ["#preguntas", "Preguntas"],
] as const;

/** Menú móvil/tablet de la landing: anclas de sección + accesos de admin. */
export default function MenuLanding({ adminVideosUrl }: { adminVideosUrl: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-white/25 text-white hover:border-white/60 transition-colors"
      >
        {abierto ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {abierto && (
        <nav
          aria-label="Menú"
          className="absolute left-0 right-0 top-full z-50 bg-azul-950/95 backdrop-blur border-y border-white/10 px-6 py-5"
        >
          <ul className="space-y-1">
            {SECCIONES.map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setAbierto(false)}
                  className="block rounded-xl px-3 py-2.5 font-semibold text-azul-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-lima-500 hover:bg-lima-400 text-azul-950 text-center font-bold px-4 py-2.5 transition-colors"
            >
              Admin de ligas
            </Link>
            <a
              href={adminVideosUrl}
              className="rounded-xl border border-white/25 hover:border-white/60 text-center font-semibold text-azul-100 hover:text-white px-4 py-2.5 transition-colors"
            >
              Admin de videos
            </a>
          </div>
        </nav>
      )}
    </div>
  );
}
