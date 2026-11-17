import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from "./index";
import { getSessionUser } from "@/lib/auth";

export const LOCALE_COOKIE = "pc_locale";

/** Langue de l'utilisateur connecté, sinon cookie, sinon Accept-Language, sinon FR. */
export async function getLocale(): Promise<Locale> {
  const user = await getSessionUser();
  if (user && isLocale(user.locale)) return user.locale;
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  if (isLocale(first)) return first;
  return DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: getDict(locale) };
}
