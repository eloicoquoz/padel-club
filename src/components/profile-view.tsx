import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Dict, Locale } from "@/lib/i18n";
import { fmt, formatDate } from "@/lib/i18n";
import type { PublicUser } from "@/lib/services/users";
import { getRanking } from "@/lib/services/users";
import { getPartnerStats } from "@/lib/services/matches";
import { titleFor } from "@/lib/elo";
import { BADGE_KEYS, isBadgeKey } from "@/lib/badges";
import { Avatar, Icon, StatTile } from "./ui";
import { BadgeGrid } from "./badge-grid";

export async function ProfileView({ p, t, locale, isMe }: { p: PublicUser; t: Dict; locale: Locale; isMe: boolean }) {
  const db = await getDb();
  const [ranking, stats, badgeRows] = await Promise.all([
    getRanking(),
    getPartnerStats(p.id),
    db.select({ badge: schema.userBadges.badge, earnedAt: schema.userBadges.earnedAt }).from(schema.userBadges).where(eq(schema.userBadges.userId, p.id)),
  ]);
  const rank = ranking.find((r) => r.id === p.id)?.rank ?? null;
  const title = titleFor(p.elo);
  const earned = new Set(badgeRows.map((b) => b.badge).filter(isBadgeKey));
  const winRate = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
  const progress = title.next ? Math.max(6, Math.round(100 - title.next.missing)) : 100;

  return (
    <>
      <div className="relative flex flex-col items-center gap-2 pt-2">
        <div className="pointer-events-none absolute -top-40 left-1/2 -ml-[200px] w-[400px] h-[400px] rounded-full bg-blue opacity-[0.14]" />
        <div className="relative">
          <Avatar name={p.name} color={p.color} size={92} ring="var(--color-gold)" />
          {rank && (
            <div className="absolute -bottom-1.5 left-1/2 -ml-7 w-14 h-6 rounded-full bg-gold text-bg text-xs font-black flex items-center justify-center">#{rank}</div>
          )}
        </div>
        <div className="text-2xl font-black tracking-tight mt-2">{p.name}</div>
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-bold text-gold">{t.profile.titles[title.key]}</div>
          {p.playtomicLevel && (
            <a
              href={p.playtomicUrl ?? "https://app.playtomic.io"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-border text-[11px] font-extrabold text-muted"
            >
              Playtomic {p.playtomicLevel}
              <Icon name="external" size={12} />
            </a>
          )}
        </div>
        <div className="w-full flex flex-col gap-1.5 mt-1">
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted font-semibold">
            <span>{p.elo} Elo</span>
            <span>{title.next ? fmt(t.profile.nextTitle, { n: title.next.missing, title: t.profile.titles[title.next.key] }) : t.profile.titles.legend}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatTile value={rank ? `#${rank}` : "—"} label={t.profile.rank} />
        <StatTile value={p.elo} label={t.profile.elo} />
        <StatTile
          value={
            <>
              {winRate}
              <span className="text-xs">%</span>
            </>
          }
          label={t.profile.winRate}
        />
        <StatTile value={p.streak > 0 ? p.streak : p.bestStreak} label={t.profile.streak} tone={p.streak >= 3 ? "amber" : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl bg-green-bg-2 border border-[#1F4D33] p-3">
          {stats.bestPartner ? (
            <>
              <Avatar name={stats.bestPartner.user.name} color={stats.bestPartner.user.color} size={36} />
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-green">{t.profile.bestPartner}</div>
                <div className="text-[13px] font-extrabold truncate">
                  {stats.bestPartner.user.name} · {Math.round((stats.bestPartner.wins / stats.bestPartner.games) * 100)} %
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted">{t.profile.noData}</div>
          )}
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-red-bg border border-[#6B1C24] p-3">
          {stats.nemesis ? (
            <>
              <Avatar name={stats.nemesis.user.name} color={stats.nemesis.user.color} size={36} />
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-text">{t.profile.nemesis}</div>
                <div className="text-[13px] font-extrabold truncate">
                  {stats.nemesis.user.name} · {stats.nemesis.wins} {t.common.wins} – {stats.nemesis.losses} {t.common.losses}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted">{t.profile.noData}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-base font-extrabold">{t.profile.badges}</div>
          <div className="text-xs font-bold text-muted">
            {earned.size}/{BADGE_KEYS.length}
          </div>
        </div>
        <BadgeGrid earned={[...earned]} />
      </div>

      {!isMe && (
        <Link href={`/challenges/new?to=${p.id}`} className="btn bg-red text-white">
          <Icon name="racket" size={20} />
          {t.challenges.new}
        </Link>
      )}
      <div className="text-center text-xs text-dim">{fmt(t.profile.memberSince, { date: formatDate(p.createdAt, locale, { month: "long", year: "numeric" }) })}</div>
    </>
  );
}
