import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt, formatMonth } from "@/lib/i18n";
import { getRanking } from "@/lib/services/users";
import { listSeasons, monthDate, monthKey, monthStandings } from "@/lib/services/seasons";
import { Avatar, Empty, Icon, PageHeader, Pill, Segmented } from "@/components/ui";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const monthView = sp.view === "month";
  const [ranking, month, seasons] = await Promise.all([getRanking(), monthStandings(monthKey()), listSeasons(12)]);
  const medal = ["#C0C0C0", "#FFC53D", "#CD7F32"];
  const heights = [72, 100, 56];

  const Toggle = () => (
    <Segmented
      items={[
        { href: "/ranking?view=month", label: t.seasons.month, active: monthView },
        { href: "/ranking", label: t.seasons.allTime, active: !monthView },
      ]}
    />
  );

  // Lignes à afficher : général (Elo) ou mois (Elo gagné)
  const rows = monthView
    ? month.rows.map((r) => ({ ...r.user, rank: r.rank, main: `${r.delta > 0 ? "+" : ""}${r.delta}`, sub: `${r.wins} ${t.common.wins} · ${r.losses} ${t.common.losses} · ${r.elo} Elo`, streak: r.user.streak, gamesPlayed: r.user.gamesPlayed }))
    : ranking.map((r) => ({ ...r, main: String(r.elo), sub: `${r.wins} ${t.common.wins} · ${r.losses} ${t.common.losses}${r.streak >= 2 ? ` · ${fmt(t.ranking.streakShort, { n: r.streak })}` : ""}${r.playtomicLevel ? ` · ${t.ranking.playtomic} ${r.playtomicLevel}` : ""}` }));
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const podiumOrder = [top[1], top[0], top[2]];

  return (
    <>
      <PageHeader tone="red" icon="trophy" title={t.ranking.title} eyebrow={monthView ? formatMonth(new Date(), locale) : t.seasons.allTime} />
      <div className="flex justify-center -mt-2">
        <Toggle />
      </div>

      {rows.length === 0 ? (
        <Empty>{monthView ? t.seasons.noMatchesMonth : t.ranking.noPlayers}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 items-end mt-2">
            {podiumOrder.map((p, i) =>
              p ? (
                <Link key={p.id} href={`/profile/${p.id}`} className="flex flex-col items-center gap-2 min-w-0">
                  {i === 1 && <Icon name="crown" size={28} className="text-gold -mb-1" />}
                  <Avatar name={p.name} color={p.color} size={i === 1 ? 68 : 56} ring={medal[i]} />
                  <div className={`font-extrabold ${i === 1 ? "text-[15px]" : "text-sm"} truncate max-w-full`}>{p.name}</div>
                  <div
                    className={`w-full rounded-t-[14px] flex flex-col items-center justify-center gap-0.5 ${i === 1 ? "bg-red text-white" : "bg-surface-2"}`}
                    style={{ height: heights[i] }}
                  >
                    <div className={`font-black tracking-tighter ${i === 1 ? "text-[44px] leading-none" : "text-[30px] leading-none"}`} style={{ color: i === 1 ? "#fff" : medal[i] }}>
                      {p.rank}
                    </div>
                    <div className={`text-xs font-bold ${i === 1 ? "opacity-90" : "text-muted"}`}>{p.main}</div>
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
                  <div className="w-7 text-center text-xl font-black text-dim">{r.rank}</div>
                  <Avatar name={r.name} color={r.color} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-extrabold truncate">{r.name}</span>
                      {r.streak >= 3 && <Pill tone="amber">{t.ranking.onFire}</Pill>}
                      {r.gamesPlayed < 5 && <Pill>{t.ranking.newPlayer}</Pill>}
                    </div>
                    <div className="text-xs text-muted truncate">{r.sub}</div>
                  </div>
                  <div className="text-[22px] font-black tracking-tight">{r.main}</div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {seasons.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="eyebrow">{t.seasons.palmares}</div>
          {seasons.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface border border-border px-3.5 py-2.5">
              <Icon name="crown" size={18} className="text-gold" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold capitalize truncate">{formatMonth(monthDate(s.month), locale)}</div>
                <div className="text-[11px] text-muted">{fmt(t.seasons.closedOn, { n: s.matches })}</div>
              </div>
              {s.winner && (
                <Link href={`/profile/${s.winner.id}`} className="flex items-center gap-2">
                  <span className="text-sm font-extrabold">{s.winner.name}</span>
                  <Avatar name={s.winner.name} color={s.winner.color} size={28} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
