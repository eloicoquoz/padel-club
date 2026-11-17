/**
 * Génération des tours d'un Americano : à chaque tour les paires changent,
 * on cherche à minimiser les partenaires/adversaires déjà vus, et ceux qui ont
 * le moins joué passent en priorité (les autres font une pause).
 */
export type PastMatch = { a1: string; a2: string; b1: string; b2: string };
export type RoundMatch = { court: number; a1: string; a2: string; b1: string; b2: string };

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

export function generateRound(playerIds: string[], past: PastMatch[], courts: number): { matches: RoundMatch[]; resting: string[] } {
  const games = new Map<string, number>(playerIds.map((p) => [p, 0]));
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  for (const m of past) {
    for (const p of [m.a1, m.a2, m.b1, m.b2]) games.set(p, (games.get(p) ?? 0) + 1);
    partners.set(key(m.a1, m.a2), (partners.get(key(m.a1, m.a2)) ?? 0) + 1);
    partners.set(key(m.b1, m.b2), (partners.get(key(m.b1, m.b2)) ?? 0) + 1);
    for (const x of [m.a1, m.a2]) for (const y of [m.b1, m.b2]) opponents.set(key(x, y), (opponents.get(key(x, y)) ?? 0) + 1);
  }

  const slots = Math.min(courts, Math.floor(playerIds.length / 4)) * 4;
  if (slots < 4) return { matches: [], resting: playerIds };

  // Ceux qui ont le moins joué d'abord (aléatoire à égalité).
  const ordered = shuffle(playerIds).sort((x, y) => (games.get(x) ?? 0) - (games.get(y) ?? 0));
  const playing = ordered.slice(0, slots);
  const resting = ordered.slice(slots);

  const cost = (ms: RoundMatch[]) => {
    let c = 0;
    for (const m of ms) {
      c += 3 * ((partners.get(key(m.a1, m.a2)) ?? 0) + (partners.get(key(m.b1, m.b2)) ?? 0));
      for (const x of [m.a1, m.a2]) for (const y of [m.b1, m.b2]) c += opponents.get(key(x, y)) ?? 0;
    }
    return c;
  };

  let best: RoundMatch[] | null = null;
  let bestCost = Infinity;
  for (let i = 0; i < 300; i++) {
    const s = shuffle(playing);
    const ms: RoundMatch[] = [];
    for (let c = 0; c < slots / 4; c++) {
      const g = s.slice(c * 4, c * 4 + 4);
      ms.push({ court: c + 1, a1: g[0], a2: g[1], b1: g[2], b2: g[3] });
    }
    const k = cost(ms);
    if (k < bestCost) {
      bestCost = k;
      best = ms;
      if (k === 0) break;
    }
  }
  return { matches: best ?? [], resting };
}

export type Standing = { userId: string; points: number; played: number; diff: number };

export function standings(playerIds: string[], matches: (PastMatch & { scoreA: number | null; scoreB: number | null })[]): Standing[] {
  const map = new Map<string, Standing>(playerIds.map((p) => [p, { userId: p, points: 0, played: 0, diff: 0 }]));
  for (const m of matches) {
    if (m.scoreA === null || m.scoreB === null) continue;
    for (const p of [m.a1, m.a2]) {
      const s = map.get(p);
      if (s) {
        s.points += m.scoreA;
        s.diff += m.scoreA - m.scoreB;
        s.played++;
      }
    }
    for (const p of [m.b1, m.b2]) {
      const s = map.get(p);
      if (s) {
        s.points += m.scoreB;
        s.diff += m.scoreB - m.scoreA;
        s.played++;
      }
    }
  }
  return [...map.values()].sort((x, y) => y.points - x.points || y.diff - x.diff || x.played - y.played);
}
