/**
 * Données de démo : 10 joueurs, ~35 matchs sur 30 jours, 2 sessions, 2 défis, 1 americano.
 * Usage : npm run db:seed   (mot de passe de tous les comptes : padel1234)
 */
import { getDb, schema } from "../src/lib/db";
import { hashPassword, pickColor } from "../src/lib/auth";
import { recordMatch } from "../src/lib/services/matches";
import { createSession, joinSession } from "../src/lib/services/sessions";
import { createChallenge } from "../src/lib/services/challenges";
import { createTournament, nextRound, setScore } from "../src/lib/services/tournaments";
import { addEvent } from "../src/lib/services/events";
import type { SetScore } from "../src/lib/db/schema";

const NAMES = ["Eloi", "Julien", "Sarah", "Nico", "Mélanie", "Tom", "Anna", "Luca", "Chloé", "Pierre"];

function rnd(n: number) {
  return Math.floor(Math.random() * n);
}
function pick<T>(xs: T[], k: number): T[] {
  const a = [...xs];
  const out: T[] = [];
  while (out.length < k && a.length) out.push(a.splice(rnd(a.length), 1)[0]);
  return out;
}
function randomSets(strongA: boolean): SetScore[] {
  const win = (): SetScore => (Math.random() < 0.15 ? [6, 0] : [6, rnd(5)]);
  const lose = (): SetScore => {
    const [a, b] = win();
    return [b, a];
  };
  const aWins = Math.random() < (strongA ? 0.65 : 0.45);
  const three = Math.random() < 0.25;
  if (!three) return aWins ? [win(), win()] : [lose(), lose()];
  return aWins ? [win(), lose(), [10, 6]] : [lose(), win(), [6, 10]];
}

async function main() {
  const db = await getDb();
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existing.length) {
    console.log("La base contient déjà des utilisateurs — seed ignoré.");
    return;
  }
  const hash = await hashPassword("padel1234");
  const users = await db
    .insert(schema.users)
    .values(
      NAMES.map((name, i) => ({
        email: `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@gotteron.ch`,
        passwordHash: hash,
        name,
        color: pickColor(name),
        locale: (i % 4 === 1 ? "de" : i % 7 === 3 ? "en" : "fr") as "fr" | "de" | "en",
        isAdmin: i === 0,
        playtomicLevel: i % 3 === 0 ? String((2 + Math.random() * 1.5).toFixed(2)) : null,
      })),
    )
    .returning();
  for (const u of users) await addEvent("new_player", { userId: u.id });
  const by = users[0];

  // Matchs sur les 30 derniers jours (les jeudis midi + quelques mardis soir)
  const now = Date.now();
  const strength = new Map(users.map((u, i) => [u.id, i < 4 ? 1 : 0]));
  for (let d = 30; d >= 0; d--) {
    const date = new Date(now - d * 86400000);
    const dow = date.getDay();
    const n = dow === 4 ? 3 : dow === 2 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const [a1, a2, b1, b2] = pick(users, 4);
      const sa = (strength.get(a1.id) ?? 0) + (strength.get(a2.id) ?? 0);
      const sb = (strength.get(b1.id) ?? 0) + (strength.get(b2.id) ?? 0);
      const playedAt = new Date(date);
      playedAt.setHours(dow === 4 ? 12 : 18, 10 + k * 25, 0, 0);
      try {
        await recordMatch({ a1: a1.id, a2: a2.id, b1: b1.id, b2: b2.id, sets: randomSets(sa >= sb), playedAt }, by);
      } catch (e) {
        console.warn("match ignoré", e);
      }
    }
  }

  // Sessions
  const nextThu = new Date();
  nextThu.setDate(nextThu.getDate() + ((4 - nextThu.getDay() + 7) % 7 || 7));
  nextThu.setHours(12, 0, 0, 0);
  const s = await createSession({ startsAt: nextThu, durationMin: 90, courts: 2, location: process.env.DEFAULT_LOCATION ?? "Padel Fribourg", createdBy: users[1].id, playtomicUrl: "https://app.playtomic.io" });
  for (const u of users.slice(0, 6)) await joinSession(s.id, u.id);
  const tue = new Date(nextThu);
  tue.setDate(tue.getDate() + 5);
  tue.setHours(18, 0, 0, 0);
  await createSession({ startsAt: tue, durationMin: 120, courts: 2, location: process.env.DEFAULT_LOCATION ?? "Padel Fribourg", createdBy: users[0].id, note: "Soirée Americano — 12 places" });

  // Défis
  await createChallenge({ from1: users[1].id, from2: users[2].id, to1: users[0].id, to2: users[3].id, message: "On vous attend jeudi. Venez avec des excuses." });
  await createChallenge({ from1: users[0].id, from2: users[4].id, to1: users[5].id, to2: users[6].id, message: "Revanche du 30 octobre ?" });

  // Americano en cours
  const t = await createTournament({ name: "Soirée Americano", courts: 2, pointsPerMatch: 16, createdBy: users[0].id, playerIds: users.slice(0, 9).map((u) => u.id) });
  await nextRound(t.id);
  const r1 = await db.select().from(schema.tournamentMatches).where((await import("drizzle-orm")).eq(schema.tournamentMatches.tournamentId, t.id));
  for (const m of r1) {
    const a = 5 + rnd(7);
    await setScore(m.id, a, 16 - a);
  }
  await nextRound(t.id);

  console.log(`Seed OK : ${users.length} joueurs. Connexion : eloi@gotteron.ch / padel1234`);
}

main().then(() => process.exit(0));
