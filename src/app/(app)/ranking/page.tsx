import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatMonth } from "@/lib/i18n";
import { getRanking } from "@/lib/services/users";
import { Avatar, Empty, Icon, PageHeader, Pill } from "@/components/ui";

export default async function RankingPage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const ranking = await getRanking();
  const top = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const podiumOrder = [top[1], top[0], top[2]];
  const medal = ["#C0C0C0", "#FFC53D", "#CD7F32"];
  const heights = [72, 100, 56];

  return (
    <>
      <PageHeader title={t.ranking.title} eyebrow={`${t.ranking.season} · ${formatMonth(new Date(), locale)}`} />

      {ranking.length === 0 ? (
        <Empty>{t.ranking.noPlayers}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 items-end mt-2">
            {podiumOrder.map((p, i) =>
              p ? (
                <Link key={p.id} href={`/profile/${p.id}`} className="flex flex-col items-center gap-2">
                  {i === 1 && <Icon name="crown" size={28} className="text-gold -mb-1" />}
                  <Avatar name={p.name} color={p.color} size={i === 1 ? 68 : 56} ring={medal[i]} />
                  <div className={`font-extrabold ${i === 1 ? "text-[15px]" : "text-sm"} truncate max-w-full`}>{p.name}</div>
                  <div
                    className={`w-full rounded-t-[14px] flex flex-col items-center justify-center gap-0.5 ${i === 1 ? "bg-red text-white" : "bg-surface-2"}`}
                    style={{ height: heights[i] }}
                  >
                    <div className={`font-black ${i === 1 ? "text-3xl" : "text-[22px]"}`} style={{ color: i === 1 ? "#fff" : medal[i] }}>
                      {p.rank}
                    </div>
                    <div className={`text-xs font-bold ${i === 1 ? "opacity-90" : "text-muted"}`}>{p.elo}</div>
                  </div>
                </Link>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          <div className="flex flex-col gap-2">
            {rest.map((r) => {
              const me = r.id === user.id;
              return (
                <Link
                  key={r.id}
                  href={`/profile/${r.id}`}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border ${me ? "bg-blue-bg border-blue" : "bg-surface border-border"}`}
                >
                  <div className="w-7 text-center text-base font-black text-muted">{r.rank}</div>
                  <Avatar name={r.name} color={r.color} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-extrabold truncate">{r.name}</span>
                      {r.streak >= 3 && <Pill tone="amber">{t.ranking.onFire}</Pill>}
                      {r.gamesPlayed < 5 && <Pill>{t.ranking.newPlayer}</Pill>}
                    </div>
                    <div className="text-xs text-muted">
                      {r.wins} {t.common.wins} · {r.losses} {t.common.losses}
                      {r.streak >= 2 ? ` · ${fmt(t.ranking.streakShort, { n: r.streak })}` : ""}
                      {r.playtomicLevel ? ` · ${t.ranking.playtomic} ${r.playtomicLevel}` : ""}
                    </div>
                  </div>
                  <div className="text-base font-black">{r.elo}</div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
