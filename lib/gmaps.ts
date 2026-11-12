"use client";

/**
 * Google Maps JavaScript API (Street View + map) for "Spurensuche".
 * Browser key – it is visible to every visitor, so it must be restricted to firmengrafik.de
 * (HTTP referrer) and to the Maps JavaScript API in the Google Cloud Console.
 */
const KEY = "AIzaSyAq4ReUx4PbNMVdsgcY5gecrVRP-SWS-Tk";

let loading: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = "__geografikMaps";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve(window.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&language=de&region=DE&callback=${cb}&loading=async`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps konnte nicht geladen werden"));
    };
    document.head.appendChild(s);
  });
  return loading;
}
