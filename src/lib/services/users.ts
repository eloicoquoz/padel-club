import { desc, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { User } from "@/lib/db/schema";

export type PublicUser = Pick<User, "id" | "name" | "color" | "elo" | "gamesPlayed" | "wins" | "losses" | "streak" | "bestStreak" | "playtomicLevel" | "playtomicUrl" | "createdAt">;

export const publicColumns = {
  id: schema.users.id,
  name: schema.users.name,
  color: schema.users.color,
  elo: schema.users.elo,
  gamesPlayed: schema.users.gamesPlayed,
  wins: schema.users.wins,
  losses: schema.users.losses,
  streak: schema.users.streak,
  bestStreak: schema.users.bestStreak,
  playtomicLevel: schema.users.playtomicLevel,
  playtomicUrl: schema.users.playtomicUrl,
  createdAt: schema.users.createdAt,
};

export { initials } from "@/lib/format";

export async function listUsers(): Promise<PublicUser[]> {
  const db = await getDb();
  return db.select(publicColumns).from(schema.users).orderBy(schema.users.name);
}

/** Classement : joueurs ayant joué au moins un match, triés par Elo. */
export async function getRanking(): Promise<(PublicUser & { rank: number })[]> {
  const db = await getDb();
  const rows = await db
    .select(publicColumns)
    .from(schema.users)
    .where(sql`${schema.users.gamesPlayed} > 0`)
    .orderBy(desc(schema.users.elo), desc(schema.users.wins), schema.users.name);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getUsersMap(ids: string[]): Promise<Map<string, PublicUser>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.select(publicColumns).from(schema.users).where(inArray(schema.users.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

export function rankOf(ranking: { id: string; rank: number }[], userId: string): number | null {
  return ranking.find((r) => r.id === userId)?.rank ?? null;
}
