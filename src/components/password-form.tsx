"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";

export function PasswordForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const msg = state?.error === "weak" ? t.auth.errors.weak : state?.error === "invalid" ? t.account.wrongCurrent : state && !state.error ? t.account.changed : null;
  return (
    <form action={action} className="card flex flex-col gap-3">
      <div className="eyebrow">{t.account.changeTitle}</div>
      {msg && <div className={`rounded-xl text-sm font-semibold px-4 py-3 ${state?.error ? "bg-red-bg text-red-text" : "bg-green-bg text-green"}`}>{msg}</div>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current" className="label">{t.account.current}</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="field h-12" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="next" className="label">{t.account.next}</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} className="field h-12" />
      </div>
      <button type="submit" disabled={pending} className="btn bg-surface-2 border border-border-2 text-text h-12 text-[15px]">
        {t.common.save}
      </button>
    </form>
  );
}
