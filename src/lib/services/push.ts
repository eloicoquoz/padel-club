/**
 * Notifications push (Web Push / VAPID). Chaque téléphone enregistre un abonnement ;
 * on l'utilise pour envoyer des notifs dans la langue du destinataire.
 * Variables : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), APP_URL.
 */
import * as webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getDict, fmt, joinNames, type Locale, isLocale } from "@/lib/i18n";
import { appUrl } from "./teams";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:padel@example.com", pub, priv);
    configured = true;
  }
  return true;
}

export function pushEnabled() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent ?? null })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

export async function removeSubscription(endpoint: string) {
  const db = await getDb();
  await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
}

export async function hasSubscription(userId: string) {
  const db = await getDb();
  const rows = await db.select({ id: schema.pushSubscriptions.id }).from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId)).limit(1);
  return rows.length > 0;
}

/** Envoie une notif à une liste d'utilisateurs ; le texte est construit par utilisateur (langue). */
export async function notifyUsers(userIds: string[], build: (locale: Locale) => PushPayload) {
  if (!configure()) return;
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  const db = await getDb();
  const users = await db.select({ id: schema.users.id, locale: schema.users.locale }).from(schema.users).where(inArray(schema.users.id, ids));
  const subs = await db.select().from(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.userId, ids));
  const localeOf = new Map(users.map((u) => [u.id, isLocale(u.locale) ? u.locale : "fr"]));
  await Promise.all(
    subs.map(async (s) => {
      const payload = build(localeOf.get(s.userId) ?? "fr");
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...payload, url: payload.url ?? appUrl("/") }),
          { TTL: 60 * 60 * 12 },
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await removeSubscription(s.endpoint); // abonnement expiré
        else console.warn("[push] failed", code);
      }
    }),
  );
}

// ---------- Messages métier ----------

export async function pushChallengeReceived(toIds: string[], fromNames: string[], message: string | null, challengeId: string) {
  await notifyUsers(toIds, (l) => {
    const t = getDict(l);
    return {
      title: fmt(t.home.challengeFrom, { names: joinNames(fromNames) }),
      body: message ? `« ${message} »` : t.challenges.title,
      url: appUrl("/challenges"),
      tag: `challenge-${challengeId}`,
    };
  });
}

export async function pushChallengeAnswered(fromIds: string[], toNames: string[], accepted: boolean, reply: string | null) {
  await notifyUsers(fromIds, (l) => {
    const t = getDict(l);
    return {
      title: `${joinNames(toNames)} — ${accepted ? t.challenges.accepted : t.challenges.declined}`,
      body: reply ?? (accepted ? t.challenges.recordMatch : ""),
      url: appUrl("/challenges"),
    };
  });
}

export async function pushSessionCreated(userIds: string[], when: (l: Locale) => string, places: number, sessionId: string) {
  await notifyUsers(userIds, (l) => {
    const t = getDict(l);
    return { title: t.home.nextSession, body: fmt(t.news.session_created, { date: when(l), n: places }), url: appUrl(`/sessions/${sessionId}`), tag: `session-${sessionId}` };
  });
}

export async function pushMatchRecorded(userIds: string[], winners: string[], losers: string[], score: string, matchId: string) {
  await notifyUsers(userIds, (l) => {
    const t = getDict(l);
    return { title: t.nav.newMatch, body: fmt(t.news.match_played, { winners: joinNames(winners), losers: joinNames(losers), score }), url: appUrl(`/match/${matchId}`), tag: `match-${matchId}` };
  });
}
