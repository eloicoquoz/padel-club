import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { fmt, formatDateTime, joinNames } from "@/lib/i18n";
import { getMatch, getPartnerStats } from "@/lib/services/matches";
import { getRanking } from "@/lib/services/users";
import { isBadgeKey } from "@/lib/badges";
import { titleFor } from "@/lib/elo";
import { Avatar, Icon } from "@/components/ui";
import { Sentence } from "@/components/sentence";
import { tagLabel } from "@/components/match-row";
import { Pill } from "@/components/ui";

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fresh?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { id } = await params;
  const { fresh } = await searchParams;
  const m = await getMatch(id);
  if (!m) notFound();

  const inA = m.a.some((p) => p.id === user.id);
  const inB = m.b.some((p) => p.id === user.id);
  const involved = inA || inB;
  const won = (inA && m.winner === "A") || (inB && m.winner === "B");
  const myDelta = inA ? m.eloDeltaA : inB ? m.eloDeltaB : 0;
  const winners = m.winner === "A" ? m.a : m.b;
  const losers = m.winner === "A" ? m.b : m.a;

  const db = await getDb();
  const [badgeRows, ranking, hist] = await Promise.all([
    involved
      ? db.select().from(schema.userBadges).where(and(eq(schema.userBadges.userId, user.id), eq(schema.userBadges.matchId, m.id)))
      : Promise.resolve([]),
    getRanking(),
    involved
      ? db.select().from(schema.ratingHistory).where(and(eq(schema.ratingHistory.userId, user.id), eq(schema.ratingHistory.matchId, m.id))).limit(1)
      : Promise.resolve([]),
  ]);
  const rankNow = ranking.find((r) => r.id === user.id)?.rank ?? null;
  const eloBefore = hist[0]?.eloBefore ?? null;
  const eloAfter = hist[0]?.eloAfter ?? null;
  // Rang approximatif avant le match : nombre de joueurs classés au-dessus de l'ancien Elo + 1.
  const rankBefore = eloBefore !== null ? ranking.filter((r) => r.id !== user.id && r.elo > eloBefore).length + 1 : null;
  const rankMove = rankNow !== null && rankBefore !== null ? rankBefore - rankNow : 0;
  const title = eloAfter !== null ? titleFor(eloAfter) : null;
  const seed = [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0);

  const opponents = inA ? m.b : m.a;
  const partnerStats = involved ? await getPartnerStats(user.id) : null;
  const nemesisHit = partnerStats?.nemesis && opponents.some((o) => o.id === partnerStats.nemesis!.user.id) ? partnerStats.nemesis : null;

  const Team = ({ ps, dim, ring }: { ps: typeof m.a; dim?: boolean; ring?: string }) => (
    <>
      {ps.map((p) => (
        <div key={p.id} className={`flex flex-col items-center gap-1.5 ${dim ? "opacity-55" : ""}`}>
          <Avatar name={p.name} color={p.color} size={52} ring={ring} />
          <div className="text-xs font-extrabold">{p.name}</div>
        </div>
      ))}
    </>
  );

  if (!involved) {
    return (
      <>
        <div className="flex items-center gap-3">
          <Link href="/history" aria-label={t.common.back} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <Icon name="back" size={18} />
          </Link>
          <div className="text-sm text-muted">{formatDateTime(m.playedAt, locale)}</div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Team ps={m.a} dim={m.winner !== "A"} ring={m.winner === "A" ? "var(--color-green)" : undefined} />
          <div className="text-[28px] font-black tracking-tight px-1 text-center whitespace-pre-line">{m.sets.map(([a, b]) => `${a}-${b}`).join("\n")}</div>
          <Team ps={m.b} dim={m.winner !== "B"} ring={m.winner === "B" ? "var(--color-green)" : undefined} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {m.tags.map((x) => {
            const tl = tagLabel(x, t);
            return tl ? (
              <Pill key={x} tone={tl.tone}>
                {tl.label}
              </Pill>
            ) : null;
          })}
        </div>
        <div className="card text-center text-sm text-muted">
          {joinNames(winners.map((p) => p.name))} +{Math.abs(m.eloDeltaA)} Elo · {joinNames(losers.map((p) => p.name))} -{Math.abs(m.eloDeltaA)} Elo
        </div>
      </>
    );
  }

  const confettiColors = ["#FFC53D", "#E63946", "#3B82F6", "#D4F53C", "#3B82F6", "#FFC53D", "#E63946"];

  return (
    <div className="relative -mx-5 px-6 pt-4 pb-32 min-h-dvh flex flex-col overflow-hidden">
      <div className={`pointer-events-none absolute -top-[200px] left-1/2 -ml-[260px] w-[520px] h-[520px] rounded-full ${won ? "bg-red opacity-[0.22]" : "bg-blue opacity-[0.14]"}`} />
      {won
        ? confettiColors.map((c, i) => (
            <div key={i} className="confetti" aria-hidden="true" style={{ left: `${8 + i * 13}%`, background: c, animationDelay: `${(i * 0.45) % 3}s`, animationIterationCount: fresh ? "infinite" : 2 }} />
          ))
        : [10, 28, 47, 66, 85].map((l, i) => <div key={i} className="rain" aria-hidden="true" style={{ left: `${l}%`, animationDelay: `${i * 0.5}s` }} />)}

      <div className="relative flex flex-col items-center text-center gap-1.5">
        <div className={`text-[13px] font-extrabold uppercase tracking-[0.16em] ${won ? "text-red-text" : "text-blue-text"}`}>
          {won ? (m.tags.includes("giant_killer") ? t.badges.giant_killer.name : t.result.winSentences[seed % t.result.winSentences.length]) : t.result.loseSub}
        </div>
        <h1 className={`pop text-[60px] leading-[0.95] font-black tracking-tighter ${won ? "" : "text-muted"}`}>{won ? t.result.win : t.result.lose}</h1>
        {won && <div className="text-[15px] text-muted mt-1.5">{fmt(t.result.winSub, { names: joinNames(losers.map((p) => p.name)) })}</div>}
      </div>

      <div className="pop relative flex items-center justify-center gap-3 mt-8" style={{ animationDelay: ".2s" }}>
        <Team ps={inA ? m.a : m.b} dim={!won} ring={won ? "var(--color-green)" : undefined} />
        <div className={`text-[28px] font-black tracking-tight px-1 text-center whitespace-pre-line ${won ? "" : "text-muted"}`}>
          {m.sets.map(([a, b]) => (inA ? `${a}-${b}` : `${b}-${a}`)).join("\n")}
        </div>
        <Team ps={inA ? m.b : m.a} dim={won} ring={!won ? "var(--color-green)" : undefined} />
      </div>

      <div className="pop relative grid grid-cols-2 gap-2.5 mt-7" style={{ animationDelay: ".4s" }}>
        <div className={`flex flex-col gap-1 rounded-[20px] border p-4 ${won ? "bg-green-bg-2 border-green-border" : "bg-red-bg border-red-border"}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">Elo</div>
          <div className={`text-[34px] font-black leading-none ${won ? "text-green" : "text-red-text"}`}>
            {myDelta > 0 ? "+" : ""}
            {myDelta}
          </div>
          {eloBefore !== null && (
            <div className="text-xs text-muted">
              {eloBefore} → <span className="text-text font-extrabold">{eloAfter}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{t.result.rank}</div>
          <div className="text-[34px] font-black leading-none">{rankNow ? `#${rankNow}` : "—"}</div>
          <div className={`text-xs font-bold ${rankMove > 0 ? "text-green" : rankMove < 0 ? "text-red-text" : "text-muted"}`}>
            {rankMove > 0 ? fmt(t.result.rankUp, { n: rankMove }) : rankMove < 0 ? fmt(t.result.rankDown, { n: -rankMove }) : fmt(t.result.rankSame, { rank: rankNow ?? "—" })}
          </div>
        </div>
      </div>

      {!won && (
        <div className="pop relative mt-3" style={{ animationDelay: ".5s" }}>
          <Sentence list={t.result.sentences} seed={seed} />
        </div>
      )}

      {title && (
        <div className="pop relative card flex flex-col gap-2.5 mt-3" style={{ animationDelay: ".6s" }}>
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold">{t.profile.titles[title.key]}</div>
            {title.next && <div className="text-xs font-bold text-muted">{fmt(t.profile.nextTitle, { n: title.next.missing, title: t.profile.titles[title.next.key] })}</div>}
          </div>
          <div className="h-2.5 rounded-full bg-bg overflow-hidden">
            <div className="grow h-full rounded-full bg-gold" style={{ width: `${title.next ? Math.max(6, 100 - (title.next.missing / 100) * 100) : 100}%` }} />
          </div>
        </div>
      )}

      {badgeRows.map((b) =>
        isBadgeKey(b.badge) ? (
          <div key={b.id} className="pop relative flex items-center gap-3 rounded-2xl bg-amber-bg border border-amber-border px-3.5 py-3 mt-3" style={{ animationDelay: ".75s" }}>
            <Icon name="star" size={32} className="text-amber" />
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-amber">{t.result.newBadge}</div>
              <div className="text-[15px] font-extrabold">
                {t.badges[b.badge].name} — {t.badges[b.badge].desc}
              </div>
            </div>
          </div>
        ) : null,
      )}

      {nemesisHit && !won && (
        <div className="relative card flex items-center gap-3 mt-3">
          <Avatar name={nemesisHit.user.name} color={nemesisHit.user.color} size={36} />
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-red-text">{fmt(t.result.againstYou, { name: nemesisHit.user.name })}</div>
            <div className="text-sm font-extrabold">
              {nemesisHit.wins} – {nemesisHit.losses} · {t.result.nemesis}
            </div>
          </div>
        </div>
      )}

      <a href="https://app.playtomic.io" target="_blank" rel="noreferrer" className="relative flex items-center justify-center gap-2 mt-4 h-10 text-[13px] font-bold text-muted">
        <Icon name="external" size={16} />
        {t.match.reportPlaytomic}
      </a>

      <div className="relative mt-auto pt-4 flex flex-col gap-2.5">
        {!won && (
          <Link href={`/challenges/new?to=${opponents.map((o) => o.id).join(",")}`} className="btn bg-red text-white">
            <Icon name="racket" size={20} />
            {t.result.revenge}
          </Link>
        )}
        <Link href="/" className={`btn ${won ? "bg-text text-bg" : "bg-surface border border-border-2 text-muted h-12 text-[15px]"}`}>
          {won ? t.result.continue : t.result.digest}
        </Link>
      </div>
    </div>
  );
}
