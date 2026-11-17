"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";

function ErrorBox({ state }: { state: AuthState }) {
  const { t } = useT();
  if (!state?.error) return null;
  const msg = state.error === "generic" ? t.common.error : t.auth.errors[state.error];
  return <div className="rounded-xl bg-red-bg text-red-text text-sm font-semibold px-4 py-3">{msg}</div>;
}

export function LoginForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <ErrorBox state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">{t.auth.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label">{t.auth.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn bg-red text-white mt-2">
        {t.auth.login}
      </button>
      <div className="mt-auto pt-8 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-dim">
          <div className="flex-1 h-px bg-border-2" />
          {t.auth.newHere}
          <div className="flex-1 h-px bg-border-2" />
        </div>
        <Link href="/register" className="btn bg-surface border border-border-2 text-text h-13 text-[15px]">
          {t.auth.register}
        </Link>
        <p className="text-center text-xs text-dim">{t.auth.reserved}</p>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const { t, locale } = useT();
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <ErrorBox state={state} />
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="label">{t.auth.name}</label>
        <input id="name" name="name" type="text" autoComplete="given-name" required minLength={2} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">{t.auth.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label">{t.auth.password}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite" className="label">{t.auth.inviteCode}</label>
        <input id="invite" name="invite" type="text" autoComplete="off" required className="field uppercase" />
      </div>
      <button type="submit" disabled={pending} className="btn bg-red text-white mt-2">
        {t.auth.register}
      </button>
      <div className="mt-auto pt-8 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-dim">
          <div className="flex-1 h-px bg-border-2" />
          {t.auth.haveAccount}
          <div className="flex-1 h-px bg-border-2" />
        </div>
        <Link href="/login" className="btn bg-surface border border-border-2 text-text h-13 text-[15px]">
          {t.auth.login}
        </Link>
      </div>
    </form>
  );
}
