import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { SetScore, User } from "@/lib/db/schema";
import { computeElo, evaluateSets, formatSets } from "@/lib/elo";
import type { BadgeKey } from "@/lib/badges";
import { addEvent } from "./events";
import { getRanking, getUsersMap, rankOf, type PublicUser } from "./users";
import { postToTeams, appUrl } from "./teams";
import { getDict, isLocale, joinNames, type Locale } from "@/lib/i18n";

export type RecordMatchInput = {
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  sets: SetScore[];
  sessionId?: string | null;
  challengeId?: string | null;
  playedAt?: Date;
};

export type RecordMatchResult = {
  matchId: string;
  winner: "A" | "B";
  deltaA: number;
  deltaB: number;
  newBadges: Record<string, BadgeKey[]>; // par joueur
  tags: string[];
};

function hourInZurich(d: Date) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "numeric", hour12: false }).format(d));
}

export async function recordMatch(input: RecordMatchInput, by: User): Promise<RecordMatchResult> {
  const ids = [input.a1, input.a2, input.b1, input.b2];
  if (new Set(ids).size !== 4) throw new Error("players");
  const evalRes = evaluateSets(input.sets);
  if (!evalRes.ok || !evalRes.winner) throw new Error("sets");
  const winner = evalRes.winner;
  const playedAt = input.playedAt ?? new Date();

  const db = await getDb();
  const players = await db.select().from(schema.users).where(inArray(schema.users.id, ids));
  if (players.length !== 4) throw new Error("players");
  const byId = new Map(players.map((p) => [p.id, p]));
  const teamA = [byId.get(input.a1)!, byId.get(input.a2)!];
  const teamB = [byId.get(input.b1)!, byId.get(input.b2)!];

  // Classement AVANT le match (pour "giant killer" et "nouveau leader").
  const rankingBefore = await getRanking();
  const leaderBefore = rankingBefore[0]?.id ?? null;

  const { deltaA, deltaB, expectedA } = computeElo({
    teamA: teamA.map((p) => ({ elo: p.elo, gamesPlayed: p.gamesPlayed })),
    teamB: teamB.map((p) => ({ elo: p.elo, gamesPlayed: p.gamesPlayed })),
    winner,
  });

  const winners = winner === "A" ? teamA : teamB;
  const losers = winner === "A" ? teamB : teamA;
  const winnerIds = winners.map((p) => p.id);
  const loserIds = losers.map((p) => p.id);
  const playedSets = input.sets.filter(([a, b]) => !(a === 0 && b === 0));

  // Tags d'ambiance
  const tags: string[] = [];
  const winnerExpected = winner === "A" ? expectedA : 1 - expectedA;
  if (winnerExpected < 0.4) tags.push("upset");
  const bagelByWinner = playedSets.some(([a, b]) => (winner === "A" ? a === 6 && b === 0 : b === 6 && a === 0));
  const bagelByLoser = playedSets.some(([a, b]) => (winner === "A" ? b === 6 && a === 0 : a === 6 && b === 0));
  if (bagelByWinner) tags.push("bagel");
  if (playedSets.length >= 3) tags.push("super_tiebreak");
  const giantKiller = leaderBefore !== null && loserIds.includes(leaderBefore) && !winnerIds.includes(leaderBefore);
  if (giantKiller) tags.push("giant_killer");

  // Revanche : les perdants d'aujourd'hui avaient battu exactement cette paire gagnante auparavant ?
  const prev = await db
    .select({ id: schema.matches.id, winner: schema.matches.winner, a1: schema.matches.a1, a2: schema.matches.a2, b1: schema.matches.b1, b2: schema.matches.b2 })
    .from(schema.matches)
    .where(
      or(
        and(inArray(schema.matches.a1, winnerIds), inArray(schema.matches.a2, winnerIds), inArray(schema.matches.b1, loserIds), inArray(schema.matches.b2, loserIds)),
        and(inArray(schema.matches.b1, winnerIds), inArray(schema.matches.b2, winnerIds), inArray(schema.matches.a1, loserIds), inArray(schema.matches.a2, loserIds)),
      ),
    )
    .orderBy(desc(schema.matches.playedAt))
    .limit(1);
  let revenge = false;
  if (prev[0]) {
    const m = prev[0];
    const prevWinnersWereTodayLosers = m.winner === "A" ? loserIds.includes(m.a1) : loserIds.includes(m.b1);
    revenge = prevWinnersWereTodayLosers;
  }
  if (revenge) tags.push("revenge");

  const newBadges: Record<string, BadgeKey[]> = {};
  const push = (uid: string, b: BadgeKey) => {
    (newBadges[uid] ??= []).push(b);
  };

  const result = await db.transaction(async (tx) => {
    const [match] = await tx
      .insert(schema.matches)
      .values({
        playedAt,
        createdBy: by.id,
        a1: input.a1,
        a2: input.a2,
        b1: input.b1,
        b2: input.b2,
        sets: playedSets,
        winner,
        eloDeltaA: deltaA,
        eloDeltaB: deltaB,
        sessionId: input.sessionId ?? null,
        challengeId: input.challengeId ?? null,
        tags,
      })
      .returning();

    const existingBadges = await tx
      .select({ userId: schema.userBadges.userId, badge: schema.userBadges.badge })
      .from(schema.userBadges)
      .where(inArray(schema.userBadges.userId, ids));
    const has = (uid: string, b: BadgeKey) => existingBadges.some((x) => x.userId === uid && x.badge === b);

    for (const p of players) {
      const isWinner = winnerIds.includes(p.id);
      const delta = teamA.includes(p) ? deltaA : deltaB;
      const newStreak = isWinner ? Math.max(1, p.streak + 1) : Math.min(-1, p.streak - 1);
      const bestStreak = Math.max(p.bestStreak, newStreak);
      await tx
        .update(schema.users)
        .set({
          elo: p.elo + delta,
          gamesPlayed: p.gamesPlayed + 1,
          wins: p.wins + (isWinner ? 1 : 0),
          losses: p.losses + (isWinner ? 0 : 1),
          streak: newStreak,
          bestStreak,
        })
        .where(eq(schema.users.id, p.id));
      await tx.insert(schema.ratingHistory).values({ userId: p.id, matchId: match.id, eloBefore: p.elo, eloAfter: p.elo + delta });

      // Badges
      const candidates: BadgeKey[] = [];
      if (isWinner) {
        if (p.wins === 0) candidates.push("first_win");
        if (giantKiller) candidates.push("giant_killer");
        if (revenge) candidates.push("revenge");
        if (newStreak >= 3) candidates.push("streak_3");
        if (newStreak >= 5) candidates.push("streak_5");
        if (bagelByWinner) candidates.push("bagel_given");
        if (playedSets.length >= 3) candidates.push("super_tiebreak");
      } else if (bagelByWinner) {
        candidates.push("bagel_taken"); // perdant ayant encaissé un 6-0
      }
      void bagelByLoser;
      if (hourInZurich(playedAt) < 8) candidates.push("early_bird");

      // Sociable : 8 partenaires différents (y compris celui d'aujourd'hui)
      const partnerRows = await tx
        .select({ a1: schema.matches.a1, a2: schema.matches.a2, b1: schema.matches.b1, b2: schema.matches.b2 })
        .from(schema.matches)
        .where(or(eq(schema.matches.a1, p.id), eq(schema.matches.a2, p.id), eq(schema.matches.b1, p.id), eq(schema.matches.b2, p.id)));
      const partners = new Set<string>();
      for (const r of partnerRows) {
        if (r.a1 === p.id) partners.add(r.a2);
        else if (r.a2 === p.id) partners.add(r.a1);
        else if (r.b1 === p.id) partners.add(r.b2);
        else if (r.b2 === p.id) partners.add(r.b1);
      }
      if (partners.size >= 8) candidates.push("socialite");

      for (const b of candidates) {
        if (!has(p.id, b)) {
          await tx.insert(schema.userBadges).values({ userId: p.id, badge: b, matchId: match.id }).onConflictDoNothing();
          push(p.id, b);
        }
      }
    }
    return match;
  });

  // Événements (news) — après la transaction
  const score = formatSets(playedSets);
  await addEvent("match_played", {
    matchId: result.id,
    winners: winnerIds,
    losers: loserIds,
    score,
    delta: Math.abs(winner === "A" ? deltaA : deltaB),
    tags,
  });
  const rankingAfter = await getRanking();
  const leaderAfter = rankingAfter[0]?.id ?? null;
  if (leaderAfter && leaderAfter !== leaderBefore && rankingAfter.length >= 2) {
    await addEvent("new_leader", { userId: leaderAfter, prevId: leaderBefore });
  }
  for (const w of winners) {
    const s = w.streak + 1;
    if ([3, 5, 7, 10].includes(s)) await addEvent("streak", { userId: w.id, n: s });
  }
  for (const [uid, badges] of Object.entries(newBadges)) {
    for (const b of badges) {
      if (["revenge", "streak_5", "socialite"].includes(b)) {
        await addEvent("badge_earned", { userId: uid, badge: b });
      }
    }
  }

  // Teams (fire & forget)
  void notifyTeams({ winners, losers, score, tags, delta: Math.abs(deltaA), rankingBefore, rankingAfter, leaderBefore, leaderAfter });

  return { matchId: result.id, winner, deltaA, deltaB, newBadges, tags };
}

