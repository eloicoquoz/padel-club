/** Applique les migrations SQL (./drizzle) sur la base DATABASE_URL (ou PGlite local si absente). */
import { getDb } from "../src/lib/db";
process.env.AUTO_MIGRATE = "1";
getDb().then(() => {
  console.log("Migrations appliquées.");
  process.exit(0);
});
