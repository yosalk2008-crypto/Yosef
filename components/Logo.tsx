export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <circle cx="24" cy="26" r="19" fill="#2c2a35" />
        <circle cx="24" cy="24" r="19" fill="#78b2ef" stroke="#2c2a35" strokeWidth="3" />
        <path d="M12 17c4-3 9-1 9 3s-6 3-6 7-4 4-6 1c-1-4 0-8 3-11zM27 10c5 1 10 4 12 10-3 1-5-1-7 1s0 6-3 7-4-3-5-6 0-7 3-12zM30 33c3-1 6 0 7 2-2 3-5 5-9 6 0-3 0-6 2-8z" fill="#9fd06f" stroke="#2c2a35" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M33 4l1.6 3.4L38 9l-3.4 1.6L33 14l-1.6-3.4L28 9l3.4-1.6z" fill="#f3d272" stroke="#2c2a35" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span className={`font-display text-[26px] font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>Geografik</span>
    </span>
  );
}
