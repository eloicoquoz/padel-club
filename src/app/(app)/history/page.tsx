import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { relativeDay } from "@/lib/i18n";
import { getMatches, getRatingHistory } from "@/lib/services/matches";
import { MatchRow } from "@/components/match-row";
import { Empty, PageHeader } from "@/components/ui";
import { START_ELO } from "@/lib/elo";

function Sparkline({ points, start }: { points: number[]; start: number }) {
  if (points.length < 2) return null;
  const w = 320;
  const h = 70;
  const min = Math.min(...points, start) - 10;
  const max = Math.max(...points, start) + 10;
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * (h - 10) - 5;
  const d = points.map((p, i) => `${x(i)},${y(p)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  const color = up ? "var(--color-green)" : "var(--color-red-text)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px]" role="img" aria-label="Elo">
      <line x1="0" y1={y(start)} x2={w} y2={y(start)} stroke="var(--color-border-2)" strokeWidth="1" strokeDasharray="3 4" />
      <polyline points={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="4" fill={color} />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="8" fill={color} opacity="0.25" />
    </svg>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const mine = sp.all !== "1";
  const [matches, hist] = await Promise.all([getMatches(mine ? { userId: user.id, limit: 100 } : { limit: 100 }), getRatingHistory(user.id, 30)]);
  const points = hist.length ? [hist[0].eloBefore, ...hist.map((h) => h.eloAfter)] : [];
  const delta = points.length ? points[points.length - 1] - points[0] : 0;
  const groups = new Map<string, typeof matches>();
  for (const m of matches) {
    const k = relativeDay(m.playedAt, locale, t);
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }

  const Toggle = () => (
    <div className="flex gap-1 bg-surface p-1 rounded-full">
      <Link href="/history" className={`h-8 px-3 rounded-full text-xs font-extrabold flex items-center ${mine ? "bg-text text-bg" : "text-muted"}`}>
        {t.history.mine}
      </Link>
      <Link href="/history?all=1" className={`h-8 px-3 rounded-full text-xs font-extrabold flex items-center ${!mine ? "bg-text text-bg" : "text-muted"}`}>
        {t.history.all}
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader title={t.history.title} back="/" right={<Toggle />} />

      {mine && points.length >= 2 && (
        <div className="card flex flex-col gap-2.5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{t.history.eloCurve}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-black leading-none">{user.elo}</span>
                <span className={`text-[13px] font-extrabold ${delta >= 0 ? "text-green" : "text-red-text"}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted font-semibold">
              <span>
                <span className="text-text font-extrabold">{user.wins}</span> {t.common.wins}
              </span>
              <span>
                <span className="text-text font-extrabold">{user.losses}</span> {t.common.losses}
              </span>
              <span>
                <span className="text-text font-extrabold">{user.gamesPlayed ? Math.round((user.wins / user.gamesPlayed) * 100) : 0}</span> %
              </span>
            </div>
          </div>
          <Sparkline points={points} start={START_ELO} />
          <div className="text-[10px] text-dim font-semibold text-right">
            {t.history.start} ({START_ELO})
          </div>
        </div>
      )}

      {matches.length === 0 && <Empty>{t.history.empty}</Empty>}
      {[...groups.entries()].map(([label, ms]) => (
        <div key={label} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="eyebrow">{label}</div>
            <div className="text-[11px] font-bold text-dim">
              {ms.length} {ms.length > 1 ? t.common.matches : t.common.match}
            </div>
          </div>
          {ms.map((m) => (
            <MatchRow key={m.id} m={m} meId={user.id} t={t} locale={locale} showDate={true} />
          ))}
        </div>
      ))}
    </>
  );
}
