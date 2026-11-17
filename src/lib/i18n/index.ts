import { fr, type Dict } from "./fr";
import { de } from "./de";
import { en } from "./en";
import type { Locale } from "@/lib/db/schema";

export type { Dict, Locale };

export const LOCALES: Locale[] = ["fr", "de", "en"];
export const DEFAULT_LOCALE: Locale = "fr";

const dicts: Record<Locale, Dict> = { fr, de, en };

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? fr;
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as string[]).includes(v);
}

/** Remplace {clé} par la valeur correspondante. */
export function fmt(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

const intlLocale: Record<Locale, string> = { fr: "fr-CH", de: "de-CH", en: "en-GB" };
const TZ = "Europe/Zurich";

export function formatDate(d: Date | string, locale: Locale, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TZ, ...(opts ?? { weekday: "short", day: "numeric", month: "short" }) }).format(date);
}

export function formatTime(d: Date | string, locale: Locale) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTime(d: Date | string, locale: Locale) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" })} · ${formatTime(date, locale)}`;
}

export function formatMonth(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TZ, month: "long", year: "numeric" }).format(d);
}

/** "Aujourd'hui" / "Hier" / date courte, dans la langue. */
export function relativeDay(d: Date | string, locale: Locale, dict: Dict) {
  const date = typeof d === "string" ? new Date(d) : d;
  const fmtDay = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const today = fmtDay(new Date());
  const yesterday = fmtDay(new Date(Date.now() - 86400000));
  const day = fmtDay(date);
  if (day === today) return dict.common.today;
  if (day === yesterday) return dict.common.yesterday;
  return formatDate(date, locale);
}

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale]).format(n);
}

/** Joint des prénoms : "Eloi & Nico". */
export function joinNames(names: string[]) {
  return names.join(" & ");
}
