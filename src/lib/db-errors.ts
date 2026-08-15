import "server-only";

/**
 * Detecta violaciones de unicidad de Postgres (código 23505) y devuelve el
 * nombre del constraint. Drizzle envuelve el error original (DrizzleQueryError
 * con `cause`), así que se recorre la cadena de causas — un
 * `String(e).includes("nombre_del_indice")` ya no funciona.
 */
export function constraintUnico(e: unknown): string | null {
  let actual: unknown = e;
  for (let i = 0; i < 6 && actual && typeof actual === "object"; i++) {
    const err = actual as { code?: string; constraint_name?: string; cause?: unknown };
    if (err.code === "23505") return err.constraint_name ?? "";
    actual = err.cause;
  }
  return null;
}
