import Link from "next/link";
import type { MatchView } from "@/lib/services/matches";
import type { Dict, Locale } from "@/lib/i18n";
import { joinNames, relativeDay, formatTime } from "@/lib/i18n";
import { Pill } from "./ui";

export function tagLabel(tag: string, t: Dict): { label: string; tone: "amber" | "red" | "blue" | "green" | "muted" } | null {
  switch (tag) {
    case "giant_killer":
      return { label: t.badges.giant_killer.name, tone: "amber" };
    case "bagel":
      return { label: t.badges.bagel_given.name, tone: "red" };
    case "upset":
      return { label: t.news.match_upset.split("!")[0] + "!", tone: "blue" };
    case "super_tiebreak":
      return { label: t.badges.super_tiebreak.name, tone: "blue" };
    case "revenge":
      return { label: t.badges.revenge.name, tone: "green" };
    default:
      return null;
  }
}

export function MatchRow({ m, meId, t, locale, showDate = true }: { m: MatchView; meId?: string; t: Dict; locale: Locale; showDate?: boolean }) {
  const inA = meId ? m.a.some((p) => p.id === meId) : false;
  const inB = meId ? m.b.some((p) => p.id === meId) : false;
  const involved = inA || inB;
  const won = (inA && m.winner === "A") || (inB && m.winner === "B");
  const bar = involved ? (won ? "var(--color-green)" : "var(--color-red-text)") : "var(--color-dim)";
  const myDelta = inA ? m.eloDeltaA : inB ? m.eloDeltaB : null;
  const tag = m.tags.map((x) => tagLabel(x, t)).find(Boolean) ?? null;
  const aWon = m.winner === "A";
  return (
    <Link href={`/match/${m.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 border border-border active:bg-surface-2">
      <div className="w-1.5 h-11 rounded shrink-0" style={{ background: bar }} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="text-sm font-bold truncate">
          <span className={aWon ? "" : "text-muted"}>{joinNames(m.a.map((p) => p.name))}</span>
          <span className="text-dim text-xs font-bold"> {t.common.vs} </span>
          <span className={aWon ? "text-muted" : ""}>{joinNames(m.b.map((p) => p.name))}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {showDate && (
            <span>
              {relativeDay(m.playedAt, locale, t)} · {formatTime(m.playedAt, locale)}
            </span>
          )}
          {tag && <Pill tone={tag.tone}>{tag.label}</Pill>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="text-[15px] font-black tracking-tight">{m.score}</div>
        <div className="text-xs font-extrabold" style={{ color: bar }}>
          {myDelta !== null ? (myDelta > 0 ? `+${myDelta}` : `${myDelta}`) : `±${Math.abs(m.eloDeltaA)}`}
        </div>
      </div>
    </Link>
  );
}
