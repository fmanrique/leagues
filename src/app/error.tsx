"use client";
import { useEffect } from "react";
import Image from "next/image";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-azul-600 p-8 text-center">
      <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={240} height={50} priority />
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Algo salió mal</h1>
        <p className="text-sm text-azul-200">
          Ocurrió un error inesperado. Intenta de nuevo en unos segundos.
        </p>
        {error.digest && <p className="text-xs text-azul-300 mt-2 font-mono">Ref: {error.digest}</p>}
      </div>
      <button
        onClick={reset}
        className="rounded-xl bg-lima-500 hover:bg-lima-400 px-5 py-2.5 text-sm font-bold text-azul-900 transition"
      >
        Reintentar
      </button>
    </main>
  );
}
