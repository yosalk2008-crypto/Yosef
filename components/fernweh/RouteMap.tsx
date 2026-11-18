"use client";

/**
 * The expedition trail: an original hand-drawn route from the harbour to the pole star. The pin sits
 * at km / 500 along the path, the travelled part is drawn in red.
 */
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const PATH = "M22 150 C70 150 80 118 120 116 S170 140 205 108 S240 60 280 70 S320 96 345 58 S330 22 300 20";
const STOPS: { at: number; de: string; en: string }[] = [
  { at: 0, de: "Hafen", en: "Harbour" },
  { at: 100, de: "Küste", en: "Coast" },
  { at: 200, de: "Steppe", en: "Steppe" },
  { at: 300, de: "Gebirge", en: "Mountains" },
  { at: 400, de: "Gletscher", en: "Glacier" },
  { at: 500, de: "Polarstern", en: "Pole star" },
];

export function RouteMap({ km }: { km: number }) {
  const t = useT();
  const ref = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const L = p.getTotalLength();
    setLen(L);
    setPts(STOPS.map((s) => p.getPointAtLength((s.at / 500) * L)));
  }, []);
  const f = Math.max(0, Math.min(1, km / 500));
  const here = ref.current && len ? ref.current.getPointAtLength(f * len) : null;
  return (
    <svg viewBox="0 0 370 175" role="img" aria-label={t(`Expeditionsroute: ${km} von 500 km`, `Expedition route: ${km} of 500 km`)}>
      {/* contour hills and a mountain range */}
      <g fill="none" stroke="#2a211c" strokeOpacity=".18" strokeWidth="1">
        <path d="M150 168 Q200 128 260 168" />
        <path d="M168 168 Q205 140 244 168" />
        <path d="M30 60 Q70 30 110 60 Q70 76 30 60z" />
        <path d="M46 58 Q70 42 94 58 Q70 66 46 58z" />
      </g>
      <g fill="#d9c9a3" stroke="#2a211c" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M245 98 L268 62 L282 82 L296 56 L322 98z" />
        <path d="M262 70 L268 62 L274 71 M290 66 L296 56 L303 67" fill="#fffaf0" />
      </g>
      <g stroke="#2a211c" strokeOpacity=".35" strokeWidth="1.2" fill="none">
        <path d="M14 158 q8 -5 16 0 t16 0" />
        <path d="M8 168 q8 -5 16 0 t16 0 t16 0" />
      </g>
      <path ref={ref} d={PATH} fill="none" stroke="#2a211c" strokeWidth="2.2" strokeDasharray="1 6" strokeLinecap="round" />
      {len > 0 && (
        <path d={PATH} fill="none" stroke="#c9302c" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${f * len} ${len}`} style={{ transition: "stroke-dasharray .8s ease" }} />
      )}
      {pts.map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={k === 5 ? 0 : 3.6} fill={STOPS[k].at <= km ? "#c9302c" : "#fffaf0"} stroke="#2a211c" strokeWidth="1.4" />
          <text x={p.x + (k === 5 ? 14 : 0)} y={p.y + (k === 5 ? 4 : k % 2 ? -9 : 16)} fontSize="10.5" fontWeight="700" textAnchor={k === 5 ? "start" : "middle"} fill="#2a211c" style={{ fontFamily: "var(--font-fw-mono), monospace" }}>
            {t(STOPS[k].de, STOPS[k].en)}
          </text>
        </g>
      ))}
      {pts[5] && <path transform={`translate(${pts[5].x} ${pts[5].y})`} d="M0-9 L2.4-2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4-2.4z" fill="#e2b714" stroke="#2a211c" strokeWidth="1.2" />}
      {here && (
        <g transform={`translate(${here.x} ${here.y})`}>
          <path d="M0 0C-2-6-8-9-8-15a8 8 0 0116 0C8-9 2-6 0 0z" fill="#c9302c" stroke="#2a211c" strokeWidth="1.5" />
          <circle cy="-15" r="3" fill="#fffaf0" />
        </g>
      )}
      <g transform="translate(345 150)" stroke="#2a211c" fill="none" strokeWidth="1.2">
        <circle r="11" strokeOpacity=".5" />
        <path d="M0-14 L3 0 L0 14 L-3 0z" fill="#2a211c" fillOpacity=".75" />
        <text y="-17" fontSize="9" textAnchor="middle" fill="#2a211c" stroke="none" fontWeight="700">N</text>
      </g>
    </svg>
  );
}
