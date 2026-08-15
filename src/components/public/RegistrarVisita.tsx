"use client";
import { useEffect } from "react";
import { registrarLigaVisitada } from "./LigasBuscador";

/** Marca la liga como visitada para la sección "Recientes" del inicio global. */
export default function RegistrarVisita({ slug }: { slug: string }) {
  useEffect(() => {
    registrarLigaVisitada(slug);
  }, [slug]);
  return null;
}
