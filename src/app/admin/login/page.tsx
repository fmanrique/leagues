import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  // Sesión válida (verificada en DB) → directo al panel
  if (await getSessionUser()) redirect("/admin");

  return (
    <main className="min-h-screen flex items-center justify-center bg-azul-600 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Image
            src="/brand/logo-blanco.png"
            alt="DE/SPORTS — Juega hoy, revívelo siempre"
            width={280}
            height={58}
            priority
            className="mx-auto"
          />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-azul-200 mt-6">
          Administración de ligas deportivas
        </p>
      </div>
    </main>
  );
}
