"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoEqualEarth, geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { LAND_ONLY, type Shape } from "@/lib/geo";
import { useT } from "@/lib/i18n";

export type MapProjection = "world" | "mercator" | "usa";

type Props = {
  shapes: Shape[];
  /** Shapes to fit the initial view to (defaults to all). */
  fit?: Shape[];
  /** Or a lon/lat box [[west, south], [east, north]] to fit to. */
  fitBox?: [[number, number], [number, number]];
  projection?: MapProjection;
  /** Rotate the world projection (degrees longitude), e.g. -160 for Oceania. */
  rotate?: number;
  fill: (id: string) => string;
  stroke?: string;
  showBorders?: boolean;
  onPick?: (id: string) => void;
  /** Draw clickable dots for entities that are too small to see. */
  dots?: (id: string) => boolean;
  dotFill?: (id: string) => string;
  aspect?: number; // width / height
  className?: string;
  label?: string;
};

const W = 1000;
/** Deep enough that the Vatican or Monaco fill the screen. */
const MAX_ZOOM = 200;
/** Tiny entities get a dot; tapping within this many screen pixels of it counts. */
const DOT_PX = 6;
const HIT_PX = 18;

export function MapView({
  shapes,
  fit,
  fitBox,
  projection = "world",
  rotate = 0,
  fill,
  stroke = "#6da5e4",
  showBorders = true,
  onPick,
  dots,
  dotFill,
  aspect = 1.9,
  className = "",
  label,
}: Props) {
  const H = Math.round(W / aspect);
  const tt = useT();
  const fitKey = (fit || shapes).map((s) => s.id).join(",") + (fitBox ? fitBox.flat().join(",") : "");

  const { paths, centroids, areas } = useMemo(() => {
    let proj: GeoProjection;
    if (projection === "usa") proj = geoAlbersUsa() as unknown as GeoProjection;
    else if (projection === "mercator") proj = geoMercator();
    else proj = geoEqualEarth().rotate([rotate, 0]);
    let target: GeoJSON.GeoJSON = { type: "FeatureCollection", features: fit && fit.length ? fit : shapes };
    if (fitBox) {
      const [[w, so], [e, n]] = fitBox;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) {
        const lon = w + ((e - w) * k) / 8;
        const lat = so + ((n - so) * k) / 8;
        pts.push([lon, so], [lon, n], [w, lat], [e, lat]);
      }
      target = { type: "MultiPoint", coordinates: pts };
    }
    proj.fitExtent(
      [
        [16, 16],
        [W - 16, H - 16],
      ],
      target
    );
    const gp = geoPath(proj);
    const paths: Record<string, string> = {};
    const centroids: Record<string, [number, number]> = {};
    const areas: Record<string, number> = {};
    for (const s of shapes) {
      const d = gp(s);
      if (!d) continue;
      paths[s.id] = d;
      centroids[s.id] = gp.centroid(s) as [number, number];
      areas[s.id] = gp.area(s);
    }
    return { paths, centroids, areas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, fitKey, projection, rotate, H]);

  // ---- pan & zoom ----
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  useEffect(() => setT({ k: 1, x: 0, y: 0 }), [fitKey]);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; startDist?: number; startK?: number; startT?: typeof t; mid?: { x: number; y: number } }>({ moved: 0 });

  const toSvg = useCallback(
    (clientX: number, clientY: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
    },
    [H]
  );

  const zoomAt = useCallback((p: { x: number; y: number }, factor: number, base = t) => {
    const k = Math.min(MAX_ZOOM, Math.max(1, base.k * factor));
    const f = k / base.k;
    return { k, x: p.x - (p.x - base.x) * f, y: p.y - (p.y - base.y) * f };
  }, [t]);

  // screen pixels per map unit, so dots and tap areas keep a finger-friendly size on every screen
  const [ppu, setPpu] = useState(0.5);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPpu(el.getBoundingClientRect().width / W || 0.5));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback(
    (v: typeof t) => {
      const minX = W - W * v.k;
      const minY = H - H * v.k;
      return { k: v.k, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) };
    },
    [H]
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      setT((cur) => clamp(zoomAtStatic(p, Math.exp(-e.deltaY * 0.002), cur)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvg, clamp]);

  // small on screen = less than about 12 × 12 pixels at the current zoom
  const dotIds = dots ? shapes.filter((s) => paths[s.id] && dots(s.id) && areas[s.id] * (t.k * ppu) ** 2 < 110).map((s) => s.id) : [];

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, toSvg(e.clientX, e.clientY));
    gesture.current.moved = pointers.current.size > 1 ? 99 : 0;
    gesture.current.startT = t;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = toSvg(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && gesture.current.startDist && gesture.current.startT && gesture.current.mid) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setT(clamp(zoomAt(gesture.current.mid, dist / gesture.current.startDist, gesture.current.startT)));
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved > 4) setT((cur) => clamp({ k: cur.k, x: cur.x + dx, y: cur.y + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const wasClick = pointers.current.size === 1 && gesture.current.moved <= 4;
    pointers.current.delete(e.pointerId);
    if (!wasClick || !onPick) return;
    // what is under the finger (pointer capture retargets events)
    const under = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest("[data-id]")?.getAttribute("data-id") ?? null;
    // a tap close to a tiny state's dot picks the nearest one – generously over the sea or a tiny state,
    // but only right at the dot when the finger is on a larger country
    const generous = !under || dotIds.includes(under);
    const p = toSvg(e.clientX, e.clientY);
    const mx = (p.x - t.x) / t.k;
    const my = (p.y - t.y) / t.k;
    const reach = (generous ? HIT_PX : DOT_PX + 8) / (ppu * t.k);
    let near: { id: string; d: number } | null = null;
    for (const id of dotIds) {
      const [cx, cy] = centroids[id];
      const d = Math.hypot(cx - mx, cy - my);
      if (d <= reach && (!near || d < near.d)) near = { id, d };
    }
    if (near && !LAND_ONLY.has(near.id)) return onPick(near.id);
    if (under && !LAND_ONLY.has(under)) onPick(under);
  };

  const zoomBtn = (f: number) => setT((cur) => clamp(zoomAtStatic({ x: W / 2, y: H / 2 }, f, cur)));


  return (
    <div className={`relative overflow-hidden rounded-2xl bg-sea ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none select-none"
        role="img"
        aria-label={label ?? tt("Karte", "Map")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      >
        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
          {shapes.map((s) =>
            paths[s.id] ? (
              <path
                key={s.id}
                data-id={s.id}
                d={paths[s.id]}
                fill={fill(s.id)}
                stroke={showBorders ? stroke : fill(s.id)}
                strokeWidth={showBorders ? 0.8 : 0.6}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                className={onPick ? "cursor-pointer transition-[fill] duration-150 hover:brightness-95" : ""}
              />
            ) : null
          )}
          {dotIds.map((id) => (
            <circle
              key={"dot-" + id}
              data-id={id}
              cx={centroids[id][0]}
              cy={centroids[id][1]}
              r={DOT_PX / (ppu * t.k)}
              fill={(dotFill || fill)(id)}
              stroke="#475569"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className={onPick ? "cursor-pointer" : ""}
            />
          ))}
        </g>
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button type="button" onClick={() => zoomBtn(2)} className="map-btn" aria-label={tt("Hineinzoomen", "Zoom in")}>
          +
        </button>
        <button type="button" onClick={() => zoomBtn(1 / 2)} className="map-btn" aria-label={tt("Herauszoomen", "Zoom out")}>
          −
        </button>
        <button type="button" onClick={() => setT({ k: 1, x: 0, y: 0 })} className="map-btn text-xs" aria-label={tt("Ansicht zurücksetzen", "Reset view")}>
          ⟲
        </button>
      </div>
    </div>
  );
}

function zoomAtStatic(p: { x: number; y: number }, factor: number, base: { k: number; x: number; y: number }) {
  const k = Math.min(MAX_ZOOM, Math.max(1, base.k * factor));
  const f = k / base.k;
  return { k, x: p.x - (p.x - base.x) * f, y: p.y - (p.y - base.y) * f };
}
