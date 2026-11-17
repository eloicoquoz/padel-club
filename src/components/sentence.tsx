"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Icon } from "./ui";

export function Sentence({ list, seed = 0 }: { list: string[]; seed?: number }) {
  const { t } = useT();
  const [i, setI] = useState(seed % Math.max(1, list.length));
  if (!list.length) return null;
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">{t.result.sentence}</div>
        <button
          type="button"
          onClick={() => setI((x) => (x + 1) % list.length)}
          className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-full border border-border-2 bg-bg text-muted text-[11px] font-extrabold"
        >
          <Icon name="refresh" size={14} />
          {t.result.another}
        </button>
      </div>
      <div className="text-[22px] font-extrabold leading-tight tracking-tight">{list[i]}</div>
    </div>
  );
}
