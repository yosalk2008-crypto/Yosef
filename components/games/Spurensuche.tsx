"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPOTS, type Spot } from "@/lib/data/spurensuche";
import { SPURENSUCHE_ARCHIVE_DAYS, dayNumber, spurensucheInArchive } from "@/lib/daily";
import { spurensucheAllowed } from "@/lib/leaderboard";
import { distanceKm } from "@/lib/geo";
import { loadGoogleMaps } from "@/lib/gmaps";
import { makeRng } from "@/lib/rng";
import { useDaily } from "@/lib/useDaily";
import { GameShell, ResultCard } from "../GameShell";
import { SolutionRow, Solutions } from "../Solutions";
import { useLang, useT } from "@/lib/i18n";
import { ALL_COUNTRIES } from "@/lib/data/countries";
import { exo } from "@/lib/data/exonyms";

const ROUNDS = 5;
const MAX = 100;

type Target = { pano: string; lat: number; lng: number; spot: number; heading: number };
type S = { targets: Target[]; guesses: [number, number][] };

/** Points fall off with distance: 100 km ≈ 94, 500 km ≈ 72, 1.000 km ≈ 51, 3.000 km ≈ 14. */
const points = (km: number) => (km < 0.15 ? MAX : Math.round(MAX * Math.exp(-km / 1500)));
const emoji = (p: number) => (p >= 90 ? "🟩" : p >= 60 ? "🟨" : p >= 25 ? "🟧" : "🟥");
const fmtKm = (km: number, lang: "de" | "en" = "de") => (km < 1 ? `${Math.round(km * 1000)} m` : `${new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE").format(Math.round(km))} km`);
const COUNTRY_EN = new Map(ALL_COUNTRIES.map((c) => [c.n, c.nEn]));

/** Candidate spots for a day: 5 from different continents-ish order, plus fallbacks if a spot has no panorama. */
function plan(day: string): { order: number[]; headings: number[] } {
  const rng = makeRng(`${day}:spurensuche`);
  const order = rng.shuffle(SPOTS.map((_, i) => i)).slice(0, 25);
  return { order, headings: order.map(() => Math.floor(rng.next() * 360)) };
}

function findPanorama(sv: google.maps.StreetViewService, spot: Spot): Promise<{ pano: string; lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    sv.getPanorama(
      { location: { lat: spot[0], lng: spot[1] }, radius: 4000, sources: [google.maps.StreetViewSource.GOOGLE], preference: google.maps.StreetViewPreference.NEAREST },
      (data, status) => {
        const loc = data?.location;
        if (status === google.maps.StreetViewStatus.OK && loc?.pano && loc.latLng) resolve({ pano: loc.pano, lat: loc.latLng.lat(), lng: loc.latLng.lng() });
        else resolve(null);
      }
    );
  });
}

