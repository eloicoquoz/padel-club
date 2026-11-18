import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import path from "node:path";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

declare global {
  // eslint-disable-next-line no-var
  var __padelDb: Promise<DB> | undefined;
}

async function createDb(): Promise<DB> {
  // DATABASE_URL, sinon les variables injectées par les intégrations Vercel (Supabase / Neon).
  // Connexion DIRECTE de préférence (session mode) : le pooler transactionnel (Supavisor) a
  // montré des blocages avec les fonctions serverless. Avec max=1 par instance, on reste
  // très loin de la limite de connexions.
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;

  if (url) {
    // Production / staging : Postgres (Supabase, Neon, Vercel Postgres…)
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // Serverless : une connexion par instance, timeouts courts, pas de prepared statements (pooler).
    const client = postgres(url, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 5,
      connect_timeout: 10,
      // Auto-guérison côté serveur : aucune requête ni transaction ne peut rester coincée.
      connection: { statement_timeout: 15000, idle_in_transaction_session_timeout: 15000 },
    });
    const db = drizzle(client, { schema });
    // Les migrations ne sont JAMAIS appliquées au démarrage en prod (verrous entre instances
    // concurrentes) : elles tournent au build via `npm run db:migrate` (voir package.json).
    return db as unknown as DB;
  }

  // Développement local : Postgres embarqué (PGlite), données dans ./.pglite
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!globalThis.__padelDb) {
    globalThis.__padelDb = createDb();
  }
  return globalThis.__padelDb;
}

export { schema };
