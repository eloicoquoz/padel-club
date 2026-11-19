import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { listChallengesFor } from "@/lib/services/challenges";
import { getMatches } from "@/lib/services/matches";
import { Empty, Eyebrow, Icon, PageHeader } from "@/components/ui";
import { ChallengeCard } from "@/components/challenge-card";

export default async function ChallengesPage() {
  const user = await requireUser();
  const { t } = await getT();
  const { received, sent } = await listChallengesFor(user.id);
  const week = await getMatches({ userId: user.id, sinceDays: 7 });
  const partnersEver = new Set<string>();
  const all = await getMatches({ userId: user.id, limit: 500 });
  for (const m of all) {
    const team = m.a.some((p) => p.id === user.id) ? m.a : m.b;
    team.filter((p) => p.id !== user.id).forEach((p) => partnersEver.add(p.id));
  }
  const newPartnerThisWeek = week.some((m) => {
    const team = m.a.some((p) => p.id === user.id) ? m.a : m.b;
    const partner = team.find((p) => p.id !== user.id);
    if (!partner) return false;
    const before = all.filter((x) => x.playedAt < m.playedAt).some((x) => {
      const tm = x.a.some((p) => p.id === user.id) ? x.a : x.b;
      return tm.some((p) => p.id === partner.id);
    });
    return !before;
  });

  return (
    <>
      <PageHeader
        title={t.challenges.title}
        back="/"
        right={
          <Link href="/challenges/new" className="btn btn-sm bg-red text-white">
            <Icon name="plus" size={16} />
            {t.challenges.new}
          </Link>
        }
      />

      <div className="flex flex-col gap-2.5">
        <Eyebrow>
          {t.challenges.received} · {received.length}
        </Eyebrow>
        {received.length === 0 && <Empty>{t.challenges.none}</Empty>}
        {received.map((c) => (
          <ChallengeCard key={c.id} c={c} meId={user.id} direction="received" />
        ))}
      </div>

      {sent.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Eyebrow>{t.challenges.sent}</Eyebrow>
          {sent.map((c) => (
            <ChallengeCard key={c.id} c={c} meId={user.id} direction="sent" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <Eyebrow>{t.challenges.weekly}</Eyebrow>
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`flex flex-col gap-1.5 rounded-[18px] border p-3.5 ${newPartnerThisWeek ? "bg-green-bg-2 border-green-border" : "bg-amber-bg border-amber-border"}`}>
            <div className={`text-[11px] font-extrabold uppercase tracking-wider ${newPartnerThisWeek ? "text-green" : "text-amber"}`}>{newPartnerThisWeek ? "✓" : "Bonus"}</div>
            <div className="text-sm font-extrabold leading-tight">{t.challenges.weeklyNewPartner}</div>
            <div className="text-xs text-muted">{newPartnerThisWeek ? "1/1" : "0/1"}</div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-border bg-surface p-3.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{t.profile.streak}</div>
            <div className="text-sm font-extrabold leading-tight">{t.challenges.weeklyThree}</div>
            <div className="h-1.5 rounded-full bg-bg overflow-hidden mt-1">
              <div className="h-full bg-green" style={{ width: `${Math.min(100, (week.length / 3) * 100)}%` }} />
            </div>
            <div className="text-xs text-muted">{Math.min(3, week.length)}/3</div>
          </div>
        </div>
      </div>
    </>
  );
}
