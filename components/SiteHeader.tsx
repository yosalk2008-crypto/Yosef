import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Geografik – Startseite">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[15px] font-medium" aria-label="Hauptnavigation">
          <Link href="/#tagesspiele" className="rounded-lg px-3 py-2 hover:bg-surface">
            Täglich
          </Link>
          <Link href="/quiz" className="rounded-lg px-3 py-2 hover:bg-surface">
            Quizze
          </Link>
          <Link href="/archiv" className="rounded-lg px-3 py-2 hover:bg-surface">
            Archiv
          </Link>
        </nav>
      </div>
    </header>
  );
}
