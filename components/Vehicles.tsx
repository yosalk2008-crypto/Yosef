export function CarSvg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 80" className={className} aria-hidden>
      <CarPath />
    </svg>
  );
}

export function BikeSvg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={className} aria-hidden>
      <circle cx="45" cy="75" r="28" fill="none" stroke="#111318" strokeWidth="9" />
      <circle cx="155" cy="75" r="28" fill="none" stroke="#111318" strokeWidth="9" />
      <path d="M45 75l40-30h45l25 30M130 45l15-22h18M85 45l-20-5" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 42c10-10 40-10 52 0" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function TrailerSvg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 90" className={className} aria-hidden>
      <g transform="translate(0 4)">
        <CarPath />
      </g>
      <path d="M205 66h12" stroke="#111318" strokeWidth="4" />
      <rect x="215" y="30" width="80" height="38" rx="5" fill="currentColor" opacity=".75" />
      <circle cx="255" cy="72" r="11" fill="#111318" />
      <circle cx="255" cy="72" r="4" fill="#d1d5db" />
    </svg>
  );
}

function CarPath() {
  return (
    <>
      <path d="M10 52c0-6 4-10 10-11l30-4 22-18c3-2 6-3 10-3h46c4 0 7 1 10 4l18 17 22 3c6 1 10 5 10 11v9c0 3-2 5-5 5H15c-3 0-5-2-5-5v-8z" fill="currentColor" />
      <path d="M80 22h28v16H62zM114 22h24c2 0 3 1 4 2l12 14h-40z" fill="#fff" opacity=".55" />
      <circle cx="52" cy="64" r="13" fill="#111318" />
      <circle cx="52" cy="64" r="5" fill="#d1d5db" />
      <circle cx="150" cy="64" r="13" fill="#111318" />
      <circle cx="150" cy="64" r="5" fill="#d1d5db" />
    </>
  );
}
