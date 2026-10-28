import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Firmengrafik – Startseite">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 shadow-lg shadow-brand/30">
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
          <path d="M20 46V18h22v6H27v6h13v6H27v10z" fill="#fff" />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Firmengrafik
      </span>
    </Link>
  );
}
