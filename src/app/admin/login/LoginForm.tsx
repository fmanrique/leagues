"use client";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={formAction} className="bg-white rounded-2xl p-6 space-y-4 shadow-xl shadow-azul-950/20">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-ink-700 mb-1.5">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="w-full rounded-xl bg-ink-50 border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-azul-600 focus:ring-2 focus:ring-azul-600/25 transition"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-ink-700 mb-1.5">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl bg-ink-50 border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-azul-600 focus:ring-2 focus:ring-azul-600/25 transition"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-azul-600 hover:bg-azul-700 disabled:opacity-60 py-2.5 text-sm font-bold text-white transition"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
