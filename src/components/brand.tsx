export function Ball({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Padel">
      <circle cx="32" cy="32" r="28" fill="#D4F53C" />
      <path d="M12 16c10 6 10 26 0 32M52 16c-10 6-10 26 0 32" stroke="#0B0B0D" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BrandHeader({ tagline, club, big = true }: { tagline?: string; club: string; big?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <Ball size={big ? 64 : 44} />
      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] font-bold tracking-[0.14em] uppercase text-red-text">{club}</div>
        <h1 className={`${big ? "text-[44px]" : "text-3xl"} leading-none font-black tracking-tighter`}>
          Padel
          <br />
          Club
        </h1>
        {tagline && <p className="mt-1.5 text-[15px] leading-snug text-muted">{tagline}</p>}
      </div>
    </div>
  );
}
