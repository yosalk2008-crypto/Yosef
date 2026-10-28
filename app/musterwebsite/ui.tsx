export function PageHead({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fs">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {text && <p className="mt-4 text-lg leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

export function Stars({ className = "" }: { className?: string }) {
  return (
    <span className={`tracking-[0.15em] text-amber-400 ${className}`} aria-label="5 von 5 Sternen">
      ★★★★★
    </span>
  );
}
