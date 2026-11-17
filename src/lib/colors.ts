export const AVATAR_COLORS = [
  "#3B82F6", "#F59E0B", "#A78BFA", "#34D399", "#F472B6", "#FB923C",
  "#22D3EE", "#C084FC", "#FACC15", "#A3E635", "#F87171", "#60A5FA",
];

export function pickColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
