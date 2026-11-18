import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { SeasonStanding } from "@/lib/db/schema";
import { getUsersMap, type PublicUser } from "./users";
import { addEvent } from "./events";
import { notifyUsers } from "./push";
import { getDict, fmt, formatMonth, type Locale } from "@/lib/i18n";

const TZ = "Europe/Zurich";

/** "2026-11" pour une date, en heure suisse. */
export function monthKey(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(d);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
}

export function previousMonthKey(d = new Date()) {
  const [y, m] = monthKey(d).split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 15));
  return monthKey(prev);
}

/** Bornes UTC d'un mois suisse. */
function monthBounds(key: string): { start: Date; end: Date } {
  const [y, m] = key.split("-").map(Number);
  // Minuit heure suisse ≈ 23:00/22:00 UTC la veille ; une marge d'une heure n'a pas d'importance pour un classement entre collègues.
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - 60 * 60 * 1000);
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 60 * 60 * 1000);
  return { start, end };
}

export function monthDate(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15));
}

export type MonthRow = SeasonStanding & { user: PublicUser; rank: number; games: number };

/** Classement du mois : Elo gagné (somme des deltas), puis victoires. Joueurs avec ≥ 1 match dans le mois. */
export async function monthStandings(key: string): Promise<{ rows: MonthRow[]; matches: number }> {
  const db = await getDb();
  const { start, end } = monthBounds(key);
  const hist = await db
    .select({
      userId: schema.ratingHistory.userId,
      delta: sql<number>`sum(${schema.ratingHistory.eloAfter} - ${schema.ratingHistory.eloBefore})::int`,
      games: sql<number>`count(*)::int`,
      wins: sql<number>`sum(case when ${schema.ratingHistory.eloAfter} > ${schema.ratingHistory.eloBefore} then 1 else 0 end)::int`,
    })
    .from(schema.ratingHistory)
    .where(and(gte(schema.ratingHistory.createdAt, start), lt(schema.ratingHistory.createdAt, end)))
    .groupBy(schema.ratingHistory.userId);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.matches)
    .where(and(gte(schema.matches.playedAt, start), lt(schema.matches.playedAt, end)));
  const users = await getUsersMap(hist.map((h) => h.userId));
  const rows = hist
    .map((h) => ({
      userId: h.userId,
      delta: Number(h.delta),
      games: Number(h.games),
      wins: Number(h.wins),
      losses: Number(h.games) - Number(h.wins),
      elo: users.get(h.userId)?.elo ?? 0,
      user: users.get(h.userId)!,
    }))
    .filter((r) => r.user)
    .sort((a, b) => b.delta - a.delta || b.wins - a.wins || b.elo - a.elo)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return { rows, matches: Number(n) };
}

export async function listSeasons(limit = 12) {
  const db = await getDb();
  const rows = await db.select().from(schema.seasons).orderBy(desc(schema.seasons.month)).limit(limit);
  const users = await getUsersMap(rows.map((r) => r.winnerId).filter((x): x is string => !!x));
  return rows.map((r) => ({ ...r, winner: r.winnerId ? users.get(r.winnerId) ?? null : null }));
}

export async function getSeason(key: string) {
  const db = await getDb();
  const [r] = await db.select().from(schema.seasons).where(eq(schema.seasons.month, key)).limit(1);
  return r ?? null;
}

/**
 * Clôture un mois (idempotent) : fige le classement, attribue le badge roi/reine du mois,
 * publie la news et envoie un push. Renvoie null si déjà clôturé ou sans match.
 */
export async function closeMonth(key: string) {
  if (await getSeason(key)) return null;
  const { rows, matches } = await monthStandings(key);
  if (matches === 0) return null;
  const db = await getDb();
  const winner = rows[0] ?? null;
  const [season] = await db
    .insert(schema.seasons)
    .values({ month: key, winnerId: winner?.userId ?? null, matches, standings: rows.map(({ userId, delta, wins, losses, elo }) => ({ userId, delta, wins, losses, elo })) })
    .onConflictDoNothing()
    .returning();
  if (!season) return null;
  if (winner) {
    await db.insert(schema.userBadges).values({ userId: winner.userId, badge: "month_king" }).onConflictDoNothing();
    await addEvent("month_king", { userId: winner.userId, month: key, delta: winner.delta });
    const all = (await db.select({ id: schema.users.id }).from(schema.users)).map((u) => u.id);
    await notifyUsers(all, (l: Locale) => {
      const t = getDict(l);
      return { title: t.badges.month_king.name, body: fmt(t.news.month_king, { name: winner.user.name, month: formatMonth(monthDate(key), l) }), url: undefined, tag: `season-${key}` };
    });
  }
  return season;
}
