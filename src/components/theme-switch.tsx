"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setThemeAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import { THEMES, type Theme } from "@/lib/theme";

export function ThemeSwitch({ initial }: { initial: Theme }) {
  const { t } = useT();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(initial);
  const [, start] = useTransition();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const labels: Record<Theme, string> = { light: t.theme.light, dark: t.theme.dark, auto: t.theme.auto };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="label">{t.theme.label}</div>
      <div className="flex gap-1 bg-bg p-1 rounded-full">
        {THEMES.map((th) => (
          <button
            key={th}
            type="button"
            onClick={() => {
              setTheme(th);
              start(async () => {
                await setThemeAction(th);
                router.refresh();
              });
            }}
            className={`h-8 px-3 rounded-full text-xs font-extrabold ${th === theme ? "bg-text text-bg" : "text-muted"}`}
          >
            {labels[th]}
          </button>
        ))}
      </div>
    </div>
  );
}
