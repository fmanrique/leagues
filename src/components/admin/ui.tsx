"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "./icons";

export type DeleteState = { error?: string; ok?: boolean };

export const PAGE_SIZES = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_KEY = "calccio:pageSize";

/**
 * Pagina una lista ya filtrada; la página se ajusta sola si el filtro encoge
 * la lista. El tamaño de página elegido se recuerda para todos los listados.
 */
export function usePagination<T>(items: T[]) {
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  // Preferencia guardada (post-mount para no desalinear la hidratación)
  useEffect(() => {
    const v = Number(localStorage.getItem(PAGE_SIZE_KEY));
    if ((PAGE_SIZES as readonly number[]).includes(v)) setPageSizeState(v);
  }, []);

  const setPageSize = (n: number) => {
    setPageSizeState(n);
    setPage(1);
    try { localStorage.setItem(PAGE_SIZE_KEY, String(n)); } catch {}
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = items.slice((current - 1) * pageSize, current * pageSize);
  return { slice, page: current, totalPages, total: items.length, pageSize, setPage, setPageSize };
}

/** Barra de paginación estándar con selector de filas por página. */
export function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }: {
  page: number; totalPages: number; total: number; pageSize?: number;
  onPage: (p: number) => void; onPageSize?: (n: number) => void;
}) {
  const size = pageSize ?? DEFAULT_PAGE_SIZE;
  // Sin nada que paginar ni que elegir (cabe todo hasta en la opción mínima)
  if (totalPages <= 1 && total <= PAGE_SIZES[0]) return null;
  const desde = (page - 1) * size + 1;
  const hasta = Math.min(page * size, total);

  const nums: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  const btn = "min-w-9 h-9 px-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-ink-500">
          Mostrando <strong className="text-ink-900">{desde}–{hasta}</strong> de{" "}
          <strong className="text-ink-900">{total}</strong>
        </p>
        {onPageSize && (
          <label className="flex items-center gap-2 text-sm text-ink-500">
            Por página:
            <select
              value={size}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm font-semibold text-ink-900 outline-none focus:border-azul-600"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Página anterior"
          className={`${btn} border border-ink-200 bg-white text-ink-600 hover:border-azul-400`}>
          ‹
        </button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-ink-400">…</span>
          ) : (
            <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}
              className={`${btn} ${n === page ? "bg-azul-600 text-white" : "border border-ink-200 bg-white text-ink-600 hover:border-azul-400"}`}>
              {n}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Página siguiente"
          className={`${btn} border border-ink-200 bg-white text-ink-600 hover:border-azul-400`}>
          ›
        </button>
      </div>
    </div>
  );
}

/**
 * Conserva lo capturado cuando un server action devuelve error.
 *
 * React 19 resetea los inputs no controlados al completar un form action,
 * incluso si la acción falló — el usuario perdería todo lo escrito. Este hook
 * guarda el FormData enviado y, al llegar un error, fuerza un remount del
 * form (formKey) para que los inputs se rehidraten con lo que se escribió.
 *
 * Uso: <form key={formKey} action={enviar}> y en cada input
 *      defaultValue={valor("campo", fallback)}.
 */
export function useFormDraft(
  formAction: (fd: FormData) => void,
  error: string | undefined
) {
  const [draft, setDraft] = useState<FormData | null>(null);
  const [formKey, setFormKey] = useState(0);
  const prevError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (error && error !== prevError.current) setFormKey((k) => k + 1);
    prevError.current = error;
  }, [error]);

  const enviar = (fd: FormData) => {
    setDraft(fd);
    formAction(fd);
  };

  /** Valor de un campo: lo último escrito si hubo error, si no el fallback. */
  const valor = (name: string, fallback: string | number | null | undefined): string => {
    const v = draft?.get(name);
    if (typeof v === "string") return v;
    return fallback == null ? "" : String(fallback);
  };

  /** Valores múltiples (checkboxes): lo último marcado o el fallback. */
  const valores = (name: string, fallback: string[]): string[] => {
    if (!draft) return fallback;
    return draft.getAll(name).filter((x): x is string => typeof x === "string");
  };

  /** Checkbox individual: marcado en el draft o el fallback. */
  const marcado = (name: string, fallback: boolean): boolean => {
    if (!draft) return fallback;
    return draft.get(name) === "on";
  };

  return { enviar, formKey, valor, valores, marcado, hayDraft: draft !== null };
}

