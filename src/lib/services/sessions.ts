import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Session } from "@/lib/db/schema";
import { getUsersMap, type PublicUser } from "./users";
import { addEvent } from "./events";
import { background } from "@/lib/background";
import { pushSessionCreated } from "./push";
import { formatDate, formatTime } from "@/lib/i18n";

export type SessionView = Session & {
  players: PublicUser[];
  max: number;
  organizer: PublicUser | null;
};

async function hydrate(rows: Session[]): Promise<SessionView[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const sp = await db
    .select()
    .from(schema.sessionPlayers)
    .where(inArray(schema.sessionPlayers.sessionId, rows.map((r) => r.id)))
    .orderBy(asc(schema.sessionPlayers.joinedAt));
  const users = await getUsersMap([...sp.map((x) => x.userId), ...rows.map((r) => r.createdBy)]);
  return rows.map((r) => ({
    ...r,
    max: r.courts * 4,
    organizer: users.get(r.createdBy) ?? null,
    players: sp.filter((x) => x.sessionId === r.id).map((x) => users.get(x.userId)!).filter(Boolean),
  }));
}

export async function upcomingSessions(limit = 10) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(gte(schema.sessions.startsAt, sql`now() - interval '3 hours'`))
    .orderBy(asc(schema.sessions.startsAt))
    .limit(limit);
  return hydrate(rows);
}

export async function pastSessions(limit = 10) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(lt(schema.sessions.startsAt, sql`now() - interval '3 hours'`))
    .orderBy(desc(schema.sessions.startsAt))
    .limit(limit);
  return hydrate(rows);
}

export async function getSession(id: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
  const [v] = await hydrate(rows);
  return v ?? null;
}

export async function createSession(input: {
  startsAt: Date;
  durationMin: number;
  courts: number;
  location: string;
  playtomicUrl?: string | null;
  note?: string | null;
  createdBy: string;
}) {
  const db = await getDb();
  const [s] = await db.insert(schema.sessions).values(input).returning();
  // L'organisateur est inscrit d'office.
  await db.insert(schema.sessionPlayers).values({ sessionId: s.id, userId: input.createdBy }).onConflictDoNothing();
  await addEvent("session_created", { sessionId: s.id, startsAt: s.startsAt.toISOString(), places: s.courts * 4 });
  const others = (await db.select({ id: schema.users.id }).from(schema.users)).map((u) => u.id).filter((id) => id !== input.createdBy);
  background(() => pushSessionCreated(others, (l) => `${formatDate(s.startsAt, l, { weekday: "long", day: "numeric", month: "short" })} ${formatTime(s.startsAt, l)}`, s.courts * 4, s.id));
  return s;
}

export async function joinSession(sessionId: string, userId: string) {
  const db = await getDb();
  const s = await getSession(sessionId);
  if (!s) throw new Error("not_found");
  if (s.players.length >= s.max && !s.players.some((p) => p.id === userId)) throw new Error("full");
  await db.insert(schema.sessionPlayers).values({ sessionId, userId }).onConflictDoNothing();
  // Badge "fidèle" : 10 sessions
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.sessionPlayers)
    .where(eq(schema.sessionPlayers.userId, userId));
  if (Number(n) >= 10) {
    await db.insert(schema.userBadges).values({ userId, badge: "regular_10" }).onConflictDoNothing();
  }
}

export async function leaveSession(sessionId: string, userId: string) {
  const db = await getDb();
  await db.delete(schema.sessionPlayers).where(and(eq(schema.sessionPlayers.sessionId, sessionId), eq(schema.sessionPlayers.userId, userId)));
}

export async function deleteSession(sessionId: string, userId: string, isAdmin: boolean) {
  const db = await getDb();
  const s = await getSession(sessionId);
  if (!s) return;
  if (s.createdBy !== userId && !isAdmin) throw new Error("forbidden");
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

/**
 * Paires équilibrées : on trie par Elo et on associe le plus fort au plus faible
 * (1-4 vs 2-3 par groupe de 4) pour que les deux équipes aient un Elo moyen proche.
 */
export function balancedPairs(players: PublicUser[]): { court: number; a: PublicUser[]; b: PublicUser[] }[] {
  const sorted = [...players].sort((x, y) => y.elo - x.elo);
  const out: { court: number; a: PublicUser[]; b: PublicUser[] }[] = [];
  for (let i = 0; i + 3 < sorted.length; i += 4) {
    const g = sorted.slice(i, i + 4);
    out.push({ court: out.length + 1, a: [g[0], g[3]], b: [g[1], g[2]] });
  }
  return out;
}
