import "server-only";

/**
 * Integración con la plataforma de videos DE/SPORTS (admin.de-sports.com.mx).
 * El API expone, por liga, las franjas semanales en que graban las cámaras:
 * día de la semana + cancha + hora, con la URL (estable) del video de cada
 * franja. El video de una franja se reemplaza cada semana por el de la nueva
 * jornada, así que la URL sirve ~7 días para un partido dado.
 */

const API_BASE = "https://admin.de-sports.com.mx/api/plugins/schedule";

export interface SlotDesports {
  dia: string; // "lunes".."domingo" (mismo formato que torneos.diasJuego)
  cancha: string; // nombre de la cancha en DE/SPORTS (trim)
  hora: string; // HH:MM
  url: string; // link al video de la franja
  titulo: string;
}

export interface ScheduleDesports {
  canchas: string[];
  dias: { dia: string; horarios: string[] }[];
  slots: SlotDesports[];
}

/** "Miércoles" → "miercoles" (formato de torneos.diasJuego). */
function normalizarDia(day: string): string {
  return day
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const DIAS_VALIDOS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

interface ApiMatch { court?: string; url?: string; title?: string; time?: string }
interface ApiRecording { day?: string; matches?: ApiMatch[] }

/**
 * Trae el horario de cámaras de una liga DE/SPORTS. Devuelve null si el id no
 * existe o el API no responde con la forma esperada.
 */
export async function fetchScheduleDesports(ligaId: string): Promise<ScheduleDesports | null> {
  if (!/^[a-f0-9]{24}$/i.test(ligaId.trim())) return null;
  let data: { recordings?: ApiRecording[] };
  try {
    const res = await fetch(`${API_BASE}?league=${ligaId.trim()}`, {
      next: { revalidate: 300 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }
  if (!Array.isArray(data.recordings)) return null;

  const slots: SlotDesports[] = [];
  for (const rec of data.recordings) {
    const dia = normalizarDia(rec.day ?? "");
    if (!DIAS_VALIDOS.includes(dia)) continue;
    for (const m of rec.matches ?? []) {
      const hora = (m.time ?? "").trim();
      const cancha = (m.court ?? "").trim();
      if (!/^\d{2}:\d{2}$/.test(hora) || !cancha || !m.url) continue;
      slots.push({ dia, cancha, hora, url: m.url, titulo: (m.title ?? "").trim() });
    }
  }
  if (!slots.length) return null;

  const canchas = [...new Set(slots.map((s) => s.cancha))].sort();
  const dias = DIAS_VALIDOS
    .filter((d) => slots.some((s) => s.dia === d))
    .map((d) => ({
      dia: d,
      horarios: [...new Set(slots.filter((s) => s.dia === d).map((s) => s.hora))].sort(),
    }));
  return { canchas, dias, slots };
}

/** Nombre normalizado para comparar canchas ("Cancha FUT 7 " ≈ "cancha fut 7"). */
export function normalizarNombreCancha(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Similitud 0..1 entre nombres de cancha (Levenshtein sobre nombres normalizados). */
export function similitudCanchas(a: string, b: string): number {
  const x = normalizarNombreCancha(a);
  const y = normalizarNombreCancha(b);
  if (x === y) return 1;
  const n = x.length;
  const m = y.length;
  if (!n || !m) return 0;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[m] / Math.max(n, m);
}

/** Minutos de diferencia entre dos horas HH:MM. */
function difMinutos(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.abs(ah * 60 + am - (bh * 60 + bm));
}

const DIA_POR_INDICE = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/**
 * Busca la franja de video de un partido: mismo día de la semana, misma cancha
 * DE/SPORTS y la hora más cercana (tolerancia ±45 min — las franjas arrancan
 * :00/:05 y los roles pueden programar :00/:30).
 */
export function slotDePartido(
  slots: SlotDesports[],
  partido: { fecha: string; hora: string; desportsCourt: string | null }
): SlotDesports | null {
  if (!partido.desportsCourt) return null;
  const dia = DIA_POR_INDICE[new Date(partido.fecha + "T12:00:00").getDay()];
  const candidatos = slots.filter(
    (s) => s.dia === dia && normalizarNombreCancha(s.cancha) === normalizarNombreCancha(partido.desportsCourt!)
  );
  let mejor: SlotDesports | null = null;
  let mejorDif = 46;
  for (const s of candidatos) {
    const d = difMinutos(s.hora, partido.hora);
    if (d < mejorDif) {
      mejor = s;
      mejorDif = d;
    }
  }
  return mejor;
}

/**
 * Ventana de vida del video: la franja se reutiliza cada semana, así que el
 * video de un partido está disponible desde que termina hasta ~6 días después.
 */
export function videoVigente(fechaPartido: string, hoy: string): boolean {
  const f = new Date(fechaPartido + "T12:00:00").getTime();
  const h = new Date(hoy + "T12:00:00").getTime();
  const dias = (h - f) / 86_400_000;
  return dias >= 0 && dias < 7;
}
