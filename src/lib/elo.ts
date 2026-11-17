import type { SetScore } from "@/lib/db/schema";

export const START_ELO = 1200;

/** K plus élevé pour les nouveaux : leur classement se stabilise plus vite. */
export function kFactor(gamesPlayed: number) {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed < 30) return 32;
  return 24;
}

export function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export type EloInput = {
  teamA: { elo: number; gamesPlayed: number }[];
  teamB: { elo: number; gamesPlayed: number }[];
  winner: "A" | "B";
};

/**
 * Elo double : la note d'une équipe = moyenne des deux joueurs.
 * Les deux coéquipiers gagnent/perdent le même delta (K = moyenne des K).
 * Renvoie { deltaA, deltaB } (deltaB = -deltaA pour garder la somme nulle).
 */
export function computeElo({ teamA, teamB, winner }: EloInput) {
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const ra = avg(teamA.map((p) => p.elo));
  const rb = avg(teamB.map((p) => p.elo));
  const ea = expectedScore(ra, rb);
  const k = avg([...teamA, ...teamB].map((p) => kFactor(p.gamesPlayed)));
  const sa = winner === "A" ? 1 : 0;
  let deltaA = Math.round(k * (sa - ea));
  // Un gagnant gagne toujours au moins 1 point, un perdant perd au moins 1.
  if (winner === "A" && deltaA < 1) deltaA = 1;
  if (winner === "B" && deltaA > -1) deltaA = -1;
  return { deltaA, deltaB: -deltaA, expectedA: ea };
}

/** Prévision affichée avant la saisie : ce que A gagne s'il gagne / perd s'il perd. */
export function forecast(teamA: EloInput["teamA"], teamB: EloInput["teamB"]) {
  const win = computeElo({ teamA, teamB, winner: "A" }).deltaA;
  const lose = computeElo({ teamA, teamB, winner: "B" }).deltaA;
  return { win, lose, favoritesB: expectedScore(avg(teamA), avg(teamB)) < 0.5 };
}

function avg(ps: { elo: number }[]) {
  return ps.reduce((a, p) => a + p.elo, 0) / ps.length;
}

/** Valide un score en sets et détermine le vainqueur (2 sets gagnants, 3e set = super tie-break autorisé). */
export function evaluateSets(sets: SetScore[]): { ok: boolean; winner?: "A" | "B"; reason?: string } {
  const played = sets.filter(([a, b]) => !(a === 0 && b === 0));
  if (played.length < 2) return { ok: false, reason: "sets" };
  let a = 0;
  let b = 0;
  for (const [sa, sb] of played) {
    if (sa === sb) return { ok: false, reason: "sets" };
    if (sa > sb) a++;
    else b++;
    if (a === 2 || b === 2) break;
  }
  if (a === 2) return { ok: true, winner: "A" };
  if (b === 2) return { ok: true, winner: "B" };
  return { ok: false, reason: "sets" };
}

export function formatSets(sets: SetScore[]) {
  return sets
    .filter(([a, b]) => !(a === 0 && b === 0))
    .map(([a, b]) => `${a}-${b}`)
    .join(" · ");
}

/** Titre honorifique selon l'Elo. */
export type TitleKey = "padawan" | "regular" | "wall" | "legend";
export const TITLE_THRESHOLDS: { key: TitleKey; min: number }[] = [
  { key: "legend", min: 1350 },
  { key: "wall", min: 1250 },
  { key: "regular", min: 1150 },
  { key: "padawan", min: 0 },
];

export function titleFor(elo: number): { key: TitleKey; next?: { key: TitleKey; missing: number } } {
  const idx = TITLE_THRESHOLDS.findIndex((t) => elo >= t.min);
  const current = TITLE_THRESHOLDS[idx];
  const next = idx > 0 ? TITLE_THRESHOLDS[idx - 1] : undefined;
  return { key: current.key, next: next ? { key: next.key, missing: next.min - elo } : undefined };
}
