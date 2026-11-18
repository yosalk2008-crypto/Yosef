"use client";

/**
 * The Fernweh km gauge, designed in Figma (page "Fernweh", "Kilometerzähler (Tacho)"): a dashboard dial
 * from 0 to 500 km that fills with one coloured segment per pin (the tier colour, the length its km),
 * a red marker at the current distance and rolling odometer drums in the middle.
 */
import { TIERS } from "@/lib/fernweh";
import { useT } from "@/lib/i18n";

const CX = 180;
const CY = 176;
const R = 132;
const pt = (km: number, r: number): [number, number] => {
  const a = Math.PI * (1 + Math.min(500, Math.max(0, km)) / 500);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const arc = (a: number, b: number, r: number) => {
  const [x0, y0] = pt(a, r);
  const [x1, y1] = pt(b, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

/** One rolling digit: a strip 0–9 that slides to the value. */
function Drum({ d }: { d: number }) {
  return (
    <span className="fw-drum">
      <span className="fw-drum-strip" style={{ transform: `translateY(${-d * 10}%)` }}>
        {Array.from({ length: 10 }, (_, k) => (
          <span key={k}>{k}</span>
        ))}
      </span>
    </span>
  );
}

export function Tacho({ segs, max = 500, label }: { segs: { km: number; tier: number }[]; max?: number; label?: string }) {
  const t = useT();
  const scale = 500 / max;
  const total = segs.reduce((s, x) => s + x.km, 0);
  let at = 0;
  const parts = segs
    .filter((s) => s.km > 0)
    .map((s, k) => {
      const a = at;
      at += s.km * scale;
      return <path key={k} className="fw-seg" d={arc(a + 1.2, at - 1.2, R)} stroke={TIERS[s.tier]?.color ?? "#999"} strokeWidth="24" fill="none" />;
    });
  const ticks = [];
  for (let k = 0; k <= 500; k += 25) {
    const big = k % 100 === 0;
    const [x0, y0] = pt(k, R - 22);
    const [x1, y1] = pt(k, R - (big ? 34 : 28));
    ticks.push(<line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#f6efe0" strokeOpacity={big ? 0.9 : 0.4} strokeWidth={big ? 3 : 2} strokeLinecap="round" />);
  }
  const [mx, my] = pt(at, R);
  const digits = String(Math.min(999, total)).padStart(3, "0").split("").map(Number);
  return (
    <div className="fw-tacho" role="img" aria-label={t(`${total} von ${max} km`, `${total} of ${max} km`)}>
      <svg viewBox="0 0 360 226">
        <rect width="360" height="226" rx="28" fill="#2c2a35" />
        <path d={arc(0, 500, R)} stroke="#3f3c4b" strokeWidth="24" fill="none" strokeLinecap="round" />
        {parts}
        {ticks}
        <g className="fw-marker" style={{ transform: `translate(${mx}px, ${my}px)` }}>
          <circle r="15" fill="#c9302c" stroke="#f6efe0" strokeWidth="4" />
          <circle r="4.5" fill="#f6efe0" />
        </g>
        <text x="30" y="200" fontSize="12" fontWeight="800" fill="#bfbacb">0</text>
        <text x="306" y="200" fontSize="12" fontWeight="800" fill="#bfbacb">{max}</text>
      </svg>
      <div className="fw-odo">
        <div className="fw-drums">
          {digits.map((d, k) => (
            <Drum key={k} d={d} />
          ))}
          <span className="fw-odo-km">km</span>
        </div>
        <p className="fw-odo-sub">{label ?? t(`von ${max} km`, `of ${max} km`)}</p>
      </div>
    </div>
  );
}