/** Encabezado de página con acción principal opcional. */
export function PageHeader({ title, subtitle, children }: {
  title: string; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h2 className="brand-title text-2xl text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 whitespace-nowrap flex-shrink-0 rounded-xl bg-azul-600 hover:bg-azul-700 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-white transition ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

/** Botón de submit con estado pending automático (usar dentro de <form>). */
export function SubmitButton({ children, className = "", pendingLabel = "Guardando…" }: {
  children: React.ReactNode; className?: string; pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-azul-600 hover:bg-azul-700 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-white transition ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Modal accesible basado en <dialog>. */
export function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`m-auto w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[85vh] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-azul-950/50 open:flex flex-col`}
    >
      {/* El título y el cerrar quedan fijos; solo el contenido scrollea */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 flex-shrink-0">
        <h3 className="brand-title text-lg text-ink-900">{title}</h3>
        <button onClick={onClose} aria-label="Cerrar" className="text-ink-400 hover:text-ink-900 text-xl leading-none">✕</button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
    </dialog>
  );
}

export function Field({ label, htmlFor, children, className = "" }: {
  label: string; htmlFor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl bg-ink-50 border border-ink-200 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-azul-600 focus:ring-2 focus:ring-azul-600/25 transition";

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
      {error}
    </p>
  );
}

/**
 * Modal de confirmación de borrado con soporte de error del servidor: si la
 * acción devuelve { error } (p. ej. un guard de dominio), se muestra dentro
 * del modal en vez de cerrar en silencio.
 */
export function ConfirmDeleteModal({ open, onClose, title, action, itemId, children, confirmLabel = "Eliminar" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  action: (prev: DeleteState, formData: FormData) => Promise<DeleteState>;
  itemId: string;
  children: React.ReactNode;
  confirmLabel?: string;
}) {
  const [state, formAction] = useActionState<DeleteState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {children}
      <FormError error={state.error} />
      <div className={`flex justify-end gap-2 ${state.error ? "mt-4" : ""}`}>
        <button
          onClick={onClose}
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Cancelar
        </button>
        <form action={formAction}>
          <input type="hidden" name="id" value={itemId} />
          <SubmitButton className="!bg-red-600 hover:!bg-red-700" pendingLabel="Eliminando…">
            {confirmLabel}
          </SubmitButton>
        </form>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon = "reclamos", text }: { icon?: Parameters<typeof Icon>[0]["name"]; text: string }) {
  return (
    <div className="text-center py-16 text-ink-400">
      <Icon name={icon} className="w-8 h-8 mx-auto mb-3" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function Badge({ tone, children }: { tone: "azul" | "lima" | "gris" | "rojo" | "ambar"; children: React.ReactNode }) {
  const tones = {
    azul: "bg-azul-600/10 text-azul-600",
    lima: "bg-lima-500/20 text-lima-900",
    gris: "bg-ink-200/60 text-ink-700",
    rojo: "bg-red-100 text-red-700",
    ambar: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Iniciales de equipo con su color. */
export function TeamBadge({ nombre, color, size = 28, logoUrl }: {
  nombre: string; color: string; size?: number; logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-contain flex-shrink-0 bg-white border border-ink-100"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <span
      className="rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

/** Avatar de persona (jugador/árbitro): foto o iniciales neutras. */
export function FotoAvatar({ nombre, fotoUrl, size = 32 }: {
  nombre: string; fotoUrl?: string | null; size?: number;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <span
      className="rounded-full inline-flex items-center justify-center text-[11px] font-bold text-azul-600 bg-azul-600/10 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}

/** Tabla estándar del admin. */
export function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ink-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
