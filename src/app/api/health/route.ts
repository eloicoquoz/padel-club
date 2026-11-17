import { getDb, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
  return Response.json({ ok: true, users: Number(n) });
}
