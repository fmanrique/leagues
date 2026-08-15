"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton, Field, FormError, inputCls } from "@/components/admin/ui";
import FotoInput from "@/components/admin/FotoInput";
import { IMAGE_PRESETS } from "@/lib/image-client";
import { cambiarPassword, cambiarFoto, type ActionState } from "./actions";

export function FotoPerfil({ fotoUrl }: { fotoUrl: string | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(cambiarFoto, {});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <section className="bg-white rounded-xl border border-ink-200 shadow-sm p-6">
      <h3 className="font-bold text-ink-900 mb-4">Foto de perfil</h3>
      <form action={formAction} className="space-y-4">
        <FotoInput name="foto" currentUrl={fotoUrl} forma="circulo" preset={IMAGE_PRESETS.foto} label="Foto" />
        <FormError error={state.error} />
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Guardando…">Guardar foto</SubmitButton>
          {saved && <span className="text-sm font-semibold text-lima-800">✓ Foto actualizada</span>}
        </div>
      </form>
    </section>
  );
}

export default function CuentaClient() {
  const [state, formAction] = useActionState<ActionState, FormData>(cambiarPassword, {});
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      formRef.current?.reset();
      const timer = setTimeout(() => setSaved(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <section className="bg-white rounded-xl border border-ink-200 shadow-sm p-6">
      <h3 className="font-bold text-ink-900 mb-4">Cambiar contraseña</h3>
      <form ref={formRef} action={formAction} className="space-y-4">
        <Field label="Contraseña actual" htmlFor="cu-actual">
          <input
            id="cu-actual"
            name="actual"
            type="password"
            required
            autoComplete="current-password"
            className={inputCls}
          />
        </Field>
        <Field label="Nueva contraseña" htmlFor="cu-nueva">
          <input
            id="cu-nueva"
            name="nueva"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>
        <Field label="Confirmar nueva contraseña" htmlFor="cu-confirmar">
          <input
            id="cu-confirmar"
            name="confirmar"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>
        <p className="text-xs text-ink-400">
          Mínimo 8 caracteres. Al cambiarla se cierran tus sesiones en otros dispositivos.
        </p>
        <FormError error={state.error} />
        <div className="flex items-center gap-3">
          <SubmitButton>Cambiar contraseña</SubmitButton>
          {saved && <span className="text-sm font-semibold text-lima-800">✓ Contraseña actualizada</span>}
        </div>
      </form>
    </section>
  );
}
