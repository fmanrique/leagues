/**
 * Arranque de una base de datos NUEVA (cambio de cuenta Supabase):
 * no migra datos — deja la base limpia con solo el usuario superadmin,
 * y crea el bucket público de Storage si no existe.
 *
 * Requisitos previos:
 *   1. .env apuntando al proyecto nuevo (DATABASE_URL, SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, STORAGE_DRIVER=supabase).
 *   2. Esquema ya creado:  npm run db:migrate
 *
 * Uso:  npx tsx scripts/bootstrap-nueva-db.ts <usuario> <contraseña> [nombre]
 */
import { hash } from "@node-rs/argon2";
import { count } from "drizzle-orm";
import { db, tables as t } from "../src/db";

const [usuario, password, nombre] = process.argv.slice(2);

async function main() {
  if (!usuario || !password) {
    console.error("Uso: npx tsx scripts/bootstrap-nueva-db.ts <usuario> <contraseña> [nombre]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("⚠ La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL ?? "";
  console.log("Base de datos:", url.replace(/:[^:@/]+@/, ":****@"));

  // Guard: este script es para bases NUEVAS. Si ya hay ligas o usuarios,
  // probablemente apunta a la base equivocada.
  const [[{ n: ligas }], [{ n: usuarios }]] = await Promise.all([
    db.select({ n: count() }).from(t.ligas),
    db.select({ n: count() }).from(t.usuarios),
  ]);
  if (ligas > 0 || usuarios > 0) {
    console.error(
      `⚠ Esta base NO está vacía (${ligas} liga(s), ${usuarios} usuario(s)). ` +
      "Verifica que DATABASE_URL apunte al proyecto nuevo. No se hizo ningún cambio."
    );
    process.exit(1);
  }

  // Superadmin (ligaId null → acceso a todas las ligas)
  await db.insert(t.usuarios).values({
    ligaId: null,
    username: usuario,
    passwordHash: await hash(password),
    nombre: nombre ?? "DE/SPORTS",
    rol: "superadmin",
  });
  console.log(`✓ Superadmin "${usuario}" creado.`);

  // Bucket público de Storage (idempotente)
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "desport";
  if (base && key) {
    const res = await fetch(`${base}/storage/v1/bucket`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
    if (res.ok) console.log(`✓ Bucket público "${bucket}" creado.`);
    else if (res.status === 409) console.log(`✓ Bucket "${bucket}" ya existía.`);
    else console.error(`⚠ No se pudo crear el bucket "${bucket}": ${res.status} ${await res.text()}`);
  } else {
    console.log("⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no definidos: crea el bucket a mano (público).");
  }

  console.log("\nLista. Entra a /admin con el superadmin y crea la primera liga.");
  process.exit(0);
}

main();
