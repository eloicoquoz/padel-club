import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";

export function Avatar({ name, color, size = 40, ring, className = "" }: { name: string; color: string; size?: number; ring?: string; className?: string }) {
  const fs = Math.round(size * 0.36);
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full font-extrabold text-bg shrink-0 ${className}`}
      style={{ width: size, height: size, background: color, fontSize: fs, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ people, size = 30, max = 4 }: { people: { name: string; color: string }[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex">
      {shown.map((p, i) => (
        <div key={i} className="rounded-full border-2 border-surface" style={{ marginLeft: i ? -size * 0.28 : 0 }}>
          <Avatar name={p.name} color={p.color} size={size - 4} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className="flex items-center justify-center rounded-full border-2 border-surface bg-border-2 text-text font-extrabold"
          style={{ width: size, height: size, marginLeft: -size * 0.28, fontSize: size * 0.36 }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "red" | "blue" | "green" | "amber" }) {
  const tones: Record<string, string> = {
    muted: "bg-surface-2 text-muted",
    red: "bg-red-bg text-red-text",
    blue: "bg-blue-bg text-blue-text",
    green: "bg-green-bg text-green",
    amber: "bg-amber-bg text-amber",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, eyebrow, back, right }: { title: string; eyebrow?: string; back?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <Link href={back} aria-label="Back" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
            <Icon name="back" size={18} />
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-red-text">{eyebrow}</div>}
          <h1 className="text-[28px] leading-tight font-black tracking-tight truncate first-letter:uppercase">{title}</h1>
        </div>
      </div>
      {right}
    </div>
  );
}

export function StatTile({ value, label, tone }: { value: ReactNode; label: string; tone?: "amber" }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 py-3 px-1 rounded-2xl ${tone === "amber" ? "bg-amber-bg" : "bg-surface"}`}>
      <div className={`text-xl font-black leading-none ${tone === "amber" ? "text-amber" : ""}`}>{value}</div>
      <div className={`text-[10px] font-bold uppercase tracking-wider text-center ${tone === "amber" ? "text-amber" : "text-muted"}`}>{label}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-muted text-sm py-8">{children}</div>;
}

type IconName = "home" | "ranking" | "plus" | "calendar" | "user" | "back" | "close" | "racket" | "flame" | "crown" | "external" | "shuffle" | "star" | "settings" | "refresh" | "trophy" | "check";

export function Icon({ name, size = 24, className = "" }: { name: IconName; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, className };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" /></svg>;
    case "ranking":
      return <svg {...common}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>;
    case "plus":
      return <svg {...common} strokeWidth={2.6}><path d="M12 5v14M5 12h14" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case "back":
      return <svg {...common} strokeWidth={2.4}><path d="M15 5l-7 7 7 7" /></svg>;
    case "close":
      return <svg {...common} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "racket":
      return <svg {...common}><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l-2 2M6.5 17.5 3 21" /></svg>;
    case "flame":
      return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-4 2-7 2-10z" /></svg>;
    case "crown":
      return <svg {...common} viewBox="0 0 28 22" fill="currentColor" stroke="none"><path d="M2 20h24l-2-12-6 5-4-9-4 9-6-5z" /></svg>;
    case "external":
      return <svg {...common}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
    case "shuffle":
      return <svg {...common}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;
    case "star":
      return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 15.4 6.7 18.1l1-5.8L3.5 8.2l5.9-.9z" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case "refresh":
      return <svg {...common} strokeWidth={2.4}><path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" /></svg>;
    case "trophy":
      return <svg {...common}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>;
    case "check":
      return <svg {...common} strokeWidth={2.6}><path d="M5 13l4 4L19 7" /></svg>;
  }
}
