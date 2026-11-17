export const BADGE_KEYS = [
  "first_win",
  "giant_killer",
  "revenge",
  "streak_3",
  "streak_5",
  "bagel_given",
  "bagel_taken",
  "super_tiebreak",
  "regular_10",
  "early_bird",
  "month_king",
  "socialite",
] as const;

export type BadgeKey = (typeof BADGE_KEYS)[number];

export function isBadgeKey(k: string): k is BadgeKey {
  return (BADGE_KEYS as readonly string[]).includes(k);
}
