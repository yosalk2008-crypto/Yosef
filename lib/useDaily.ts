"use client";

import { useCallback, useEffect, useState } from "react";
import { getResult, saveResult, useDay, type DailyResult, type GameKey } from "./daily";

/**
 * Loads the saved progress for a daily game and returns helpers to persist it.
 * `state` is whatever the game needs to restore an unfinished or finished round.
 */
export function useDaily<S>(game: GameKey) {
  const { day, isToday, ready } = useDay();
  const [saved, setSaved] = useState<DailyResult | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setSaved(getResult(day, game));
    setLoaded(true);
  }, [ready, day, game]);

  const persist = useCallback(
    (r: Omit<DailyResult, "state"> & { state: S }) => {
      saveResult(day, game, r);
      setSaved(r);
    },
    [day, game]
  );

  return { day, isToday, loaded, saved: saved as (DailyResult & { state?: S }) | undefined, persist };
}
