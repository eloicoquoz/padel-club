import { sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getDict, fmt, formatDate, formatMonth, formatTime, isLocale, joinNames, relativeDay, type Locale } from "@/lib/i18n";
import { getRanking } from "@/lib/services/users";
import { getMatches } from "@/lib/services/matches";
import { upcomingSessions } from "@/lib/services/sessions";
import { openChallenges } from "@/lib/services/challenges";
import { renderRecentNews } from "@/lib/services/events";
import { listSeasons, monthDate, monthKey, monthStandings } from "@/lib/services/seasons";
import { Avatar, AvatarStack, Icon, Pill } from "@/components/ui";
import { tagLabel } from "@/components/match-row";
import { Ball } from "@/components/brand";
import { TvClock } from "@/components/tv-clock";

export const dynamic = "force-dynamic";

export default async function TvPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : isLocale(process.env.TEAMS_LANG) ? process.env.TEAMS_LANG : "fr";
  const t = getDict(locale);
  const db = await getDb();
  const [ranking, recent, sessions, challenges, news, monthStats, seasons, month] = await Promise.all([
    getRanking(),
    getMatches({ limit: 6, sinceDays: 7 }),
    upcomingSessions(1),
    openChallenges(3),
    renderRecentNews(locale, 10),
    db
      .select({
        n: sql<number>`count(*)::int`,
        bagels: sql<number>`count(*) filter (where ${schema.matches.tags} ? 'bagel')::int`,
      })
      .from(schema.matches)
      .where(sql`date_trunc('month', ${schema.matches.playedAt}) = date_trunc('month', now())`),
    listSeasons(1),
    monthStandings(monthKey()),
  ]);
  // Roi/Reine : le dernier mois clôturé s'il existe, sinon le leader du mois en cours.
  const lastSeason = seasons[0]?.winner ? seasons[0] : null;
  const kingUser = lastSeason?.winner ?? month.rows[0]?.user ?? ranking[0] ?? null;
  const kingLabel = lastSeason ? formatMonth(monthDate(lastSeason.month), locale) : formatMonth(new Date(), locale);
  const kingSub = lastSeason
    ? `${(lastSeason.standings[0]?.delta ?? 0) > 0 ? "+" : ""}${lastSeason.standings[0]?.delta ?? 0} Elo · ${lastSeason.standings[0]?.wins ?? 0} ${t.common.wins} · ${lastSeason.standings[0]?.losses ?? 0} ${t.common.losses}`
    : month.rows[0]
      ? `${month.rows[0].delta > 0 ? "+" : ""}${month.rows[0].delta} Elo · ${month.rows[0].wins} ${t.common.wins} · ${month.rows[0].losses} ${t.common.losses}`
      : "";
  const top10 = ranking.slice(0, 10);
  const matchOfDay = recent[0];
  const next = sessions[0];
  const bestStreak = [...ranking].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const lastMonth = new Date();
  lastMonth.setDate(0);
  const newsText = news.map((n) => n.text);
  const ticker = newsText.length ? [...newsText, ...newsText] : [t.tv.noMatchYet, t.tv.noMatchYet];

  return (
    <div data-theme="dark" className="relative w-screen h-screen overflow-hidden bg-bg text-text flex flex-col" style={{ fontSize: "min(1.25vw, 0.9vh * 1.78)" }}>
      <div className="pointer-events-none absolute -top-[16%] -right-[10%] w-[47%] aspect-square rounded-full bg-red opacity-[0.12]" />
      <div className="pointer-events-none absolute -bottom-[37%] -left-[10%] w-[42%] aspect-square rounded-full bg-blue opacity-[0.10]" />

      <header className="relative flex items-center justify-between px-[2.9vw] pt-[3.7vh]">
        <div className="flex items-center gap-[1.1vw]">
          <Ball size={64} />
          <div>
            <div className="text-[0.9em] font-extrabold tracking-[0.18em] uppercase text-red-text">{t.app.club}</div>
            <div className="text-[2.4em] font-black tracking-tighter leading-none">{t.app.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
          <div className="text-right">
            <div className="text-[0.8em] font-bold tracking-[0.14em] uppercase text-muted">{t.tv.season}</div>
            <div className="text-[1.5em] font-black capitalize">{formatMonth(new Date(), locale)}</div>
          </div>
          <div className="text-right">
            <div className="text-[0.8em] font-bold tracking-[0.14em] uppercase text-muted">{formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "short" })}</div>
            <div className="text-[1.5em] font-black">
              <TvClock />
            </div>
          </div>
        </div>
      </header>

      <main className="relative grid gap-[1.5vw] px-[2.9vw] pt-[3vh] flex-1 min-h-0" style={{ gridTemplateColumns: "29% 1fr 25%" }}>
        {/* Classement */}
        <section className="flex flex-col gap-[0.7vw] rounded-[1.5vw] bg-surface border border-border p-[1.4vw] min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.4em] font-black">{t.tv.ranking}</h2>
            <div className="text-[0.8em] font-bold text-muted">
              Elo · {ranking.length} {t.common.players}
            </div>
          </div>
          <div className="flex flex-col gap-[0.4vw] min-h-0 overflow-hidden">
            {top10.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-[0.8vw] rounded-[0.8vw] px-[0.8vw] py-[0.45vw] border"
                style={{ background: r.rank <= 3 ? "var(--color-surface-2)" : "var(--color-bg)", borderColor: r.rank === 1 ? "var(--color-gold)" : "#1C1D23" }}
              >
                <div className="w-[1.8vw] text-center text-[1.3em] font-black" style={{ color: r.rank === 1 ? "#FFC53D" : r.rank === 2 ? "#C0C0C0" : r.rank === 3 ? "#CD7F32" : "#5C5E68" }}>
                  {r.rank}
                </div>
                <Avatar name={r.name} color={r.color} size={44} />
                <div className="flex-1 flex items-center gap-[0.5vw] min-w-0">
                  <span className="text-[1.15em] font-extrabold truncate">{r.name}</span>
                  {r.streak >= 3 && <Pill tone="amber">{fmt(t.ranking.streakShort, { n: r.streak })}</Pill>}
                </div>
                <div className="text-[1.25em] font-black">{r.elo}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Résultats */}
        <section className="flex flex-col gap-[1.2vw] min-h-0">
          <div className="relative overflow-hidden rounded-[1.5vw] bg-red text-white p-[1.5vw] flex flex-col gap-[0.7vw]">
            <div className="pointer-events-none absolute -right-16 -top-20 w-[300px] h-[300px] rounded-full bg-white opacity-[0.08]" />
            <div className="flex items-center gap-[0.5vw] text-[0.8em] font-extrabold tracking-[0.16em] uppercase opacity-90">
              <div className="live w-[0.5vw] h-[0.5vw] rounded-full bg-white" />
              {t.tv.matchOfDay}
              {matchOfDay?.tags.includes("giant_killer") && <span>· {t.badges.giant_killer.name}</span>}
            </div>
            {matchOfDay ? (
              <div className="flex items-center justify-between gap-[1vw]">
                <div className="flex items-center gap-[0.9vw]">
                  <AvatarStack people={matchOfDay.winner === "A" ? matchOfDay.a : matchOfDay.b} size={72} />
                  <div>
                    <div className="text-[1.35em] font-black tracking-tight leading-tight">{joinNames((matchOfDay.winner === "A" ? matchOfDay.a : matchOfDay.b).map((p) => p.name))}</div>
                    <div className="text-[0.9em] font-bold opacity-85">+{Math.abs(matchOfDay.eloDeltaA)} Elo</div>
                  </div>
                </div>
                <div className="text-[2.8em] font-black tracking-tighter leading-none text-center whitespace-nowrap shrink-0">
                  {matchOfDay.winner === "A" ? matchOfDay.score : matchOfDay.sets.map(([a, b]) => `${b}-${a}`).join(" · ")}
                </div>
                <div className="flex items-center gap-[0.9vw] opacity-80">
                  <div className="text-right">
                    <div className="text-[1.35em] font-black tracking-tight leading-tight">{joinNames((matchOfDay.winner === "A" ? matchOfDay.b : matchOfDay.a).map((p) => p.name))}</div>
                    <div className="text-[0.9em] font-bold opacity-85">-{Math.abs(matchOfDay.eloDeltaA)} Elo</div>
                  </div>
                  <AvatarStack people={matchOfDay.winner === "A" ? matchOfDay.b : matchOfDay.a} size={72} />
                </div>
              </div>
            ) : (
              <div className="text-[1.4em] font-extrabold">{t.tv.noMatchYet}</div>
            )}
          </div>

          <div className="flex flex-col gap-[0.6vw] rounded-[1.5vw] bg-surface border border-border p-[1.3vw] flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.4em] font-black">{t.tv.lastResults}</h2>
              <div className="text-[0.8em] font-bold text-muted">{fmt(t.tv.lastDays, { n: recent.length })}</div>
            </div>
            {recent.slice(1, 6).map((m) => {
              const aWon = m.winner === "A";
              const tag = m.tags.map((x) => tagLabel(x, t)).find(Boolean) ?? null;
              return (
                <div key={m.id} className="grid items-center gap-[0.6vw] rounded-[0.8vw] bg-bg px-[0.9vw] py-[0.5vw]" style={{ gridTemplateColumns: "6.5vw 1fr 10vw 1fr 6.5vw" }}>
                  <div className="text-[0.8em] font-bold text-muted truncate">
                    {relativeDay(m.playedAt, locale, t)} {formatTime(m.playedAt, locale)}
                  </div>
                  <div className={`text-[1em] font-extrabold text-right leading-tight ${aWon ? "" : "text-[#6B6D78]"}`}>{joinNames(m.a.map((p) => p.name))}</div>
                  <div className="text-[1.15em] font-black text-center whitespace-nowrap">{m.score}</div>
                  <div className={`text-[1em] font-extrabold leading-tight ${aWon ? "text-[#6B6D78]" : ""}`}>{joinNames(m.b.map((p) => p.name))}</div>
                  <div className="flex justify-end">{tag && <Pill tone={tag.tone}>{tag.label}</Pill>}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Infos */}
        <aside className="flex flex-col gap-[1vw] min-h-0">
          <div className="flex flex-col gap-[0.5vw] rounded-[1.5vw] bg-surface border border-green p-[1.3vw]">
            <div className="flex items-center justify-between">
              <div className="text-[0.8em] font-extrabold tracking-[0.14em] uppercase text-green">{t.tv.nextSession}</div>
              {next && (
                <div className="text-[0.9em] font-black text-green">
                  {next.players.length}
                  <span className="text-dim">/{next.max}</span>
                </div>
              )}
            </div>
            {next ? (
              <>
                <div className="text-[2em] font-black tracking-tight leading-none capitalize">
                  {formatDate(next.startsAt, locale, { weekday: "long" })} {formatTime(next.startsAt, locale)}
                </div>
                <div className="text-[0.9em] text-muted">
                  {next.location ? `${next.location} · ` : ""}
                  {fmt(t.sessions.courts, { n: next.courts })} · {fmt(t.sessions.minutes, { n: next.durationMin })}
                </div>
                <div className="flex items-center gap-[0.7vw]">
                  <AvatarStack people={next.players} size={40} max={5} />
                  {next.max - next.players.length > 0 && <div className="text-[0.85em] font-bold text-muted">{fmt(t.tv.freePlaces, { n: next.max - next.players.length })}</div>}
                </div>
              </>
            ) : (
              <div className="text-[1em] text-muted">{t.sessions.none}</div>
            )}
          </div>

          {kingUser && (
            <div className="flex items-center gap-[1vw] rounded-[1.5vw] bg-amber-bg border border-[#7C3F10] p-[1.2vw]">
              <div className="relative shrink-0">
                <Avatar name={kingUser.name} color={kingUser.color} size={76} ring="#FFC53D" />
                <Icon name="crown" size={36} className="text-gold absolute -top-5 left-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[0.8em] font-extrabold tracking-[0.14em] uppercase text-amber">{fmt(t.tv.kingOfMonth, { month: kingLabel })}</div>
                <div className="text-[1.7em] font-black tracking-tight leading-tight truncate">{kingUser.name}</div>
                <div className="text-[0.85em] text-muted">{kingSub}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-[0.5vw] rounded-[1.5vw] bg-surface border border-blue p-[1.2vw]">
            <div className="text-[0.8em] font-extrabold tracking-[0.14em] uppercase text-blue-text">{t.tv.challenges}</div>
            {challenges.length === 0 && <div className="text-[0.9em] text-muted">{t.challenges.none}</div>}
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-[0.5vw]">
                <div className="text-[1em] font-extrabold truncate">
                  {joinNames(c.from.map((p) => p.name))} <span className="text-dim font-bold">vs</span> {joinNames(c.to.map((p) => p.name))}
                </div>
                <Pill tone={c.status === "accepted" ? "green" : "amber"}>{c.status === "accepted" ? t.challenges.accepted : t.challenges.pending}</Pill>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-[0.6vw] h-[14vh]">
            <div className="flex flex-col items-center justify-center gap-[0.2vw] rounded-[1.2vw] bg-surface border border-border p-[0.5vw] text-center">
              <div className="text-[2.2em] font-black leading-none">{monthStats[0]?.n ?? 0}</div>
              <div className="text-[0.65em] font-bold uppercase tracking-wider text-muted">{t.tv.matchesMonth}</div>
            </div>
            <div className="flex flex-col items-center justify-center gap-[0.2vw] rounded-[1.2vw] bg-surface border border-border p-[0.5vw] text-center">
              <div className="text-[2.2em] font-black leading-none text-amber">{bestStreak?.bestStreak ?? 0}</div>
              <div className="text-[0.65em] font-bold uppercase tracking-wider text-muted">{fmt(t.tv.bestStreak, { name: bestStreak?.name ?? "—" })}</div>
            </div>
            <div className="flex flex-col items-center justify-center gap-[0.2vw] rounded-[1.2vw] bg-surface border border-border p-[0.5vw] text-center">
              <div className="text-[2.2em] font-black leading-none text-red-text">{monthStats[0]?.bagels ?? 0}</div>
              <div className="text-[0.65em] font-bold uppercase tracking-wider text-muted">{t.tv.bagels}</div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="relative flex items-center h-[7.8vh] mt-[2.5vh] bg-text text-bg overflow-hidden">
        <div className="relative z-10 flex items-center h-full px-[1.7vw] bg-red text-white text-[1em] font-black tracking-[0.16em] uppercase shrink-0">{t.news.title}</div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker text-[1.3em] font-bold">
            {ticker.map((x, i) => (
              <span key={i} className="flex items-center gap-16">
                <span>{x}</span>
                <span className="text-red">●</span>
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
