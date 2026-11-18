import { desc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Challenge, ChallengeStatus } from "@/lib/db/schema";
import { getUsersMap, type PublicUser } from "./users";
import { addEvent } from "./events";
import { background } from "@/lib/background";
import { forecast } from "@/lib/elo";
import { pushChallengeAnswered, pushChallengeReceived } from "./push";

export type ChallengeView = Challenge & {
  from: PublicUser[];
  to: PublicUser[];
  stakes: number; // ±Elo approximatif pour les challengers
};

async function hydrate(rows: Challenge[]): Promise<ChallengeView[]> {
  const ids = rows.flatMap((r) => [r.from1, r.from2, r.to1, r.to2].filter((x): x is string => !!x));
  const users = await getUsersMap(ids);
  return rows.map((r) => {
    const from = [r.from1, r.from2].filter((x): x is string => !!x).map((id) => users.get(id)!).filter(Boolean);
    const to = [r.to1, r.to2].filter((x): x is string => !!x).map((id) => users.get(id)!).filter(Boolean);
    const f = forecast(from.map((p) => ({ elo: p.elo, gamesPlayed: p.gamesPlayed })), to.map((p) => ({ elo: p.elo, gamesPlayed: p.gamesPlayed })));
    return { ...r, from, to, stakes: Math.max(Math.abs(f.win), Math.abs(f.lose)) };
  });
}

export async function listChallengesFor(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.challenges)
    .where(or(eq(schema.challenges.from1, userId), eq(schema.challenges.from2, userId), eq(schema.challenges.to1, userId), eq(schema.challenges.to2, userId)))
    .orderBy(desc(schema.challenges.createdAt))
    .limit(50);
  const all = await hydrate(rows);
  const received = all.filter((c) => (c.to1 === userId || c.to2 === userId) && c.status !== "played");
  const sent = all.filter((c) => (c.from1 === userId || c.from2 === userId) && c.status !== "played");
  return { received, sent, all };
}

export async function openChallenges(limit = 6) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.challenges)
    .where(inArray(schema.challenges.status, ["pending", "accepted"]))
    .orderBy(desc(schema.challenges.createdAt))
    .limit(limit);
  return hydrate(rows);
}

export async function createChallenge(input: { from1: string; from2?: string | null; to1: string; to2?: string | null; message?: string | null; proposedAt?: Date | null }) {
  const db = await getDb();
  const [c] = await db
    .insert(schema.challenges)
    .values({ ...input, from2: input.from2 ?? null, to2: input.to2 ?? null, message: input.message ?? null, proposedAt: input.proposedAt ?? null })
    .returning();
  await addEvent("challenge_sent", {
    challengeId: c.id,
    from: [c.from1, c.from2].filter(Boolean),
    to: [c.to1, c.to2].filter(Boolean),
    message: c.message ?? "",
  });
  const users = await getUsersMap([c.from1, c.from2].filter((x): x is string => !!x));
  background(() => pushChallengeReceived([c.to1, c.to2].filter((x): x is string => !!x), [...users.values()].map((u) => u.name), c.message, c.id));
  return c;
}

export async function respondChallenge(id: string, userId: string, status: Extract<ChallengeStatus, "accepted" | "declined">, reply?: string) {
  const db = await getDb();
  const [c] = await db.select().from(schema.challenges).where(eq(schema.challenges.id, id)).limit(1);
  if (!c) throw new Error("not_found");
  if (c.to1 !== userId && c.to2 !== userId) throw new Error("forbidden");
  await db.update(schema.challenges).set({ status, reply: reply ?? null }).where(eq(schema.challenges.id, id));
  await addEvent(status === "accepted" ? "challenge_accepted" : "challenge_declined", {
    challengeId: c.id,
    from: [c.from1, c.from2].filter(Boolean),
    to: [c.to1, c.to2].filter(Boolean),
  });
  const toUsers = await getUsersMap([c.to1, c.to2].filter((x): x is string => !!x));
  background(() => pushChallengeAnswered([c.from1, c.from2].filter((x): x is string => !!x), [...toUsers.values()].map((u) => u.name), status === "accepted", reply ?? null));
}

export async function markChallengePlayed(id: string, matchId: string) {
  const db = await getDb();
  await db.update(schema.challenges).set({ status: "played", matchId }).where(eq(schema.challenges.id, id));
}

export async function getChallenge(id: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.challenges).where(eq(schema.challenges.id, id)).limit(1);
  const [v] = await hydrate(rows);
  return v ?? null;
}
