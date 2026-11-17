"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Horloge live + rafraîchissement automatique des données toutes les 60 s. */
export function TvClock() {
  const router = useRouter();
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Intl.DateTimeFormat("fr-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" }).format(new Date()));
    tick();
    const i = setInterval(tick, 1000);
    const r = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(i);
      clearInterval(r);
    };
  }, [router]);
  return <span suppressHydrationWarning>{now}</span>;
}