async function notifyTeams(args: {
  winners: User[];
  losers: User[];
  score: string;
  tags: string[];
  delta: number;
  rankingBefore: { id: string; rank: number }[];
  rankingAfter: { id: string; rank: number; name: string }[];
  leaderBefore: string | null;
  leaderAfter: string | null;
}) {
  if (!process.env.TEAMS_WEBHOOK_URL) return;
  const locale: Locale = isLocale(process.env.TEAMS_LANG) ? process.env.TEAMS_LANG : "fr";
  const t = getDict(locale);
  const w = joinNames(args.winners.map((p) => p.name));
  const l = joinNames(args.losers.map((p) => p.name));
  let text = `${w} — ${l} · **${args.score}** (+${args.delta} / -${args.delta} Elo)`;
  const chips: string[] = [];
  if (args.tags.includes("giant_killer")) chips.push(t.badges.giant_killer.name);
  if (args.tags.includes("bagel")) chips.push(t.badges.bagel_given.name);
  if (args.tags.includes("super_tiebreak")) chips.push(t.badges.super_tiebreak.name);
  if (args.tags.includes("revenge")) chips.push(t.badges.revenge.name);
  if (args.leaderAfter && args.leaderAfter !== args.leaderBefore) {
    const name = args.rankingAfter.find((r) => r.id === args.leaderAfter)?.name ?? "?";
    text += `\n\n${t.news.new_leader.replace("{name}", name).replace("{prev}", "")}`;
  }
  const headline = args.tags.includes("bagel")
    ? t.news.match_bagel
    : args.tags.includes("upset")
      ? t.news.match_upset
      : t.news.match_played;
  const title = headline.replace("{winners}", w).replace("{losers}", l).replace("{score}", args.score);
  await postToTeams({
    title,
    text,
    chips,
    actions: [
      { title: t.nav.ranking, url: appUrl("/ranking") },
      { title: t.result.revenge, url: appUrl("/challenges") },
    ],
  });
}

