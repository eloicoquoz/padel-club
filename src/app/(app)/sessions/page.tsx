import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatDate, formatTime } from "@/lib/i18n";
import { pastSessions, upcomingSessions } from "@/lib/services/sessions";
import { listTournaments } from "@/lib/services/tournaments";
import { AvatarStack, Empty, Icon, PageHeader, Pill } from "@/components/ui";
import { JoinButton } from "@/components/session-join";

export default async function SessionsPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const [upcoming, past, tournaments] = await Promise.all([upcomingSessions(10), pastSessions(5), listTournaments(3)]);
  const running = tournaments.filter((x) => x.status !== "finished");

  return (
    <>
      <PageHeader
        title={t.sessions.title}
        right={
          <Link href="/sessions/new" className="btn btn-sm bg-text text-bg">
            <Icon name="plus" size={16} />
            {t.sessions.propose}
          </Link>
        }
      />

      <div className="flex items-center justify-between rounded-2xl bg-surface border border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon name="trophy" size={20} className="text-gold" />
          <div className="text-sm font-extrabold">{t.americano.title}</div>
          {running.length > 0 && <Pill tone="red">{t.americano.running}</Pill>}
        </div>
        <Link href={running[0] ? `/americano/${running[0].id}` : "/americano"} className="text-[13px] font-bold text-muted">
          {t.common.open} →
        </Link>
      </div>

      {upcoming.length === 0 && <Empty>{t.sessions.none}</Empty>}
      {upcoming.map((s, idx) => {
        const joined = s.players.some((p) => p.id === user.id);
        const full = s.players.length >= s.max;
        const first = idx === 0;
        return (
          <div key={s.id} className={`card flex flex-col gap-3 ${first ? "border-green" : ""}`}>
            <Link href={`/sessions/${s.id}`} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-xs font-extrabold uppercase tracking-[0.1em] ${full ? "text-red-text" : "text-green"}`}>
                  {formatDate(s.startsAt, locale, { weekday: "long", day: "numeric", month: "short" })} · {full ? t.sessions.full : t.sessions.open}
                </div>
                <div className="text-2xl font-black tracking-tight">
                  {formatTime(s.startsAt, locale)} – {formatTime(new Date(s.startsAt.getTime() + s.durationMin * 60000), locale)}
                </div>
                <div className="text-[13px] text-muted truncate">
                  {s.location ? `${s.location} · ` : ""}
                  {fmt(t.sessions.courts, { n: s.courts })}
                  {s.organizer ? ` · ${fmt(t.sessions.organizedBy, { name: s.organizer.name })}` : ""}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-bg shrink-0">
                <div className="text-lg font-black leading-none">
                  {s.players.length}
                  <span className="text-dim">/{s.max}</span>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted">{t.sessions.places}</div>
              </div>
            </Link>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 overflow-hidden"><AvatarStack people={s.players} size={34} max={5} /></div>
              <JoinButton sessionId={s.id} joined={joined} full={full} compact />
            </div>
            {s.playtomicUrl && (
              <a href={s.playtomicUrl} target="_blank" rel="noreferrer" className="btn h-11 text-sm bg-surface-2 border border-border-2 text-text rounded-[14px]">
                <Icon name="external" size={16} />
                {t.sessions.book}
              </a>
            )}
          </div>
        );
      })}

      {past.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="eyebrow">{t.sessions.past}</div>
          {past.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center gap-3 rounded-2xl bg-surface border border-border px-4 py-3">
              <div className="flex flex-col items-center w-11 py-1.5 rounded-xl bg-bg">
                <div className="text-[10px] font-bold text-muted uppercase">{formatDate(s.startsAt, locale, { weekday: "short" })}</div>
                <div className="text-lg font-black leading-none">{formatDate(s.startsAt, locale, { day: "numeric" })}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold">
                  {formatTime(s.startsAt, locale)} {s.location ? `· ${s.location}` : ""}
                </div>
                <div className="text-xs text-muted">
                  {s.players.length} {t.common.players}
                </div>
              </div>
              <AvatarStack people={s.players} size={28} max={4} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
