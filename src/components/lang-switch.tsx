"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import { LOCALES } from "@/lib/i18n";

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex gap-1 rounded-full bg-surface border border-border p-1 ${pending ? "opacity-60" : ""}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={`rounded-full font-extrabold uppercase ${compact ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs"} ${l === locale ? "bg-text text-bg" : "text-muted"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