export function Spurensuche() {
  const lang = useLang();
  const t = useT();
  const { day, isToday, loaded, saved, persist } = useDaily<S>("spurensuche");
  const { order, headings } = useMemo(() => plan(day), [day]);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [local, setLocal] = useState<[number, number][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<"archiv" | "wartung" | null>(null);
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const svEl = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const pano = useRef<google.maps.StreetViewPanorama | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlays = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const guessMarker = useRef<google.maps.Marker | null>(null);
  const revealRef = useRef<number | null>(null);
  revealRef.current = reveal;

  const guesses = local ?? saved?.state?.guesses ?? [];
  const round = guesses.length;
  const over = round >= ROUNDS;
  const idx = reveal ?? Math.min(round, ROUNDS - 1);
  const kms = targets ? guesses.map((g, i) => distanceKm([g[0], g[1]], [targets[i].lat, targets[i].lng])) : [];
  const pts = kms.map(points);
  const total = pts.reduce((a, b) => a + b, 0);

  // 1) load Google Maps and work out today's five panoramas (saved ones are reused, so the game stays the same after a reload)
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    (async () => {
      try {
        if (!spurensucheInArchive(day)) {
          if (alive) setBlocked("archiv");
          return;
        }
        const started = (saved?.state?.targets?.length ?? 0) > 0;
        if (!(await spurensucheAllowed(!started))) {
          if (alive) setBlocked("wartung");
          return;
        }
        await loadGoogleMaps(lang);
        const keep = saved?.state?.targets;
        if (keep?.length === ROUNDS) {
          if (alive) setTargets(keep);
          return;
        }
        const sv = new google.maps.StreetViewService();
        const found: Target[] = [];
        for (let k = 0; k < order.length && found.length < ROUNDS; k++) {
          const p = await findPanorama(sv, SPOTS[order[k]]);
          if (p && !found.some((f) => distanceKm([f.lat, f.lng], [p.lat, p.lng]) < 300)) found.push({ ...p, spot: order[k], heading: headings[k] });
        }
        if (!alive) return;
        if (found.length < ROUNDS) setError(t("Heute konnten nicht genug Orte geladen werden. Versuch es später noch einmal.", "Not enough places could be loaded today. Please try again later."));
        else setTargets(found);
      } catch {
        if (alive) setError(t("Google Street View konnte nicht geladen werden. Prüfe deine Internetverbindung und lade die Seite neu.", "Google Street View could not be loaded. Check your connection and reload the page."));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, day]);

  // 2) create panorama + guess map once
  useEffect(() => {
    if (!targets || !svEl.current || !mapEl.current || pano.current) return;
    pano.current = new google.maps.StreetViewPanorama(svEl.current, {
      addressControl: false,
      showRoadLabels: false,
      linksControl: true,
      panControl: false,
      zoomControl: true,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
      enableCloseButton: false,
      clickToGo: true,
      disableDefaultUI: false,
    });
    map.current = new google.maps.Map(mapEl.current, {
      center: { lat: 25, lng: 10 },
      zoom: 1,
      minZoom: 1,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
      draggableCursor: "crosshair",
      streetViewControl: false,
    });
    map.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (revealRef.current != null || !e.latLng) return;
      setGuess([e.latLng.lat(), e.latLng.lng()]);
    });
    setReady(true);
  }, [targets]);

  // 3) show the current round's panorama
  useEffect(() => {
    if (!ready || !targets || !pano.current) return;
    const t = targets[Math.min(round, ROUNDS - 1)];
    if (reveal == null && !over) {
      pano.current.setPano(t.pano);
      pano.current.setPov({ heading: t.heading, pitch: 0 });
      pano.current.setZoom(0);
      clearOverlays();
      map.current?.setCenter({ lat: 25, lng: 10 });
      map.current?.setZoom(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, round, reveal, targets]);

  // the pin you are about to place
  useEffect(() => {
    if (!ready || !map.current) return;
    if (!guess) {
      guessMarker.current?.setMap(null);
      guessMarker.current = null;
      return;
    }
    if (!guessMarker.current) guessMarker.current = new google.maps.Marker({ map: map.current, position: { lat: guess[0], lng: guess[1] }, title: t("Dein Tipp", "Your guess") });
    else guessMarker.current.setPosition({ lat: guess[0], lng: guess[1] });
  }, [guess, ready]);

  function clearOverlays() {
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
  }

  function showResult(rounds: number[]) {
    if (!map.current || !targets) return;
    clearOverlays();
    guessMarker.current?.setMap(null);
    guessMarker.current = null;
    const bounds = new google.maps.LatLngBounds();
    for (const i of rounds) {
      const g = guesses[i] ?? guess;
      if (!g) continue;
      const tg = targets[i];
      const a = { lat: g[0], lng: g[1] };
      const b = { lat: tg.lat, lng: tg.lng };
      overlays.current.push(
        new google.maps.Marker({ map: map.current, position: a, title: t("Dein Tipp", "Your guess"), label: { text: String(i + 1), color: "#fff", fontWeight: "700" } }),
        new google.maps.Marker({
          map: map.current,
          position: b,
          title: t("Hier war es", "It was here"),
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
        }),
        new google.maps.Polyline({ map: map.current, path: [a, b], geodesic: true, strokeColor: "#1f2937", strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, scale: 3 }, offset: "0", repeat: "14px" }] })
      );
      bounds.extend(a);
      bounds.extend(b);
    }
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, 60);
  }

  // after a guess / when the game is over: lines between guess and target
  useEffect(() => {
    if (!ready || !targets) return;
    if (reveal != null) showResult([reveal]);
    else if (over) showResult([0, 1, 2, 3, 4]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reveal, over, targets]);

  const submit = () => {
    if (!guess || !targets || over) return;
    const next: [number, number][] = [...guesses, guess];
    setLocal(next);
    setReveal(round);
    const ps = next.map((g, i) => points(distanceKm([g[0], g[1]], [targets[i].lat, targets[i].lng])));
    const sum = ps.reduce((a, b) => a + b, 0);
    persist({
      done: next.length >= ROUNDS,
      score: sum,
      max: ROUNDS * MAX,
      label: `${sum}/${ROUNDS * MAX}`,
      share: `${t("Spurensuche", "Where Am I?")} #${dayNumber(day)} · ${sum}/${ROUNDS * MAX}\n${ps.map(emoji).join("")}`,
      state: { targets, guesses: next },
    });
  };

  const backToStart = () => {
    if (!targets || !pano.current) return;
    const t = targets[Math.min(round, ROUNDS - 1)];
    pano.current.setPano(t.pano);
    pano.current.setPov({ heading: t.heading, pitch: 0 });
  };

  const placeOf = (tg: Target) => (lang === "en" ? `${exo(SPOTS[tg.spot][2])}, ${COUNTRY_EN.get(SPOTS[tg.spot][3]) ?? SPOTS[tg.spot][3]}` : `${SPOTS[tg.spot][2]}, ${SPOTS[tg.spot][3]}`);

  return (
    <GameShell
      game="spurensuche"
      day={day}
      isToday={isToday}
      rules={
        <>
          {lang === "en" ? (
            <>
              <p>You are dropped somewhere in the world in Google Street View. Look around and follow the <strong>arrows</strong> along the road.</p>
              <p>Once you think you know where you are, drop a <strong>pin on the map</strong> and submit your guess.</p>
              <p>The closer your guess, the more points: up to {MAX} per round, {ROUNDS} rounds.</p>
            </>
          ) : (
            <>
              <p>Du wirst irgendwo auf der Welt in Google Street View abgesetzt. Schau dich um und lauf über die <strong>Pfeile</strong> die Straße entlang.</p>
              <p>Wenn du glaubst zu wissen, wo du bist, setz einen <strong>Pin auf die Karte</strong> und gib deinen Tipp ab.</p>
              <p>Je näher dein Tipp, desto mehr Punkte: bis zu {MAX} pro Runde, {ROUNDS} Runden.</p>
            </>
          )}
        </>
      }
    >
      {blocked ? (
        <div className="card p-6 text-center">
          <p className="text-4xl" aria-hidden="true">{blocked === "archiv" ? "🗓️" : "🛠️"}</p>
          <p className="mt-2 text-xl font-display font-semibold">{blocked === "archiv" ? t("Nur die letzten 7 Tage", "Only the last 7 days") : t("Spurensuche macht gerade Pause", "Where Am I? is taking a break")}</p>
          <p className="mx-auto mt-1 max-w-md text-muted">
            {blocked === "archiv"
              ? t(
                  `Im Archiv kannst du Spurensuche für die letzten ${SPURENSUCHE_ARCHIVE_DAYS} Tage nachspielen. Ältere Runden gibt es bald mit dem Abo.`,
                  `In the archive you can replay Where Am I? for the last ${SPURENSUCHE_ARCHIVE_DAYS} days. Older rounds are coming soon with the subscription.`
                )
              : t(
                  "Wegen Wartungsarbeiten ist Spurensuche gerade nicht spielbar. Alle anderen Spiele laufen ganz normal – schau später wieder vorbei.",
                  "Where Am I? is down for maintenance. All other games work as usual – check back later."
                )}
          </p>
        </div>
      ) : !loaded || (!targets && !error) ? (
        <div className="grid h-[60vh] min-h-80 place-items-center rounded-2xl bg-line text-sm font-semibold text-muted">
          <span className="animate-pulse">{t("Orte werden gesucht …", "Finding places …")}</span>
        </div>
      ) : error ? (
        <div className="card p-5 font-semibold text-bad">{error}</div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">{over && reveal == null ? t("Alle Runden", "All rounds") : t(`Runde ${idx + 1} von ${ROUNDS}`, `Round ${idx + 1} of ${ROUNDS}`)}</span>
            <span className="text-muted">{t("Punkte", "Points")}: {total}</span>
          </div>

          <div className={over && reveal == null ? "hidden" : ""}>
            <div className="relative overflow-hidden rounded-2xl border-2 border-line">
              <div ref={svEl} className="h-[52vh] min-h-72 w-full bg-ink/10 sm:h-[60vh]" aria-label={t("Street-View-Ansicht", "Street View")} />
              {reveal == null && (
                <button type="button" onClick={backToStart} className="absolute left-2 top-2 z-10 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold shadow">
                  {t("Zurück zum Start", "Back to start")}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border-2 border-line">
            <div ref={mapEl} className={`w-full ${over && reveal == null ? "h-[60vh] min-h-80" : "h-72 sm:h-80"}`} aria-label={t("Karte für deinen Tipp", "Map for your guess")} />
          </div>

          {reveal == null && !over && (
            <button type="button" onClick={submit} disabled={!guess} className="btn-primary mt-3 w-full">
              {guess ? t("Tipp abgeben", "Submit guess") : t("Setz einen Pin auf die Karte", "Drop a pin on the map")}
            </button>
          )}

          {reveal != null && (
            <div className="card pop mt-3 p-4">
              <p className="text-2xl font-display font-semibold">{pts[reveal]} / {MAX} {t("Punkte", "points")}</p>
              <p className="mt-1 text-sm text-muted">
                {fmtKm(kms[reveal], lang)} {t("daneben – es war in der Nähe von", "off – it was near")} <strong className="text-ink">{placeOf(targets![reveal])}</strong>.
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() => {
                  setReveal(null);
                  setGuess(null);
                }}
              >
                {round < ROUNDS ? t("Nächste Runde", "Next round") : t("Ergebnis", "Result")}
              </button>
            </div>
          )}

          {over && reveal == null && targets && (
            <>
              <Solutions note={t("Grüne Punkte: dort warst du. Nummerierte Pins: deine Tipps.", "Green dots: where you were. Numbered pins: your guesses.")}>
                {targets.map((tg, i) => (
                  <SolutionRow
                    key={tg.pano}
                    title={t(`Runde ${i + 1}`, `Round ${i + 1}`)}
                    right={
                      <>
                        {t("bei", "near")} {placeOf(tg)} –{" "}
                        <a className="font-semibold underline" href={`https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(tg.pano)}`} target="_blank" rel="noopener">
                          {t("in Street View ansehen", "view in Street View")}
                        </a>
                      </>
                    }
                    yours={t(`${fmtKm(kms[i])} entfernt`, `${fmtKm(kms[i], "en")} away`)}
                    badge={{ text: `${pts[i]} / ${MAX}`, pts: pts[i], max: MAX }}
                  />
                ))}
              </Solutions>
              <ResultCard title={t("Dein Ergebnis", "Your result")} score={`${total} / ${ROUNDS * MAX}`} share={saved?.share || ""} isToday={isToday} current="spurensuche" />
            </>
          )}
        </>
      )}
    </GameShell>
  );
}
