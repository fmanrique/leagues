import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-azul-600 p-8 text-center">
      <Image src="/brand/logo-blanco.png" alt="DE/SPORTS" width={240} height={50} priority />
      <div>
        <p className="font-bold italic text-7xl text-lima-500 mb-2">404</p>
        <h1 className="text-xl font-bold text-white mb-1">Página no encontrada</h1>
        <p className="text-sm text-azul-200">
          La liga, equipo o página que buscas no existe o ya no está disponible.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-lima-500 hover:bg-lima-400 px-5 py-2.5 text-sm font-bold text-azul-900 transition"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
