"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ChallengeView } from "@/lib/services/challenges";
import { respondChallengeAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { fmt, joinNames } from "@/lib/i18n";
import { AvatarStack, Pill } from "./ui";

export function ChallengeCard({ c, meId, direction }: { c: ChallengeView; meId: string; direction: "received" | "sent" }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const canRespond = direction === "received" && c.status === "pending" && (c.to1 === meId || c.to2 === meId);
  const statusTone = c.status === "accepted" ? "green" : c.status === "declined" ? "muted" : c.status === "played" ? "blue" : "amber";
  const statusLabel = c.status === "accepted" ? t.challenges.accepted : c.status === "declined" ? t.challenges.declined : c.status === "played" ? t.challenges.played : t.challenges.pending;
  const other = direction === "received" ? c.from : c.to;
  return (
    <div className={`card flex flex-col gap-3 ${c.status === "pending" && direction === "received" ? "border-blue" : ""}`}>
      <div className="flex items-center gap-2.5">
        <AvatarStack people={other} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold truncate">{joinNames(other.map((p) => p.name))}</div>
          <div className="text-xs text-muted truncate">
            {direction === "received" ? t.challenges.challengeYou : `${t.common.vs} ${joinNames(c.from.map((p) => p.name))}`}
          </div>
        </div>
        <Pill tone={statusTone as "green" | "muted" | "blue" | "amber"}>{statusLabel}</Pill>
      </div>
      {c.message && <div className="rounded-xl bg-bg px-3 py-2.5 text-[13px] italic text-muted border-l-[3px] border-l-blue">« {c.message} »</div>}
      {c.reply && <div className="text-xs text-muted text-right">— {c.reply}</div>}
      <div className="flex items-center justify-between gap-2">
        <Pill tone="blue">{fmt(t.challenges.stakes, { n: c.stakes })}</Pill>
        {canRespond ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => respondChallengeAction(c.id, "declined", t.challenges.declineReplies[Math.floor(Math.random() * t.challenges.declineReplies.length)]))}
              className="btn btn-sm bg-transparent border border-border-2 text-muted"
            >
              {t.challenges.decline}
            </button>
            <button type="button" disabled={pending} onClick={() => start(() => respondChallengeAction(c.id, "accepted"))} className="btn btn-sm bg-text text-bg">
              {t.challenges.accept}
            </button>
          </div>
        ) : c.status === "accepted" ? (
          <Link href={`/match/new?challengeId=${c.id}`} className="btn btn-sm bg-red text-white">
            {t.challenges.recordMatch}
          </Link>
        ) : c.status === "played" && c.matchId ? (
          <Link href={`/match/${c.matchId}`} className="text-xs font-bold text-muted">
            {t.common.open} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
