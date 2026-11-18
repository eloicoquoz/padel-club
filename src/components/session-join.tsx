"use client";

import { useTransition } from "react";
import { joinSessionAction, leaveSessionAction } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import { Icon } from "./ui";

export function JoinButton({ sessionId, joined, full, compact = false }: { sessionId: string; joined: boolean; full: boolean; compact?: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const disabled = pending || (!joined && full);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => start(() => (joined ? leaveSessionAction(sessionId) : joinSessionAction(sessionId)))}
      className={`btn whitespace-nowrap shrink-0 ${compact ? "h-9 px-3 text-xs rounded-xl" : "h-11 text-[15px] rounded-[14px]"} ${joined ? "bg-green-bg text-green" : "bg-text text-bg"} ${pending ? "opacity-60" : ""}`}
    >
      {joined && <Icon name="check" size={16} />}
      {joined ? (compact ? t.sessions.joinedShort : t.sessions.joined) : full ? t.sessions.full : t.sessions.join}
    </button>
  );
}
