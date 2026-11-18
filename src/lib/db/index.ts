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
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;

  if (url) {
    // Production / staging : Postgres (Supabase, Neon, Vercel Postgres…)
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 5, prepare: false });
    const db = drizzle(client, { schema });
    if (process.env.AUTO_MIGRATE === "1") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    }
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
