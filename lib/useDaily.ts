"use client";

import { useCallback, useEffect, useState } from "react";
import { getResult, saveResult, useDay, type DailyResult, type GameKey } from "./daily";
import { mpLoad, mpSave, useMpDaily } from "./mpDaily";

/**
 * Loads the saved progress for a daily game and returns helpers to persist it.
 * `state` is whatever the game needs to restore an unfinished or finished round.
 * Inside a multiplayer room the day comes from the room and progress is kept separately.
 */
export function useDaily<S>(game: GameKey) {
  const mp = useMpDaily();
  const real = useDay();
  const day = mp ? mp.day : real.day;
  const isToday = mp ? false : real.isToday;
  const ready = mp ? true : real.ready;
  const mpKey = mp ? `${game}:${mp.storeKey}` : "";
  const [saved, setSaved] = useState<DailyResult | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setSaved(mpKey ? mpLoad(mpKey) : getResult(day, game));
    setLoaded(true);
  }, [ready, day, game, mpKey]);

  const persist = useCallback(
    (r: Omit<DailyResult, "state"> & { state: S }) => {
      if (mpKey) {
        mpSave(mpKey, r);
        if (r.done) mp?.onResult(r);
      } else saveResult(day, game, r);
      setSaved(r);
    },
    [day, game, mpKey, mp]
  );

  return { day, isToday, loaded, saved: saved as (DailyResult & { state?: S }) | undefined, persist };
}
