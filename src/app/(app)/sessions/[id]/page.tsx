import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatDate, formatTime, joinNames } from "@/lib/i18n";
import { balancedPairs, getSession } from "@/lib/services/sessions";
import { getMatches } from "@/lib/services/matches";
import { deleteSessionAction } from "@/lib/actions/app";
import { Avatar, Eyebrow, Icon, PageHeader } from "@/components/ui";
import { JoinButton } from "@/components/session-join";
import { MatchRow } from "@/components/match-row";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { id } = await params;
  const s = await getSession(id);
  if (!s) notFound();
  const joined = s.players.some((p) => p.id === user.id);
  const full = s.players.length >= s.max;
  const pairs = balancedPairs(s.players);
  const matches = (await getMatches({ limit: 50 })).filter((m) => m.sessionId === s.id);
  const canDelete = s.createdBy === user.id || user.isAdmin;
  const slots = Array.from({ length: s.max }, (_, i) => s.players[i] ?? null);

  return (
    <>
      <PageHeader tone="lime" icon="calendar" title={formatDate(s.startsAt, locale, { weekday: "long", day: "numeric", month: "long" })} back="/sessions" eyebrow={full ? t.sessions.full : t.sessions.open} />
      <div className="text-[13px] text-muted -mt-2">
        {formatTime(s.startsAt, locale)} – {formatTime(new Date(s.startsAt.getTime() + s.durationMin * 60000), locale)}
        {s.location ? ` · ${s.location}` : ""} · {fmt(t.sessions.courts, { n: s.courts })}
        {s.organizer ? ` · ${fmt(t.sessions.organizedBy, { name: s.organizer.name })}` : ""}
      </div>
      {s.note && <div className="card text-sm italic text-muted border-l-4 border-l-blue">« {s.note} »</div>}

      <div className="card flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <Eyebrow>{t.sessions.places}</Eyebrow>
          <div className="text-sm font-black">
            {s.players.length}
            <span className="text-dim">/{s.max}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((p, i) =>
            p ? (
              <Link key={p.id} href={`/profile/${p.id}`} className="flex flex-col items-center gap-1">
                <Avatar name={p.name} color={p.color} size={44} />
                <div className="text-[11px] font-bold truncate max-w-full">{p.name}</div>
              </Link>
            ) : (
              <div key={`free-${i}`} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full border-2 border-dashed border-border-2 flex items-center justify-center text-dim text-sm font-extrabold">?</div>
                <div className="text-[11px] font-bold text-dim">{t.sessions.free}</div>
              </div>
            ),
          )}
        </div>
        <JoinButton sessionId={s.id} joined={joined} full={full} />
        {s.playtomicUrl && (
          <a href={s.playtomicUrl} target="_blank" rel="noreferrer" className="btn h-11 text-sm bg-surface-2 border border-border-2 text-text rounded-[14px]">
            <Icon name="external" size={16} />
            {t.sessions.book}
          </a>
        )}
      </div>

      {pairs.length > 0 && (
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Eyebrow>{t.sessions.pairs}</Eyebrow>
            <Icon name="shuffle" size={18} className="text-muted" />
          </div>
          {pairs.map((pr) => (
            <div key={pr.court} className="flex items-center gap-3 rounded-2xl bg-bg px-3 py-2.5">
              <div className="text-[11px] font-extrabold text-muted w-16">{fmt(t.americano.court, { n: pr.court })}</div>
              <div className="flex-1 text-sm font-extrabold">
                {joinNames(pr.a.map((p) => p.name))} <span className="text-dim text-xs">vs</span> {joinNames(pr.b.map((p) => p.name))}
              </div>
              <Link
                href={`/match/new?sessionId=${s.id}`}
                aria-label={t.sessions.enterMatch}
                className="w-8 h-8 rounded-full bg-red text-white flex items-center justify-center shrink-0"
              >
                <Icon name="plus" size={16} />
              </Link>
            </div>
          ))}
          <div className="text-xs text-muted text-center">{t.sessions.pairsHint}</div>
        </div>
      )}

      <Link href={`/match/new?sessionId=${s.id}`} className="btn bg-text text-bg">
        <Icon name="plus" size={20} />
        {t.sessions.enterMatch}
      </Link>

      {matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>{t.home.lastMatches}</Eyebrow>
          {matches.map((m) => (
            <MatchRow key={m.id} m={m} meId={user.id} t={t} locale={locale} showDate={false} />
          ))}
        </div>
      )}

      {canDelete && (
        <form action={deleteSessionAction.bind(null, s.id)} className="mt-4">
          <button type="submit" className="w-full text-xs font-bold text-dim py-2">
            {t.common.delete}
          </button>
        </form>
      )}
    </>
  );
}
