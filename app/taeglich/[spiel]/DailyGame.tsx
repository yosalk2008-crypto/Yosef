"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { clearResult, isValidDay, utcDate, type GameKey } from "@/lib/daily";

const loading = () => (
  <div className="mx-auto max-w-3xl px-4 pt-10">
    <div className="h-12 w-64 animate-pulse rounded-xl bg-line" />
    <div className="mt-6 h-80 animate-pulse rounded-2xl bg-line" />
  </div>
);

const MAP: Record<Exclude<GameKey, "tiefgang">, React.ComponentType> = {
  laenderjagd: dynamic(() => import("@/components/games/Laenderjagd").then((m) => m.Laenderjagd), { ssr: false, loading }),
  massstab: dynamic(() => import("@/components/games/Massstab").then((m) => m.Massstab), { ssr: false, loading }),
  viererbande: dynamic(() => import("@/components/games/Viererbande").then((m) => m.Viererbande), { ssr: false, loading }),
  "hoeher-tiefer": dynamic(() => import("@/components/games/HoeherTiefer").then((m) => m.HoeherTiefer), { ssr: false, loading }),
  spitzenplatz: dynamic(() => import("@/components/games/Spitzenplatz").then((m) => m.Spitzenplatz), { ssr: false, loading }),
  farbecht: dynamic(() => import("@/components/games/Farbecht").then((m) => m.Farbecht), { ssr: false, loading }),
  grenzgang: dynamic(() => import("@/components/games/Grenzgang").then((m) => m.Grenzgang), { ssr: false, loading }),
  zeitreise: dynamic(() => import("@/components/games/Zeitreise").then((m) => m.Zeitreise), { ssr: false, loading }),
};

export function DailyGame({ game }: { game: Exclude<GameKey, "tiefgang"> }) {
  const C = MAP[game];
  return (
    <GameBoundary game={game}>
      <C />
    </GameBoundary>
  );
}

/**
 * If a saved game no longer fits today's puzzle (e.g. after a data update), the game would crash.
 * Then the saved state for that day is dropped and the puzzle starts fresh instead of showing an error page.
 */
class GameBoundary extends Component<{ game: GameKey; children: ReactNode }, { failed: number; pending: boolean }> {
  state = { failed: 0, pending: false };
  static getDerivedStateFromError() {
    return { pending: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    const p = new URLSearchParams(window.location.search).get("tag");
    clearResult(isValidDay(p) ? p : utcDate(), this.props.game);
    this.setState((s) => ({ failed: s.failed + 1, pending: false }));
  }
  render() {
    if (this.state.pending) return null;
    if (this.state.failed > 1)
      return (
        <div className="mx-auto max-w-xl px-4 pt-12 text-center">
          <h1 className="text-2xl font-semibold">Das Spiel konnte nicht geladen werden</h1>
          <p className="mt-2 text-muted">Lade die Seite neu. Wenn es weiter nicht klappt, probier ein anderes Spiel.</p>
          <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
        </div>
      );
    return (
      <div key={this.state.failed}>
        {this.state.failed === 1 && (
          <p className="mx-auto mt-4 max-w-3xl rounded-2xl bg-brand-soft px-4 py-3 text-[15px] font-semibold">
            Dein gespeicherter Spielstand passte nach einem Update nicht mehr zum Rätsel und wurde zurückgesetzt.
          </p>
        )}
        {this.props.children}
      </div>
    );
  }
}
