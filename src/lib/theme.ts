export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "pc_theme";
export const DEFAULT_THEME: Theme = "light";
export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}