export type MatchView = {
  id: string;
  playedAt: Date;
  a: PublicUser[];
  b: PublicUser[];
  sets: SetScore[];
  score: string;
  winner: "A" | "B";
  eloDeltaA: number;
  eloDeltaB: number;
  tags: string[];
  sessionId: string | null;
  challengeId: string | null;
};

export async function getMatches(opts: { userId?: string; limit?: number; sinceDays?: number } = {}): Promise<MatchView[]> {
  const db = await getDb();
  const conds = [];
  if (opts.userId) {
    const u = opts.userId;
    conds.push(or(eq(schema.matches.a1, u), eq(schema.matches.a2, u), eq(schema.matches.b1, u), eq(schema.matches.b2, u)));
  }
  if (opts.sinceDays) {
    conds.push(sql`${schema.matches.playedAt} > now() - make_interval(days => ${opts.sinceDays})`);
  }
  const rows = await db
    .select()
    .from(schema.matches)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.matches.playedAt))
    .limit(opts.limit ?? 50);
  const users = await getUsersMap(rows.flatMap((r) => [r.a1, r.a2, r.b1, r.b2]));
  return rows.map((r) => toView(r, users));
}

export async function getMatch(id: string): Promise<MatchView | null> {
  const db = await getDb();
  const [r] = await db.select().from(schema.matches).where(eq(schema.matches.id, id)).limit(1);
  if (!r) return null;
  const users = await getUsersMap([r.a1, r.a2, r.b1, r.b2]);
  return toView(r, users);
}

