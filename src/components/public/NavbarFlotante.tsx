"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MenuLanding from "./MenuLanding";

/** Umbral de scroll (px) a partir del cual aparece la barra flotante. */
const UMBRAL = 1000;

/**
 * Segunda barra de navegación de la landing: fija arriba, entra deslizándose
 * cuando el scroll rebasa el umbral y se esconde al regresar. En el top de la
 * página el header principal del hero queda en su lugar normal.
 */
export default function NavbarFlotante({ adminVideosUrl }: { adminVideosUrl: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > UMBRAL);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      inert={!visible}
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="bg-azul-950/95 backdrop-blur border-b border-white/10 shadow-lg shadow-azul-950/40">
        <div className="relative max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 md:px-10 py-3">
          <Link href="/" aria-label="DE/SPORTS — inicio">
            <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={150} height={32} />
          </Link>
          <nav aria-label="Secciones" className="hidden lg:flex items-center gap-6 text-sm font-semibold text-azul-200">
            <a href="#ligas" className="hover:text-white transition-colors">Ligas</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#para-tu-liga" className="hover:text-white transition-colors">Para tu liga</a>
            <a href="#preguntas" className="hover:text-white transition-colors">Preguntas</a>
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <a
              href={adminVideosUrl}
              className="text-xs font-semibold text-azul-200 hover:text-white border border-white/25 hover:border-white/60 rounded-xl px-3.5 py-2 transition-colors"
            >
              Admin de videos
            </a>
            <Link
              href="/admin"
              className="text-xs font-semibold text-azul-950 bg-lima-500 hover:bg-lima-400 rounded-xl px-3.5 py-2 transition-colors"
            >
              Admin de ligas
            </Link>
          </div>
          <MenuLanding adminVideosUrl={adminVideosUrl} />
        </div>
      </div>
    </div>
  );
}
