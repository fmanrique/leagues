"use server";
import { z } from "zod";
import { requireUser, requireLigaId } from "@/lib/auth";
import { fetchScheduleDesports } from "@/lib/desports";
import { proponerCanchas, type PropuestaCancha } from "@/lib/desports-import";

const DIA_LABEL: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue",
  viernes: "Vie", sabado: "Sáb", domingo: "Dom",
};

export type ComprobarState = {
  error?: string;
  ok?: boolean;
  dias?: { dia: string; label: string; horarios: number }[];
  canchas?: PropuestaCancha[];
};

/**
 * Comprueba un ID de liga DE/SPORTS: valida que exista en el API y devuelve
 * el resumen de días/horarios de cámara y la propuesta de empate de canchas.
 */
export async function comprobarDesports(_prev: ComprobarState, formData: FormData): Promise<ComprobarState> {
  const user = await requireUser(["superadmin", "admin_liga"]);

  const id = String(formData.get("desportsLigaId") ?? "").trim();
  if (!id) return { error: "Escribe el ID de la liga DE/SPORTS" };

  // Liga contra la que se empatan canchas: admin_liga siempre la suya;
  // superadmin la del form (editar) o ninguna (crear liga nueva, sin canchas aún)
  let ligaId: string | null = null;
  if (user.rol === "admin_liga") {
    ligaId = await requireLigaId(user);
  } else {
    const parsed = z.string().uuid().safeParse(formData.get("ligaId"));
    ligaId = parsed.success ? parsed.data : null;
  }

  const schedule = await fetchScheduleDesports(id);
  if (!schedule) return { error: "No se encontró una liga DE/SPORTS con ese ID (o el API no respondió)" };

  const canchas = await proponerCanchas(ligaId, schedule);
  return {
    ok: true,
    dias: schedule.dias.map((d) => ({ dia: d.dia, label: DIA_LABEL[d.dia] ?? d.dia, horarios: d.horarios.length })),
    canchas,
  };
}
