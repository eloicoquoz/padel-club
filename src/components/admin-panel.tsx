"use client";

import { useState, useTransition } from "react";
import { adminCreateResetAction, adminDeleteMatchAction, adminGrantMonthKingAction, adminRebuildAction, adminSetAdminAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate, formatTime, joinNames } from "@/lib/i18n";
import { Avatar, Eyebrow, Icon, Pill } from "./ui";

type U = { id: string; name: string; email: string; color: string; elo: number; gamesPlayed: number; isAdmin: boolean; locale: string; pushCount: number };
type M = { id: string; playedAt: Date; score: string; winner: "A" | "B"; names: { a: (string | undefined)[]; b: (string | undefined)[]; by?: string } };

export function AdminPanel({ users, matches, meId, leaderId }: { users: U[]; matches: M[]; meId: string; leaderId: string | null }) {
  const { t, locale } = useT();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const reset = (id: string) =>
    start(async () => {
      const { url } = await adminCreateResetAction(id);
      try {
        await navigator.clipboard.writeText(url);
        setToast(t.admin.copied);
      } catch {
        setToast(url);
      }
      setTimeout(() => setToast(null), 8000);
    });

  return (
    <div className="flex flex-col gap-5">
      {toast && <div className="rounded-xl bg-green-bg text-green text-sm font-semibold px-4 py-3 break-all">{toast}</div>}

      <section className="flex flex-col gap-2">
        <Eyebrow>
          {t.admin.users} · {users.length}
        </Eyebrow>
        {users.map((u) => (
          <div key={u.id} className="card flex items-center gap-3 py-3">
            <Avatar name={u.name} color={u.color} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold truncate">{u.name}</span>
                {u.isAdmin && <Pill tone="amber">admin</Pill>}
                {u.pushCount > 0 && <Pill tone="green">{t.admin.push}</Pill>}
              </div>
              <div className="text-[11px] text-muted truncate">
                {u.email} · {u.elo} Elo · {u.gamesPlayed} {t.common.matches} · {u.locale.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" disabled={pending} onClick={() => reset(u.id)} className="btn h-8 px-2.5 text-[11px] rounded-lg bg-surface-2 border border-border-2 text-text">
                {t.admin.resetLink}
              </button>
              <button
                type="button"
                disabled={pending || u.id === meId}
                aria-label={t.admin.makeAdmin}
                onClick={() => start(() => adminSetAdminAction(u.id, !u.isAdmin))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border ${u.isAdmin ? "bg-amber-bg border-[#7C3F10] text-amber" : "bg-bg border-border-2 text-dim"}`}
              >
                <Icon name="star" size={14} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <Eyebrow>{t.admin.matches}</Eyebrow>
        {matches.map((m) => (
          <div key={m.id} className="card flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">
                <span className={m.winner === "A" ? "" : "text-muted"}>{joinNames(m.names.a.filter(Boolean) as string[])}</span>
                <span className="text-dim text-xs"> vs </span>
                <span className={m.winner === "B" ? "" : "text-muted"}>{joinNames(m.names.b.filter(Boolean) as string[])}</span>
              </div>
              <div className="text-[11px] text-muted">
                {formatDate(m.playedAt, locale)} {formatTime(m.playedAt, locale)} · {m.score}
                {m.names.by ? ` · ${fmt(t.admin.enteredBy, { name: m.names.by })}` : ""}
              </div>
            </div>
            {confirm === m.id ? (
              <div className="flex gap-1.5">
                <button type="button" disabled={pending} onClick={() => start(async () => { await adminDeleteMatchAction(m.id); setConfirm(null); })} className="btn h-8 px-2.5 text-[11px] rounded-lg bg-red text-white">
                  {t.common.yes}
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="btn h-8 px-2.5 text-[11px] rounded-lg bg-surface-2 text-muted">
                  {t.common.no}
                </button>
              </div>
            ) : (
              <button type="button" disabled={pending} onClick={() => setConfirm(m.id)} className="btn h-8 px-2.5 text-[11px] rounded-lg bg-surface-2 border border-border-2 text-muted">
                {t.admin.deleteMatch}
              </button>
            )}
          </div>
        ))}
        {confirm && <div className="text-xs text-red-text">{t.admin.confirmDelete}</div>}
      </section>

      <section className="flex flex-col gap-2">
        <button type="button" disabled={pending} onClick={() => start(() => adminRebuildAction())} className="btn bg-surface border border-border-2 text-text h-12 text-[15px]">
          <Icon name="refresh" size={18} />
          {t.admin.rebuild}
        </button>
        <div className="text-xs text-muted text-center">{t.admin.rebuildHint}</div>
        {leaderId && (
          <>
            <button type="button" disabled={pending} onClick={() => start(() => adminGrantMonthKingAction(leaderId))} className="btn bg-amber-bg border border-[#7C3F10] text-amber h-12 text-[15px] mt-2">
              <Icon name="crown" size={18} />
              {t.admin.monthKing}
            </button>
            <div className="text-xs text-muted text-center">{t.admin.monthKingHint}</div>
          </>
        )}
      </section>
    </div>
  );
}
