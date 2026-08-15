"use client";
import { useState, useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import { PageHeader, SubmitButton, Field, FormError } from "@/components/admin/ui";
import { compressImage, IMAGE_PRESETS, type CompressOptions } from "@/lib/image-client";
import { updateBranding, quitarImagen, type ActionState } from "./actions";

interface LigaBranding {
  nombre: string; slug: string; logoUrl: string | null;
  colorPrimario: string; colorSecundario: string; colorAcento: string;
  fondoRolUrl: string | null;
  fondoOgUrl: string | null;
}

function ColorInput({ name, label, value, onChange }: {
  name: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label} htmlFor={`pz-${name}`}>
      <div className="flex items-center gap-2">
        <input
          id={`pz-${name}`}
          name={name}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-16 rounded-xl border border-ink-200 bg-ink-50 p-1"
        />
        <span className="text-sm font-mono text-ink-500 uppercase">{value}</span>
      </div>
    </Field>
  );
}

function UploadPreview({ name, label, currentUrl, hint, preset, onClear }: {
  name: string; label: string; currentUrl: string | null; hint: string;
  preset: CompressOptions; onClear: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = preview ?? currentUrl;

  /**
   * Comprimimos apenas el usuario elige el archivo y reemplazamos el contenido
   * del input, de modo que el Server Action reciba siempre una imagen liviana.
   */
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); setStatus(null); return; }

    setPreview(URL.createObjectURL(file));
    setStatus("Optimizando…");
    try {
      const optimizada = await compressImage(file, preset);
      if (optimizada !== file && inputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(optimizada);
        inputRef.current.files = dt.files;
        setPreview(URL.createObjectURL(optimizada));
        setStatus(`Optimizada: ${fmtSize(file.size)} → ${fmtSize(optimizada.size)}`);
      } else {
        setStatus(fmtSize(file.size));
      }
    } catch {
      setStatus(null); // si falla, se sube el original y el servidor valida
    }
  };

  return (
    <Field label={label} htmlFor={`pz-${name}`}>
      <div className="space-y-2">
        {shown && (
          <div className="relative w-full h-36 rounded-xl border border-ink-200 bg-ink-100 overflow-hidden">
            {/* preview dinámica: object-contain para logos, cover para fondos */}
            <Image
              src={shown}
              alt={label}
              fill
              unoptimized
              className={name === "logo" ? "object-contain p-3" : "object-cover"}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            id={`pz-${name}`}
            name={name}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChange}
            className="text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-azul-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-azul-700"
          />
          {currentUrl && !preview && (
            <button type="button" onClick={onClear} className="text-xs font-semibold text-red-500 hover:text-red-700">
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-ink-400">
          {hint}
          {status && <span className="ml-2 font-semibold text-lima-800">{status}</span>}
        </p>
      </div>
    </Field>
  );
}

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function PersonalizacionClient({ liga }: { liga: LigaBranding }) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateBranding, {});
  const [saved, setSaved] = useState(false);
  const [primario, setPrimario] = useState(liga.colorPrimario);
  const [secundario, setSecundario] = useState(liga.colorSecundario);
  const [acento, setAcento] = useState(liga.colorAcento);

  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div>
      <PageHeader
        title="Personalización"
        subtitle={`Branding de ${liga.nombre} — se usa en su página pública y en la imagen del rol de juegos`}
      />

      <form action={formAction} className="grid lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-xl border border-ink-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-ink-900">Colores de la liga</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <ColorInput name="colorPrimario" label="Primario" value={primario} onChange={setPrimario} />
              <ColorInput name="colorSecundario" label="Secundario" value={secundario} onChange={setSecundario} />
              <ColorInput name="colorAcento" label="Acento" value={acento} onChange={setAcento} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-ink-200 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-ink-900">Imágenes</h3>
            <UploadPreview
              name="logo"
              label="Logo de la liga"
              currentUrl={liga.logoUrl}
              hint="PNG con fondo transparente recomendado · se optimiza automáticamente"
              preset={IMAGE_PRESETS.logo}
              onClear={() => {
                const fd = new FormData();
                fd.set("cual", "logo");
                quitarImagen(fd);
              }}
            />
            <UploadPreview
              name="fondoRol"
              label="Fondo del rol de juegos"
              currentUrl={liga.fondoRolUrl}
              hint="Imagen vertical 1080×1350 recomendada (formato post) · se optimiza automáticamente"
              preset={IMAGE_PRESETS.fondoRol}
              onClear={() => {
                const fd = new FormData();
                fd.set("cual", "fondoRol");
                quitarImagen(fd);
              }}
            />
            <UploadPreview
              name="fondoOg"
              label="Fondo para compartir en redes"
              currentUrl={liga.fondoOgUrl}
              hint="Imagen horizontal 1200×630 recomendada (vista previa del link en Facebook/X/WhatsApp) · se optimiza automáticamente"
              preset={IMAGE_PRESETS.fondoOg}
              onClear={() => {
                const fd = new FormData();
                fd.set("cual", "fondoOg");
                quitarImagen(fd);
              }}
            />
          </section>

          <FormError error={state.error} />
          <div className="flex items-center gap-3">
            <SubmitButton>Guardar branding</SubmitButton>
            {saved && <span className="text-sm font-semibold text-lima-800">✓ Guardado</span>}
          </div>
        </div>

        {/* Vista previa en vivo */}
        <aside className="lg:col-span-2 lg:sticky lg:top-20">
          <div className="bg-white rounded-xl border border-ink-200 shadow-sm p-6">
            <h3 className="font-bold text-ink-900 mb-4">Vista previa</h3>
            <div className="rounded-xl overflow-hidden border border-ink-200">
              <div className="p-5" style={{ backgroundColor: primario }}>
                <div className="flex items-center gap-3">
                  {liga.logoUrl ? (
                    <Image src={liga.logoUrl} alt="" width={40} height={40} unoptimized className="rounded-lg object-contain bg-white/10 p-1" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-white/20 inline-flex items-center justify-center text-white font-bold">
                      {liga.nombre[0]}
                    </span>
                  )}
                  <span className="text-white font-bold italic">{liga.nombre}</span>
                </div>
              </div>
              <div className="p-4 space-y-2" style={{ backgroundColor: secundario }}>
                <div className="flex justify-between items-center rounded-lg bg-white/10 px-3 py-2">
                  <span className="text-white text-sm font-semibold">Águilas FC</span>
                  <span className="text-sm font-bold px-2 rounded" style={{ backgroundColor: acento, color: secundario }}>
                    2 - 1
                  </span>
                  <span className="text-white text-sm font-semibold">Toros Bravos</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-white/10 px-3 py-2">
                  <span className="text-white text-sm font-semibold">Coyotes FC</span>
                  <span className="text-white/70 text-xs">10:00</span>
                  <span className="text-white text-sm font-semibold">Lobos United</span>
                </div>
              </div>
              <div className="px-4 py-2 text-center" style={{ backgroundColor: acento }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: secundario }}>
                  desport.mx/{liga.slug}
                </span>
              </div>
            </div>
            <p className="text-xs text-ink-400 mt-3">
              Así se combinarán los colores en la página pública y el rol de juegos.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
