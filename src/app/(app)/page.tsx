import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatDate, formatTime, joinNames } from "@/lib/i18n";
import { getRanking } from "@/lib/services/users";
import { getMatches, getRatingHistory } from "@/lib/services/matches";
import { upcomingSessions } from "@/lib/services/sessions";
import { listChallengesFor } from "@/lib/services/challenges";
import { titleFor } from "@/lib/elo";
import { Avatar, AvatarStack, Eyebrow, Icon } from "@/components/ui";
import { MatchRow } from "@/components/match-row";
import { JoinButton } from "@/components/session-join";

export default async function HomePage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const [ranking, matches, sessions, challenges, history] = await Promise.all([
    getRanking(),
    getMatches({ limit: 5 }),
    upcomingSessions(1),
    listChallengesFor(user.id),
    getRatingHistory(user.id, 7),
  ]);
  const me = ranking.find((r) => r.id === user.id);
  const weekDelta = history.length ? history[history.length - 1].eloAfter - history[0].eloBefore : 0;
  const title = titleFor(user.elo);
  const next = sessions[0];
  const pending = challenges.received.filter((c) => c.status === "pending");

  return (
    <>
      <div className="hero relative overflow-hidden bg-red text-white">
        <div className="pointer-events-none absolute -right-12 -top-20 w-64 h-64 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -left-20 bottom-[-120px] w-56 h-56 rounded-full bg-black/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] opacity-80">{formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="text-[34px] leading-none font-black tracking-[-0.03em] uppercase mt-1">{fmt(t.home.hello, { name: user.name })}</div>
          </div>
          <div className="flex items-center gap-2.5">
            {user.streak >= 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/15 text-[13px] font-extrabold" title={fmt(t.home.streak, { n: user.streak })}>
                <Icon name="flame" size={14} />
                {user.streak}
              </div>
            )}
            <Link href="/profile" aria-label={t.nav.profile}>
              <Avatar name={user.name} color={user.color} size={44} ring="rgba(255,255,255,0.6)" />
            </Link>
          </div>
        </div>
        <Link href="/ranking" className="relative mt-5 flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] opacity-80">{t.home.yourRank}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[84px] font-black leading-[0.85] tracking-[-0.05em]">{me ? `#${me.rank}` : "—"}</span>
              <span className="text-[17px] font-extrabold opacity-90">{user.elo} Elo</span>
            </div>
            <div className="text-[13px] font-bold opacity-90 mt-1">
              {weekDelta !== 0 ? `${weekDelta > 0 ? "+" : ""}${weekDelta} Elo · ` : ""}
              {fmt(t.home.rankMove, { move: weekDelta > 0 ? "↑" : weekDelta < 0 ? "↓" : "=" })}
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-white text-[#111214] rounded-2xl px-3 py-2.5 max-w-[130px] text-center rotate-[-3deg] shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">{t.home.title}</div>
            <div className="text-[13px] font-black leading-tight">{t.profile.titles[title.key]}</div>
          </div>
        </Link>
      </div>

      <div className="card flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <Eyebrow>{t.home.nextSession}</Eyebrow>
          {next && (
            <div className={`text-xs font-bold ${next.players.length >= next.max ? "text-red-text" : "text-green"}`}>
              {fmt(t.home.registered, { n: next.players.length, max: next.max })}
            </div>
          )}
        </div>
        {next ? (
          <>
            <Link href={`/sessions/${next.id}`} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  {formatDate(next.startsAt, locale, { weekday: "long" })} {formatTime(next.startsAt, locale)}
                </div>
                <div className="text-[13px] text-muted">
                  {fmt(t.sessions.courts, { n: next.courts })} · {fmt(t.sessions.minutes, { n: next.durationMin })}
                  {next.location ? ` · ${next.location}` : ""}
                </div>
              </div>
              <AvatarStack people={next.players} />
            </Link>
            <JoinButton sessionId={next.id} joined={next.players.some((p) => p.id === user.id)} full={next.players.length >= next.max} />
          </>
        ) : (
          <Link href="/sessions/new" className="text-sm text-muted">
            {t.home.noSession}
          </Link>
        )}
      </div>

      <Link href="/challenges" className={`flex items-center gap-3.5 rounded-[20px] bg-surface border px-4 py-3.5 ${pending.length ? "border-blue" : "border-border"}`}>
        <div className="w-11 h-11 rounded-[14px] bg-blue-bg text-blue-text flex items-center justify-center shrink-0">
          <Icon name="racket" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          {pending[0] ? (
            <>
              <div className="text-[15px] font-extrabold truncate">{fmt(t.home.challengeFrom, { names: joinNames(pending[0].from.map((p) => p.name)) })}</div>
              {pending[0].message && <div className="text-[13px] text-muted truncate">« {pending[0].message} »</div>}
            </>
          ) : (
            <div className="text-[15px] font-extrabold">{t.challenges.title}</div>
          )}
        </div>
        {pending.length > 0 && <div className="w-[22px] h-[22px] rounded-full bg-red text-white text-xs font-extrabold flex items-center justify-center">{pending.length}</div>}
      </Link>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-base font-extrabold">{t.home.lastMatches}</div>
          <Link href="/history" className="text-[13px] font-semibold text-muted">
            {t.common.seeAll}
          </Link>
        </div>
        {matches.length === 0 && <div className="card text-sm text-muted text-center py-6">{t.home.noMatches}</div>}
        {matches.map((m) => (
          <MatchRow key={m.id} m={m} meId={user.id} t={t} locale={locale} />
        ))}
      </div>
    </>
  );
}
