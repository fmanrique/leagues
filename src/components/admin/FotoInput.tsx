"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { compressImage, type CompressOptions } from "@/lib/image-client";

/**
 * Campo de foto/logo para formularios del admin: preview, compresión en el
 * navegador antes de enviar y opción de quitar la actual. El server action
 * recibe el archivo en `name` y el flag de borrado en `${name}Quitar`.
 */
export default function FotoInput({ name, currentUrl, forma = "circulo", preset, label = "Foto", permitirQuitar = true }: {
  name: string;
  currentUrl: string | null;
  forma?: "circulo" | "cuadro";
  preset: CompressOptions;
  label?: string;
  permitirQuitar?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [quitar, setQuitar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = preview ?? (quitar ? null : currentUrl);
  const redondeo = forma === "circulo" ? "rounded-full" : "rounded-xl";

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); setStatus(null); return; }
    setQuitar(false);
    setPreview(URL.createObjectURL(file));
    setStatus("Optimizando…");
    try {
      const optimizada = await compressImage(file, preset);
      if (optimizada !== file && inputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(optimizada);
        inputRef.current.files = dt.files;
        setPreview(URL.createObjectURL(optimizada));
      }
      setStatus(null);
    } catch {
      setStatus(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`relative w-16 h-16 flex-shrink-0 overflow-hidden border border-ink-200 bg-ink-50 ${redondeo}`}>
        {shown ? (
          <Image src={shown} alt={label} fill unoptimized className={forma === "cuadro" ? "object-contain p-1" : "object-cover"} />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-ink-300 text-xl">＋</span>
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={label}
          onChange={handleChange}
          className="block w-full text-xs text-ink-600 file:mr-2 file:rounded-lg file:border-0 file:bg-azul-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-azul-700"
        />
        {status && <p className="text-xs font-semibold text-lima-800">{status}</p>}
        {currentUrl && !preview && permitirQuitar && (
          <label className="flex items-center gap-1.5 text-xs text-ink-500">
            <input
              type="checkbox"
              name={`${name}Quitar`}
              checked={quitar}
              onChange={(e) => setQuitar(e.target.checked)}
              className="w-3.5 h-3.5 accent-red-600"
            />
            Quitar {label.toLowerCase()} actual
          </label>
        )}
      </div>
    </div>
  );
}
