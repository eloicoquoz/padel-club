"use client";

import { useState } from "react";
import { BADGE_KEYS, type BadgeKey } from "@/lib/badges";
import { useT } from "@/lib/i18n/client";
import { Icon } from "./ui";

export function BadgeGrid({ earned }: { earned: BadgeKey[] }) {
  const { t } = useT();
  const set = new Set(earned);
  const [sel, setSel] = useState<BadgeKey>(earned[0] ?? BADGE_KEYS[0]);
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {BADGE_KEYS.map((k) => {
          const on = set.has(k);
          const active = k === sel;
          return (
            <button
              key={k}
              type="button"
              aria-label={t.badges[k].name}
              onClick={() => setSel(k)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border ${active ? "border-gold" : on ? "border-border" : "border-[#1C1D23]"} ${on ? "bg-surface" : "bg-[#0E0E11]"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${on ? "bg-amber-bg text-amber" : "bg-surface text-[#3A3B45]"}`}>
                <Icon name="star" size={20} />
              </div>
              <div className={`text-[10px] font-bold text-center leading-tight ${on ? "text-text" : "text-dim"}`}>{t.badges[k].name}</div>
            </button>
          );
        })}
      </div>
      <div className="rounded-[14px] bg-surface border border-border px-3.5 py-3 text-[13px] text-muted">
        <span className="font-extrabold text-text">{t.badges[sel].name}</span> — {t.badges[sel].desc}
      </div>
    </>
  );
}