function toView(r: typeof schema.matches.$inferSelect, users: Map<string, PublicUser>): MatchView {
  const u = (id: string) => users.get(id)!;
  return {
    id: r.id,
    playedAt: r.playedAt,
    a: [u(r.a1), u(r.a2)],
    b: [u(r.b1), u(r.b2)],
    sets: r.sets,
    score: formatSets(r.sets),
    winner: r.winner,
    eloDeltaA: r.eloDeltaA,
    eloDeltaB: r.eloDeltaB,
    tags: r.tags ?? [],
    sessionId: r.sessionId,
    challengeId: r.challengeId,
  };
}

/** Historique Elo d'un joueur (pour la courbe). */
export async function getRatingHistory(userId: string, days = 30) {
  const db = await getDb();
  return db
    .select({ eloBefore: schema.ratingHistory.eloBefore, eloAfter: schema.ratingHistory.eloAfter, createdAt: schema.ratingHistory.createdAt })
    .from(schema.ratingHistory)
    .where(and(eq(schema.ratingHistory.userId, userId), sql`${schema.ratingHistory.createdAt} > now() - make_interval(days => ${days})`))
    .orderBy(schema.ratingHistory.createdAt);
}

/** Meilleur partenaire et némésis d'un joueur. */
export async function getPartnerStats(userId: string) {
  const matches = await getMatches({ userId, limit: 500 });
  const partners = new Map<string, { user: PublicUser; wins: number; games: number }>();
  const opponents = new Map<string, { user: PublicUser; wins: number; losses: number }>();
  for (const m of matches) {
    const inA = m.a.some((p) => p.id === userId);
    const myTeam = inA ? m.a : m.b;
    const other = inA ? m.b : m.a;
    const won = (inA && m.winner === "A") || (!inA && m.winner === "B");
    const partner = myTeam.find((p) => p.id !== userId);
    if (partner) {
      const e = partners.get(partner.id) ?? { user: partner, wins: 0, games: 0 };
      e.games++;
      if (won) e.wins++;
      partners.set(partner.id, e);
    }
    for (const o of other) {
      const e = opponents.get(o.id) ?? { user: o, wins: 0, losses: 0 };
      if (won) e.wins++;
      else e.losses++;
      opponents.set(o.id, e);
    }
  }
  const bestPartner = [...partners.values()].filter((p) => p.games >= 2).sort((x, y) => y.wins / y.games - x.wins / x.games || y.games - x.games)[0] ?? null;
  const nemesis = [...opponents.values()].filter((o) => o.losses >= 2).sort((x, y) => y.losses - y.wins - (x.losses - x.wins))[0] ?? null;
  return { bestPartner, nemesis, total: matches.length };
}

export { rankOf };
