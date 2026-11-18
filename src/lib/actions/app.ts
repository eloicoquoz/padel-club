"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { SetScore } from "@/lib/db/schema";
import { recordMatch } from "@/lib/services/matches";
import { createSession, deleteSession, joinSession, leaveSession } from "@/lib/services/sessions";
import { createChallenge, markChallengePlayed, respondChallenge } from "@/lib/services/challenges";
import { createTournament, finishTournament, nextRound, setScore, setTournamentPlayers, deleteTournament } from "@/lib/services/tournaments";
import { isLocale } from "@/lib/i18n";

export type ActionState = { error?: string } | null;

// ---------- Matchs ----------
const matchSchema = z.object({
  a1: z.string().uuid(),
  a2: z.string().uuid(),
  b1: z.string().uuid(),
  b2: z.string().uuid(),
  sets: z.array(z.tuple([z.number().int().min(0).max(20), z.number().int().min(0).max(20)])).min(2).max(3),
  sessionId: z.string().uuid().nullable().optional(),
  challengeId: z.string().uuid().nullable().optional(),
});

export async function createMatchAction(input: unknown): Promise<{ ok: true; matchId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = matchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "sets" };
  try {
    const res = await recordMatch({ ...parsed.data, sets: parsed.data.sets as SetScore[] }, user);
    if (parsed.data.challengeId) await markChallengePlayed(parsed.data.challengeId, res.matchId);
    revalidatePath("/");
    return { ok: true, matchId: res.matchId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generic";
    return { ok: false, error: msg === "players" || msg === "sets" ? msg : "generic" };
  }
}

// ---------- Sessions ----------
export async function createSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  if (Number.isNaN(startsAt.getTime())) return { error: "date" };
  const durationMin = Number(formData.get("durationMin") ?? 90) || 90;
  const courts = Math.min(6, Math.max(1, Number(formData.get("courts") ?? 1) || 1));
  const location = String(formData.get("location") ?? "").trim();
  const playtomicUrl = String(formData.get("playtomicUrl") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const s = await createSession({ startsAt, durationMin, courts, location, playtomicUrl, note, createdBy: user.id });
  revalidatePath("/sessions");
  redirect(`/sessions/${s.id}`);
}

export async function joinSessionAction(sessionId: string) {
  const user = await requireUser();
  try {
    await joinSession(sessionId, user.id);
  } catch {
    /* complet */
  }
  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function leaveSessionAction(sessionId: string) {
  const user = await requireUser();
  await leaveSession(sessionId, user.id);
  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function deleteSessionAction(sessionId: string) {
  const user = await requireUser();
  await deleteSession(sessionId, user.id, user.isAdmin);
  revalidatePath("/sessions");
  redirect("/sessions");
}

// ---------- Défis ----------
export async function createChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const from2 = String(formData.get("from2") ?? "") || null;
  const to1 = String(formData.get("to1") ?? "");
  const to2 = String(formData.get("to2") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim().slice(0, 140) || null;
  const ids = [user.id, from2, to1, to2].filter(Boolean);
  if (!to1 || new Set(ids).size !== ids.length) return { error: "players" };
  await createChallenge({ from1: user.id, from2, to1, to2, message });
  revalidatePath("/challenges");
  redirect("/challenges");
}

export async function respondChallengeAction(id: string, status: "accepted" | "declined", reply?: string) {
  const user = await requireUser();
  await respondChallenge(id, user.id, status, reply);
  revalidatePath("/challenges");
  revalidatePath("/");
}

// ---------- Profil ----------
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const locale = String(formData.get("locale") ?? user.locale);
  const color = String(formData.get("color") ?? user.color);
  const lvlRaw = String(formData.get("playtomicLevel") ?? "").replace(",", ".").trim();
  const playtomicLevel = lvlRaw ? String(Math.min(7, Math.max(0, Number(lvlRaw)))) : null;
  const playtomicUrl = String(formData.get("playtomicUrl") ?? "").trim() || null;
  if (name.length < 2) return { error: "name" };
  const db = await getDb();
  await db
    .update(schema.users)
    .set({
      name,
      locale: isLocale(locale) ? locale : user.locale,
      color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : user.color,
      playtomicLevel: playtomicLevel && !Number.isNaN(Number(playtomicLevel)) ? playtomicLevel : null,
      playtomicUrl,
    })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  return { error: undefined };
}

// ---------- Americano ----------
export async function createTournamentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || "Americano";
  const courts = Math.min(6, Math.max(1, Number(formData.get("courts") ?? 2) || 2));
  const pointsPerMatch = Math.min(32, Math.max(8, Number(formData.get("points") ?? 16) || 16));
  const playerIds = formData.getAll("players").map(String);
  const t = await createTournament({ name, courts, pointsPerMatch, createdBy: user.id, playerIds });
  redirect(`/americano/${t.id}`);
}

export async function updateTournamentPlayersAction(id: string, playerIds: string[]) {
  await requireUser();
  await setTournamentPlayers(id, playerIds);
  revalidatePath(`/americano/${id}`);
}

export async function nextRoundAction(id: string): Promise<ActionState> {
  await requireUser();
  try {
    await nextRound(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "generic" };
  }
  revalidatePath(`/americano/${id}`);
  return null;
}

export async function setTournamentScoreAction(tournamentId: string, matchId: string, scoreA: number, scoreB: number) {
  await requireUser();
  await setScore(matchId, Math.max(0, scoreA), Math.max(0, scoreB));
  revalidatePath(`/americano/${tournamentId}`);
}

export async function finishTournamentAction(id: string) {
  await requireUser();
  await finishTournament(id);
  revalidatePath(`/americano/${id}`);
  revalidatePath("/");
}

export async function deleteTournamentAction(id: string) {
  const user = await requireUser();
  await deleteTournament(id, user.id, user.isAdmin);
  redirect("/americano");
}

// ---------- Notifications push ----------
export async function savePushSubscriptionAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
  const user = await requireUser();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const { saveSubscription } = await import("@/lib/services/push");
  await saveSubscription(user.id, sub, userAgent);
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string) {
  await requireUser();
  const { removeSubscription } = await import("@/lib/services/push");
  await removeSubscription(endpoint);
  return { ok: true };
}
