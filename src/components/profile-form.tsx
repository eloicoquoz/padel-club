"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/lib/actions/app";
import { logoutAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n";
import { AVATAR_COLORS } from "@/lib/colors";
import type { User } from "@/lib/db/schema";
import { Icon } from "./ui";
import { ThemeSwitch } from "./theme-switch";
import type { Theme } from "@/lib/theme";

export function ProfileForm({ user, theme }: { user: Pick<User, "name" | "locale" | "color" | "playtomicLevel" | "playtomicUrl">; theme: Theme }) {
  const { t } = useT();
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: { error?: string } | null, fd: FormData) => {
    const r = await updateProfileAction(prev, fd);
    router.refresh();
    return r;
  }, null);
  const [color, setColor] = useState(user.color);
  const [locale, setLocale] = useState(user.locale);
  return (
    <form action={action} className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{t.profile.settings}</div>
        {state && !state.error && <span className="text-xs font-bold text-green">{t.profile.saved}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="label">{t.auth.name}</label>
        <input id="name" name="name" defaultValue={user.name} required minLength={2} className="field h-12" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="label">{t.profile.language}</div>
        <input type="hidden" name="locale" value={locale} />
        <div className="flex gap-1 bg-bg p-1 rounded-full">
          {LOCALES.map((l) => (
            <button key={l} type="button" onClick={() => setLocale(l)} className={`h-8 px-3 rounded-full text-xs font-extrabold uppercase ${l === locale ? "bg-text text-bg" : "text-muted"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <ThemeSwitch initial={theme} />
      <div className="flex flex-col gap-2">
        <div className="label">{t.profile.color}</div>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: c, boxShadow: c === color ? "0 0 0 3px var(--color-text)" : undefined }}
            >
              {c === color && <Icon name="check" size={14} className="text-bg" />}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="playtomicLevel" className="label">{t.profile.playtomicLevel}</label>
          <input id="playtomicLevel" name="playtomicLevel" inputMode="decimal" placeholder="2.75" defaultValue={user.playtomicLevel ?? ""} className="field h-12" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="playtomicUrl" className="label">{t.profile.playtomicUrl}</label>
          <input id="playtomicUrl" name="playtomicUrl" type="url" placeholder="https://app.playtomic.io/…" defaultValue={user.playtomicUrl ?? ""} className="field h-12" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn bg-text text-bg h-12 text-[15px]">
        {t.common.save}
      </button>
      <button type="button" onClick={() => logoutAction()} className="text-xs font-bold text-dim py-1">
        {t.auth.logout}
      </button>
    </form>
  );
}
