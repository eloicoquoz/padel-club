"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/services/users";
import { createMatchAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { evaluateSets, forecast } from "@/lib/elo";
import { fmt } from "@/lib/i18n";
import { Avatar, Icon } from "./ui";
import type { SetScore } from "@/lib/db/schema";

type Props = {
  players: PublicUser[];
  meId: string;
  sessionId?: string | null;
  challengeId?: string | null;
  preset?: { a1?: string; a2?: string; b1?: string; b2?: string };
  sessionLabel?: string | null;
};

type Slot = "a1" | "a2" | "b1" | "b2";

export function MatchForm({ players, meId, sessionId, challengeId, preset, sessionLabel }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<Record<Slot, string | null>>({
    a1: preset?.a1 ?? meId,
    a2: preset?.a2 ?? null,
    b1: preset?.b1 ?? null,
    b2: preset?.b2 ?? null,
  });
  const [sets, setSets] = useState<SetScore[]>([
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const chosen = Object.values(sel).filter(Boolean) as string[];
  const teamA = [sel.a1, sel.a2].map((id) => (id ? byId.get(id) : undefined));
  const teamB = [sel.b1, sel.b2].map((id) => (id ? byId.get(id) : undefined));
  const complete = teamA.every(Boolean) && teamB.every(Boolean) && new Set(chosen).size === 4;
  const fc = complete
    ? forecast(
        teamA.map((p) => ({ elo: p!.elo, gamesPlayed: p!.gamesPlayed })),
        teamB.map((p) => ({ elo: p!.elo, gamesPlayed: p!.gamesPlayed })),
      )
    : null;
  const avg = (ps: (PublicUser | undefined)[]) => {
    const xs = ps.filter(Boolean) as PublicUser[];
    return xs.length ? Math.round(xs.reduce((a, p) => a + p.elo, 0) / xs.length) : null;
  };
  const evalRes = evaluateSets(sets);
  const canSubmit = complete && evalRes.ok && !pending;

  const bump = (i: number, side: 0 | 1) => {
    setSets((prev) => {
      const next = prev.map((s) => [...s] as SetScore);
      next[i][side] = (next[i][side] + 1) % 8;
      return next;
    });
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await createMatchAction({ ...sel, sets: sets.filter(([a, b]) => !(a === 0 && b === 0)), sessionId: sessionId ?? null, challengeId: challengeId ?? null });
      if (res.ok) router.push(`/match/${res.matchId}?fresh=1`);
      else setError(res.error === "players" ? t.match.errors.players : res.error === "sets" ? t.match.errors.sets : t.common.error);
    });

  const PlayerSlot = ({ slot, accent }: { slot: Slot; accent: "blue" | "red" }) => {
    const p = sel[slot] ? byId.get(sel[slot]!) : undefined;
    const isMe = p?.id === meId;
    return (
      <button
        type="button"
        onClick={() => setPicking(slot)}
        className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left ${p ? (accent === "blue" && isMe ? "bg-blue-bg border-blue" : "bg-surface border-border") : "bg-bg border-dashed border-border-2"}`}
      >
        {p ? (
          <>
            <Avatar name={p.name} color={p.color} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">{p.name}</div>
              <div className="text-[11px] text-muted">{isMe ? t.common.you : p.elo}</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-border-2 flex items-center justify-center text-dim">
              <Icon name="plus" size={16} />
            </div>
            <div className="text-sm font-bold text-muted">{t.match.pickPlayer}</div>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {sessionLabel && (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Icon name="calendar" size={16} />
          {sessionLabel}
        </div>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-text">{t.match.teamA}</div>
          {avg(teamA) !== null && <div className="text-xs font-bold text-muted">{fmt(t.match.avgElo, { elo: avg(teamA)! })}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <PlayerSlot slot="a1" accent="blue" />
          <PlayerSlot slot="a2" accent="blue" />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-2" />
        <div className="text-[13px] font-black text-red-text tracking-[0.1em]">VS</div>
        <div className="flex-1 h-px bg-border-2" />
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-red-text">{t.match.teamB}</div>
          {avg(teamB) !== null && <div className="text-xs font-bold text-muted">{fmt(t.match.avgElo, { elo: avg(teamB)! })}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <PlayerSlot slot="b1" accent="red" />
          <PlayerSlot slot="b2" accent="red" />
        </div>
      </section>

      <section className="card flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{t.match.score}</div>
          <div className="text-xs font-bold text-muted">{t.match.bestOf}</div>
        </div>
        {sets.map((s, i) => {
          const aWin = s[0] > s[1];
          const bWin = s[1] > s[0];
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-11 text-xs font-bold text-muted">{fmt(t.match.set, { n: i + 1 })}</div>
              <button
                type="button"
                aria-label={`${t.match.teamA} ${fmt(t.match.set, { n: i + 1 })}`}
                onClick={() => bump(i, 0)}
                className={`flex-1 h-[54px] rounded-[14px] border text-2xl font-black ${aWin ? "bg-blue-bg border-blue" : "bg-bg border-border-2"}`}
              >
                {s[0]}
              </button>
              <div className="text-sm font-extrabold text-dim">–</div>
              <button
                type="button"
                aria-label={`${t.match.teamB} ${fmt(t.match.set, { n: i + 1 })}`}
                onClick={() => bump(i, 1)}
                className={`flex-1 h-[54px] rounded-[14px] border text-2xl font-black ${bWin ? "bg-red-bg border-red" : "bg-bg border-border-2"}`}
              >
                {s[1]}
              </button>
            </div>
          );
        })}
        <div className="text-[11px] text-dim text-center">{t.match.tapHint}</div>
      </section>

      {fc && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-green-bg-2 border border-green-border px-3.5 py-3 text-[13px] text-muted">
          <Icon name="flame" size={18} className="text-green" />
          <div>
            <span className="font-extrabold text-green">{fmt(t.match.forecastWin, { n: fc.win })}</span> {fc.favoritesB ? t.match.favorites : ""} ·{" "}
            <span className="font-extrabold text-red-text">{fmt(t.match.forecastLose, { n: Math.abs(fc.lose) })}</span>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-bg text-red-text text-sm font-semibold px-4 py-3">{error}</div>}

      <button type="button" disabled={!canSubmit} onClick={submit} className="btn bg-red text-white">
        {pending ? t.common.loading : t.match.submit}
      </button>

      {picking && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-end" onClick={() => setPicking(null)}>
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10 max-h-[75dvh] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-black">{t.match.pickPlayer}</div>
              <button type="button" aria-label={t.common.close} onClick={() => setPicking(null)} className="w-9 h-9 rounded-full bg-bg flex items-center justify-center">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-1.5">
              {players
                .filter((p) => !chosen.includes(p.id) || sel[picking] === p.id)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSel((s) => ({ ...s, [picking]: p.id }));
                      setPicking(null);
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-bg active:bg-surface-2 text-left"
                  >
                    <Avatar name={p.name} color={p.color} size={36} />
                    <div className="flex-1 text-sm font-extrabold">{p.name}</div>
                    <div className="text-xs text-muted">{p.gamesPlayed ? p.elo : t.ranking.newPlayer}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
