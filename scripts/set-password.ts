/**
 * Cambia la contraseña de un usuario desde la terminal.
 * Útil para el primer arranque en producción o si nadie puede entrar.
 *
 *   npm run set-password -- <usuario> <nueva-contraseña>
 *
 * Usa el DATABASE_URL del entorno (en producción, el de Supabase).
 */
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { db, tables as t } from "../src/db";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Uso: npm run set-password -- <usuario> <nueva-contraseña>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const res = await db
    .update(t.usuarios)
    .set({ passwordHash: await hash(password), updatedAt: new Date() })
    .where(eq(t.usuarios.username, username))
    .returning({ id: t.usuarios.id, nombre: t.usuarios.nombre });

  if (!res.length) {
    console.error(`No existe el usuario "${username}".`);
    process.exit(1);
  }

  // Cierra todas sus sesiones abiertas
  await db.delete(t.sesiones).where(eq(t.sesiones.usuarioId, res[0].id));
  console.log(`✓ Contraseña actualizada para ${username} (${res[0].nombre}). Sesiones cerradas.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
