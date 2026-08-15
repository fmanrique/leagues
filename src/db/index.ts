import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

/**
 * Supabase pooler (transaction mode): sin prepared statements. En serverless
 * cada instancia de lambda mantiene su propio pool — pocas conexiones por
 * instancia y soltar las ociosas evita agotar los client connections del
 * pooler cuando hay muchas instancias calientes.
 */
const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: process.env.VERCEL ? 1 : 10,
    idle_timeout: 20, // segundos
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export * as tables from "./schema";
