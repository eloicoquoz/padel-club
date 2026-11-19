"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { checkInviteCode, clearSessionCookie, hashPassword, pickColor, setSessionCookie, verifyPassword } from "@/lib/auth";
import { addEvent } from "@/lib/services/events";
import { isLocale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

export type AuthState = { error?: "invalid" | "exists" | "invite" | "weak" | "generic" } | null;

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: String(formData.get("email") ?? "").trim().toLowerCase(), password: String(formData.get("password") ?? "") });
  if (!parsed.success) return { error: "invalid" };
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return { error: "invalid" };
  await setSessionCookie(user.id);
  redirect("/");
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(40),
  invite: z.string().min(1),
  locale: z.string().optional(),
});

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    invite: String(formData.get("invite") ?? ""),
    locale: String(formData.get("locale") ?? "fr"),
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "password" ? "weak" : "generic" };
  }
  if (!checkInviteCode(parsed.data.invite)) return { error: "invite" };
  const db = await getDb();
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
  if (exists) return { error: "exists" };
  const anyUser = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  const isFirst = anyUser.length === 0;
  const [user] = await db
    .insert(schema.users)
    .values({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name,
      color: pickColor(parsed.data.email),
      locale: isLocale(parsed.data.locale) ? parsed.data.locale : "fr",
      isAdmin: isFirst, // le premier compte créé est admin
    })
    .returning();
  await addEvent("new_player", { userId: user.id });
  await setSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

/** Change la langue (cookie + profil si connecté). */
export async function setThemeAction(theme: string) {
  const { THEME_COOKIE, isTheme } = await import("@/lib/theme");
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  const { getSessionUser } = await import("@/lib/auth");
  const user = await getSessionUser();
  if (user) {
    const db = await getDb();
    await db.update(schema.users).set({ locale }).where(eq(schema.users.id, user.id));
  }
}

/** Réinitialisation par lien (token généré par un admin). */
export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "weak" };
  const { consumeReset } = await import("@/lib/services/admin");
  let userId: string;
  try {
    userId = await consumeReset(token, password);
  } catch {
    return { error: "invalid" };
  }
  await setSessionCookie(userId);
  redirect("/");
}
