"use client";
import { useRouter, usePathname } from "next/navigation";
import { inputCls } from "@/components/admin/ui";

export default function TorneoSelector({ torneos, torneoActivo }: {
  torneos: { id: string; nombre: string }[]; torneoActivo: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={torneoActivo ?? ""}
      onChange={(e) => router.push(`${pathname}?torneo=${e.target.value}`)}
      className={`${inputCls} w-64 bg-white`}
      aria-label="Torneo"
    >
      {torneos.map((tr) => <option key={tr.id} value={tr.id}>{tr.nombre}</option>)}
    </select>
  );
}
