import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Tournament, TournamentMatch } from "@/lib/db/schema";
import { generateRound, standings, type Standing } from "@/lib/americano";
import { getUsersMap, type PublicUser } from "./users";
import { addEvent } from "./events";

export type TournamentView = Tournament & {
  players: PublicUser[];
  matches: TournamentMatch[];
  standings: (Standing & { user: PublicUser })[];
  users: Map<string, PublicUser>;
};

export async function listTournaments(limit = 10) {
  const db = await getDb();
  return db.select().from(schema.tournaments).orderBy(desc(schema.tournaments.createdAt)).limit(limit);
}

export async function getTournament(id: string): Promise<TournamentView | null> {
  const db = await getDb();
  const [t] = await db.select().from(schema.tournaments).where(eq(schema.tournaments.id, id)).limit(1);
  if (!t) return null;
  const tp = await db.select().from(schema.tournamentPlayers).where(eq(schema.tournamentPlayers.tournamentId, id));
  const ms = await db
    .select()
    .from(schema.tournamentMatches)
    .where(eq(schema.tournamentMatches.tournamentId, id))
    .orderBy(asc(schema.tournamentMatches.round), asc(schema.tournamentMatches.court));
  const users = await getUsersMap(tp.map((x) => x.userId));
  const players = tp.map((x) => users.get(x.userId)!).filter(Boolean);
  const st = standings(
    players.map((p) => p.id),
    ms.map((m) => ({ a1: m.a1, a2: m.a2, b1: m.b1, b2: m.b2, scoreA: m.scoreA, scoreB: m.scoreB })),
  ).map((s) => ({ ...s, user: users.get(s.userId)! }));
  return { ...t, players, matches: ms, standings: st, users };
}

export async function createTournament(input: { name: string; courts: number; pointsPerMatch: number; createdBy: string; playerIds: string[] }) {
  const db = await getDb();
  const [t] = await db
    .insert(schema.tournaments)
    .values({ name: input.name, courts: input.courts, pointsPerMatch: input.pointsPerMatch, createdBy: input.createdBy })
    .returning();
  const ids = [...new Set([...input.playerIds, input.createdBy])];
  if (ids.length) await db.insert(schema.tournamentPlayers).values(ids.map((userId) => ({ tournamentId: t.id, userId }))).onConflictDoNothing();
  return t;
}

export async function setTournamentPlayers(id: string, playerIds: string[]) {
  const db = await getDb();
  await db.delete(schema.tournamentPlayers).where(eq(schema.tournamentPlayers.tournamentId, id));
  if (playerIds.length) await db.insert(schema.tournamentPlayers).values(playerIds.map((userId) => ({ tournamentId: id, userId })));
}

/** Clôture le tour courant (si tous les scores sont saisis) et tire le suivant. */
export async function nextRound(id: string) {
  const db = await getDb();
  const t = await getTournament(id);
  if (!t) throw new Error("not_found");
  if (t.players.length < 4) throw new Error("min_players");
  const current = t.matches.filter((m) => m.round === t.currentRound);
  if (current.some((m) => m.scoreA === null || m.scoreB === null)) throw new Error("scores_missing");
  const round = t.currentRound + 1;
  const { matches } = generateRound(
    t.players.map((p) => p.id),
    t.matches.map((m) => ({ a1: m.a1, a2: m.a2, b1: m.b1, b2: m.b2 })),
    t.courts,
  );
  if (matches.length) {
    await db.insert(schema.tournamentMatches).values(matches.map((m) => ({ tournamentId: id, round, ...m })));
  }
  await db.update(schema.tournaments).set({ currentRound: round, status: "running" }).where(eq(schema.tournaments.id, id));
  return round;
}

export async function setScore(matchId: string, scoreA: number, scoreB: number) {
  const db = await getDb();
  await db.update(schema.tournamentMatches).set({ scoreA, scoreB }).where(eq(schema.tournamentMatches.id, matchId));
}

export async function finishTournament(id: string) {
  const db = await getDb();
  const t = await getTournament(id);
  if (!t) throw new Error("not_found");
  await db.update(schema.tournaments).set({ status: "finished" }).where(eq(schema.tournaments.id, id));
  const winner = t.standings[0];
  if (winner) await addEvent("americano_finished", { tournamentId: id, name: t.name, winnerId: winner.userId });
}

export async function deleteTournament(id: string, userId: string, isAdmin: boolean) {
  const db = await getDb();
  const [t] = await db.select().from(schema.tournaments).where(eq(schema.tournaments.id, id)).limit(1);
  if (!t) return;
  if (t.createdBy !== userId && !isAdmin) throw new Error("forbidden");
  await db.delete(schema.tournaments).where(eq(schema.tournaments.id, id));
}

export { and, inArray };
