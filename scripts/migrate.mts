/**
 * Applique les migrations SQL (./drizzle) sur la base de prod.
 * Utilise de préférence l'URL sans pooler (POSTGRES_URL_NON_POOLING) : les migrations
 * ont besoin d'une vraie session. Sans URL (build local sans DB), on ne fait rien.
 */
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL_NON_POOLING ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.log("[migrate] Pas de DATABASE_URL : migrations ignorées (base locale PGlite migrée au démarrage).");
  process.exit(0);
}
const client = postgres(url, { max: 1, prepare: false, connect_timeout: 20 });
try {
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[migrate] Migrations appliquées.");
} finally {
  await client.end();
}
