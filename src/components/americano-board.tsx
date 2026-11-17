"use client";

import { useState, useTransition } from "react";
import type { TournamentView } from "@/lib/services/tournaments";
import { finishTournamentAction, nextRoundAction, setTournamentScoreAction, deleteTournamentAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { fmt, joinNames } from "@/lib/i18n";
import { Avatar, AvatarStack, Eyebrow, Icon, Pill } from "./ui";

type Plain = Omit<TournamentView, "users"> & { users: Record<string, TournamentView["players"][number]> };

export function AmericanoBoard({ t0, meId, canManage }: { t0: Plain; meId: string; canManage: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const u = (id: string) => t0.users[id];
  const current = t0.matches.filter((m) => m.round === t0.currentRound);
  const playing = new Set(current.flatMap((m) => [m.a1, m.a2, m.b1, m.b2]));
  const resting = t0.players.filter((p) => !playing.has(p.id));
  const allScored = current.length > 0 && current.every((m) => m.scoreA !== null && m.scoreB !== null);
  const finished = t0.status === "finished";
  const estRounds = Math.max(3, Math.min(9, t0.players.length - 1));

  const score = (matchId: string, a: number, b: number) => start(() => setTournamentScoreAction(t0.id, matchId, a, b));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!finished && t0.status === "running" && <div className="live w-2 h-2 rounded-full bg-red-text" />}
          <Pill tone={finished ? "muted" : t0.status === "running" ? "red" : "amber"}>{finished ? t.americano.finished : t0.status === "running" ? t.americano.running : t.americano.draft}</Pill>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold text-muted">{fmt(t.americano.round, { n: "" }).trim()}</div>
          <div className="text-xl font-black leading-none">
            {t0.currentRound}
            <span className="text-dim">/{estRounds}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: estRounds }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex-1 h-1.5 rounded-full" style={{ background: n < t0.currentRound ? "var(--color-green)" : n === t0.currentRound ? "var(--color-red)" : "var(--color-border-2)" }} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <AvatarStack people={t0.players} size={32} max={8} />
        <div className="text-xs text-muted">
          {t0.players.length} {t.common.players} · {t0.courts} {t.americano.courts.toLowerCase()} · {t0.pointsPerMatch} pts
        </div>
      </div>

      {current.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Eyebrow>{fmt(t.americano.round, { n: t0.currentRound })}</Eyebrow>
          {current.map((m) => {
            const done = m.scoreA !== null && m.scoreB !== null;
            const a = m.scoreA ?? 0;
            const b = m.scoreB ?? Math.max(0, t0.pointsPerMatch - a);
            return (
              <div key={m.id} className={`card flex flex-col gap-2.5 ${done ? "" : "border-red"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold">{fmt(t.americano.court, { n: m.court })}</div>
                  <Pill tone={done ? "green" : "red"}>{done ? "✓" : t.americano.running}</Pill>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <div className="flex flex-col gap-1.5 items-start">
                    <AvatarStack people={[u(m.a1), u(m.a2)].filter(Boolean)} size={30} />
                    <div className="text-xs font-bold">{joinNames([u(m.a1)?.name, u(m.a2)?.name].filter(Boolean) as string[])}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={finished || pending}
                      aria-label={t.match.teamA}
                      onClick={() => {
                        const na = (a + 1) % (t0.pointsPerMatch + 1);
                        score(m.id, na, t0.pointsPerMatch - na);
                      }}
                      className="w-[46px] h-[46px] rounded-xl border border-border-2 bg-bg text-xl font-black"
                    >
                      {m.scoreA ?? "–"}
                    </button>
                    <div className="text-xs text-dim font-extrabold">–</div>
                    <button
                      type="button"
                      disabled={finished || pending}
                      aria-label={t.match.teamB}
                      onClick={() => {
                        const nb = (b + 1) % (t0.pointsPerMatch + 1);
                        score(m.id, t0.pointsPerMatch - nb, nb);
                      }}
                      className="w-[46px] h-[46px] rounded-xl border border-border-2 bg-bg text-xl font-black"
                    >
                      {m.scoreB ?? "–"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <AvatarStack people={[u(m.b1), u(m.b2)].filter(Boolean)} size={30} />
                    <div className="text-xs font-bold text-right">{joinNames([u(m.b1)?.name, u(m.b2)?.name].filter(Boolean) as string[])}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {resting.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-surface border border-dashed border-border-2 px-3.5 py-3 text-[13px] text-muted">
              <AvatarStack people={resting} size={28} />
              {fmt(t.americano.resting, { names: joinNames(resting.map((p) => p.name)) })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Eyebrow>{t.americano.standings}</Eyebrow>
        <div className="rounded-[18px] bg-surface border border-border overflow-hidden">
          {t0.standings.map((s, i) => (
            <div key={s.userId} className={`flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border last:border-b-0 ${s.userId === meId ? "bg-blue-bg" : ""}`}>
              <div className="w-5 text-[13px] font-black text-muted">{i + 1}</div>
              {i === 0 && finished && <Icon name="crown" size={16} className="text-gold" />}
              <Avatar name={s.user.name} color={s.user.color} size={28} />
              <div className="flex-1 text-sm font-extrabold truncate">{s.user.name}</div>
              <div className="text-xs text-muted">
                {s.played} {s.played === 1 ? t.common.match : t.common.matches}
              </div>
              <div className="w-9 text-right text-[15px] font-black">{s.points}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-bg text-red-text text-sm font-semibold px-4 py-3">{error}</div>}

      {canManage && !finished && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={pending || (current.length > 0 && !allScored) || t0.players.length < 4}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await nextRoundAction(t0.id);
                if (r?.error) setError(r.error === "min_players" ? t.americano.minPlayers : t.common.error);
              })
            }
            className="btn bg-red text-white"
          >
            {t0.currentRound === 0 ? t.americano.start : t.americano.nextRound}
          </button>
          {t0.currentRound > 0 && (
            <button type="button" disabled={pending || !allScored} onClick={() => start(() => finishTournamentAction(t0.id))} className="btn bg-surface border border-border-2 text-text h-12 text-[15px]">
              <Icon name="trophy" size={18} />
              {t.americano.finish}
            </button>
          )}
        </div>
      )}
      {canManage && (
        <button type="button" onClick={() => start(() => deleteTournamentAction(t0.id))} className="text-xs font-bold text-dim py-2">
          {t.common.delete}
        </button>
      )}
    </div>
  );
}
