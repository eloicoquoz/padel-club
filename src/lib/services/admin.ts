import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { computeElo, START_ELO } from "@/lib/elo";
import type { BadgeKey } from "@/lib/badges";

const RESET_HOURS = 48;

function sha(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

/** Crée un lien de réinitialisation à usage unique (48 h). Renvoie le token en clair (à partager). */
export async function createResetToken(userId: string, createdBy: string | null) {
  const db = await getDb();
  const token = randomBytes(24).toString("base64url");
  await db.insert(schema.passwordResets).values({
    userId,
    tokenHash: sha(token),
    expiresAt: new Date(Date.now() + RESET_HOURS * 3600 * 1000),
    createdBy,
  });
  return token;
}

export async function getResetUser(token: string) {
  const db = await getDb();
  const [r] = await db
    .select({ id: schema.passwordResets.id, userId: schema.passwordResets.userId, name: schema.users.name })
    .from(schema.passwordResets)
    .innerJoin(schema.users, eq(schema.users.id, schema.passwordResets.userId))
    .where(and(eq(schema.passwordResets.tokenHash, sha(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
    .limit(1);
  return r ?? null;
}

export async function consumeReset(token: string, newPassword: string) {
  const r = await getResetUser(token);
  if (!r) throw new Error("invalid");
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(schema.users.id, r.userId));
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.id, r.id));
  return r.userId;
}

export async function setPassword(userId: string, newPassword: string) {
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(schema.users.id, userId));
}

export async function setAdmin(userId: string, isAdmin: boolean) {
  const db = await getDb();
  await db.update(schema.users).set({ isAdmin }).where(eq(schema.users.id, userId));
}

export async function listUsersAdmin() {
  const db = await getDb();
  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      color: schema.users.color,
      elo: schema.users.elo,
      gamesPlayed: schema.users.gamesPlayed,
      isAdmin: schema.users.isAdmin,
      locale: schema.users.locale,
      createdAt: schema.users.createdAt,
      pushCount: sql<number>`(select count(*)::int from push_subscriptions p where p.user_id = ${schema.users.id})`,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));
}

/** Supprime un match et rejoue tout l'historique pour recalculer Elo, stats et séries. */
export async function deleteMatch(matchId: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.ratingHistory).where(eq(schema.ratingHistory.matchId, matchId));
    await tx.delete(schema.userBadges).where(eq(schema.userBadges.matchId, matchId));
    await tx.delete(schema.events).where(sql`${schema.events.payload}->>'matchId' = ${matchId}`);
    await tx.update(schema.challenges).set({ status: "accepted", matchId: null }).where(eq(schema.challenges.matchId, matchId));
    await tx.delete(schema.matches).where(eq(schema.matches.id, matchId));
  });
  await rebuildRatings();
}

/**
 * Rejoue tous les matchs dans l'ordre chronologique : Elo, victoires/défaites, séries,
 * deltas stockés sur les matchs et historique Elo. Les badges existants sont conservés.
 */
export async function rebuildRatings() {
  const db = await getDb();
  const users = await db.select({ id: schema.users.id }).from(schema.users);
  const matches = await db.select().from(schema.matches).orderBy(asc(schema.matches.playedAt), asc(schema.matches.createdAt));
  type S = { elo: number; games: number; wins: number; losses: number; streak: number; best: number };
  const state = new Map<string, S>(users.map((u) => [u.id, { elo: START_ELO, games: 0, wins: 0, losses: 0, streak: 0, best: 0 }]));
  const history: (typeof schema.ratingHistory.$inferInsert)[] = [];
  const deltas: { id: string; a: number; b: number }[] = [];
  for (const m of matches) {
    const ids = [m.a1, m.a2, m.b1, m.b2];
    const st = ids.map((id) => state.get(id)!);
    const { deltaA, deltaB } = computeElo({
      teamA: [st[0], st[1]].map((s) => ({ elo: s.elo, gamesPlayed: s.games })),
      teamB: [st[2], st[3]].map((s) => ({ elo: s.elo, gamesPlayed: s.games })),
      winner: m.winner,
    });
    deltas.push({ id: m.id, a: deltaA, b: deltaB });
    ids.forEach((id, i) => {
      const s = state.get(id)!;
      const delta = i < 2 ? deltaA : deltaB;
      const won = (i < 2 && m.winner === "A") || (i >= 2 && m.winner === "B");
      history.push({ userId: id, matchId: m.id, eloBefore: s.elo, eloAfter: s.elo + delta, createdAt: m.playedAt });
      s.elo += delta;
      s.games++;
      if (won) {
        s.wins++;
        s.streak = Math.max(1, s.streak + 1);
      } else {
        s.losses++;
        s.streak = Math.min(-1, s.streak - 1);
      }
      s.best = Math.max(s.best, s.streak);
    });
  }
  await db.transaction(async (tx) => {
    await tx.delete(schema.ratingHistory);
    if (history.length) await tx.insert(schema.ratingHistory).values(history);
    for (const d of deltas) await tx.update(schema.matches).set({ eloDeltaA: d.a, eloDeltaB: d.b }).where(eq(schema.matches.id, d.id));
    for (const [id, s] of state) {
      await tx.update(schema.users).set({ elo: s.elo, gamesPlayed: s.games, wins: s.wins, losses: s.losses, streak: s.streak, bestStreak: s.best }).where(eq(schema.users.id, id));
    }
  });
}

/** Attribue manuellement un badge (ex. roi/reine du mois). */
export async function grantBadge(userId: string, badge: BadgeKey) {
  const db = await getDb();
  await db.insert(schema.userBadges).values({ userId, badge }).onConflictDoNothing();
}

export async function recentMatchesAdmin(limit = 30) {
  const db = await getDb();
  const rows = await db.select().from(schema.matches).orderBy(desc(schema.matches.playedAt)).limit(limit);
  const ids = [...new Set(rows.flatMap((r) => [r.a1, r.a2, r.b1, r.b2, r.createdBy]))];
  const users = ids.length ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, ids)) : [];
  const name = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({ ...r, names: { a: [name.get(r.a1), name.get(r.a2)], b: [name.get(r.b1), name.get(r.b2)], by: name.get(r.createdBy) } }));
}
