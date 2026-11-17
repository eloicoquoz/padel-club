"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";
import { useT } from "@/lib/i18n/client";

export function BottomNav() {
  const path = usePathname();
  const { t } = useT();
  const items = [
    { href: "/", icon: "home" as const, label: t.nav.home, active: path === "/" || path.startsWith("/history") || path.startsWith("/challenges") },
    { href: "/ranking", icon: "ranking" as const, label: t.nav.ranking, active: path.startsWith("/ranking") },
    null,
    { href: "/sessions", icon: "calendar" as const, label: t.nav.sessions, active: path.startsWith("/sessions") || path.startsWith("/americano") },
    { href: "/profile", icon: "user" as const, label: t.nav.profile, active: path.startsWith("/profile") },
  ];
  return (
    <nav
      aria-label="Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="mx-auto max-w-md flex items-center justify-between px-4 pt-2.5 h-[68px]">
        {items.map((it, i) =>
          it ? (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              className={`flex flex-col items-center gap-1 w-14 text-[10px] font-bold ${it.active ? "text-red-text" : "text-[#8C8E99]"}`}
            >
              <Icon name={it.icon} size={24} />
              {it.label}
            </Link>
          ) : (
            <Link
              key={i}
              href="/match/new"
              aria-label={t.nav.newMatch}
              className="flex items-center justify-center w-[58px] h-[58px] -mt-8 rounded-full bg-red text-white shadow-[0_8px_24px_rgba(230,57,70,0.4)] active:scale-95 transition"
            >
              <Icon name="plus" size={28} />
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
