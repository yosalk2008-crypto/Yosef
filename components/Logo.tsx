export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0b1220" />
        <circle cx="32" cy="32" r="17" fill="none" stroke="#2dd4bf" strokeWidth="4" />
        <path d="M15 32h34M32 15c-6 5-8 11-8 17s2 12 8 17c6-5 8-11 8-17s-2-12-8-17z" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="46" cy="18" r="6" fill="#fbbf24" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>Geografik</span>
    </span>
  );
}
