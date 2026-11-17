import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { EventType, Event } from "@/lib/db/schema";
import { fmt, formatDate, formatTime, joinNames, getDict, type Locale } from "@/lib/i18n";
import { getUsersMap, type PublicUser } from "./users";
import { isBadgeKey } from "@/lib/badges";

export async function addEvent(type: EventType, payload: Record<string, unknown>) {
  const db = await getDb();
  const [e] = await db.insert(schema.events).values({ type, payload }).returning();
  return e;
}

export async function recentEvents(limit = 20): Promise<Event[]> {
  const db = await getDb();
  return db.select().from(schema.events).orderBy(desc(schema.events.createdAt)).limit(limit);
}

function collectIds(events: Event[]): string[] {
  const ids: string[] = [];
  for (const e of events) {
    for (const k of ["winners", "losers", "from", "to"]) {
      const v = e.payload[k];
      if (Array.isArray(v)) ids.push(...(v as string[]));
    }
    for (const k of ["userId", "prevId", "winnerId"]) {
      const v = e.payload[k];
      if (typeof v === "string") ids.push(v);
    }
    if (Array.isArray(e.payload.winnerIds)) ids.push(...(e.payload.winnerIds as string[]));
  }
  return ids;
}

/** Rend une news dans la langue demandée. Les événements stockent des ids, pas du texte. */
export function renderEvent(e: Event, locale: Locale, users: Map<string, PublicUser>): string {
  const t = getDict(locale);
  const n = (id: unknown) => (typeof id === "string" ? users.get(id)?.name ?? "?" : "?");
  const names = (ids: unknown) => (Array.isArray(ids) ? joinNames((ids as string[]).map(n)) : "?");
  const p = e.payload;
  switch (e.type) {
    case "match_played": {
      const tags = (p.tags as string[]) ?? [];
      const params = { winners: names(p.winners), losers: names(p.losers), score: String(p.score ?? "") };
      if (tags.includes("bagel")) return fmt(t.news.match_bagel, params);
      if (tags.includes("upset")) return fmt(t.news.match_upset, params);
      return fmt(t.news.match_played, params);
    }
    case "new_leader":
      return fmt(t.news.new_leader, {
        name: n(p.userId),
        prev: typeof p.prevId === "string" ? fmt(t.news.new_leader_prev, { prev: n(p.prevId) }) : "",
      });
    case "streak":
      return fmt(t.news.streak, { name: n(p.userId), n: Number(p.n ?? 0) });
    case "badge_earned": {
      const key = String(p.badge);
      const badgeName = isBadgeKey(key) ? t.badges[key].name : key;
      return fmt(t.news.badge_earned, { name: n(p.userId), badge: badgeName });
    }
    case "new_player":
      return fmt(t.news.new_player, { name: n(p.userId) });
    case "session_created":
      return fmt(t.news.session_created, {
        date: typeof p.startsAt === "string" ? `${formatDate(p.startsAt, locale)} ${formatTime(p.startsAt, locale)}` : "",
        n: Number(p.places ?? 0),
      });
    case "challenge_sent":
      return fmt(t.news.challenge_sent, {
        from: names(p.from),
        to: names(p.to),
        msg: typeof p.message === "string" && p.message ? ` — « ${p.message} »` : "",
      });
    case "challenge_accepted":
      return fmt(t.news.challenge_accepted, { from: names(p.from), to: names(p.to) });
    case "challenge_declined":
      return fmt(t.news.challenge_declined, { from: names(p.from), to: names(p.to) });
    case "americano_finished":
      return fmt(t.news.americano_finished, { name: String(p.name ?? ""), winner: n(p.winnerId) });
    case "month_king":
      return fmt(t.news.month_king, { name: n(p.userId), month: String(p.month ?? "") });
    default:
      return "";
  }
}

export async function renderRecentNews(locale: Locale, limit = 12): Promise<{ id: string; text: string; type: EventType; createdAt: Date }[]> {
  const events = await recentEvents(limit);
  const users = await getUsersMap(collectIds(events));
  return events
    .map((e) => ({ id: e.id, type: e.type, createdAt: e.createdAt, text: renderEvent(e, locale, users) }))
    .filter((x) => x.text);
}
