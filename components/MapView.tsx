"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoEqualEarth, geoGraticule10, geoMercator, geoPath, type GeoProjection } from "d3-geo";
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
  onPick?: (id: string, at: { x: number; y: number }) => void;
  /** A tap that hits no country (open sea). */
  onSea?: (at: { x: number; y: number }) => void;
  /** Drawn on top of the map, inside the zoomed layer (k = current zoom, for constant-size markers). */
  overlay?: (k: number, ppu: number) => React.ReactNode;
  /** Draw a 10° grid of latitude/longitude lines under the countries. */
  graticule?: string;
  /** Zoom smoothly to this shape (e.g. the picked country) whenever it changes; "*" flies back to the whole map. */
  focus?: string | null;
  /** Draw this shape on top with a glowing outline in this colour. */
  highlight?: { id: string; color: string } | null;
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
  onSea,
  overlay,
  graticule,
  focus,
  highlight,
  dots,
  dotFill,
  aspect = 1.9,
  className = "",
  label,
}: Props) {
  const H = Math.round(W / aspect);
  const tt = useT();
  const fitKey = (fit || shapes).map((s) => s.id).join(",") + (fitBox ? fitBox.flat().join(",") : "");

  const { paths, centroids, areas, bounds, grid } = useMemo(() => {
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
    const bounds: Record<string, [[number, number], [number, number]]> = {};
    for (const s of shapes) {
      const d = gp(s);
      if (!d) continue;
      paths[s.id] = d;
      centroids[s.id] = gp.centroid(s) as [number, number];
      areas[s.id] = gp.area(s);
      bounds[s.id] = gp.bounds(s) as [[number, number], [number, number]];
    }
    const grid = graticule ? gp(geoGraticule10()) ?? "" : "";
    return { paths, centroids, areas, bounds, grid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, fitKey, projection, rotate, H, graticule]);

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

  // fly to a shape (smoothly, for 0.7 s) when `focus` changes
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    if (focus === "*") {
      // fly back to the whole map
      setFlying(true);
      setT({ k: 1, x: 0, y: 0 });
      const id = setTimeout(() => setFlying(false), 750);
      return () => clearTimeout(id);
    }
    if (!focus || !bounds[focus]) return;
    const [[x0, y0], [x1, y1]] = bounds[focus];
    const w = Math.max(x1 - x0, 1);
    const h = Math.max(y1 - y0, 1);
    if (w > W * 0.8) return; // spans the whole map (crosses the date line) – leave the view
    const k = Math.min(14, Math.max(1, 0.55 * Math.min(W / w, H / h)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    setFlying(true);
    setT(clamp({ k, x: W / 2 - cx * k, y: H / 2 - cy * k }));
    const id = setTimeout(() => setFlying(false), 750);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, bounds]);

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
    if (near && !LAND_ONLY.has(near.id)) return onPick(near.id, { x: centroids[near.id][0], y: centroids[near.id][1] });
    if (under && !LAND_ONLY.has(under)) return onPick(under, { x: mx, y: my });
    onSea?.({ x: mx, y: my });
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
        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`} style={flying ? { transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`, transition: "transform 0.7s cubic-bezier(0.3, 0.1, 0.2, 1)" } : undefined}>
          {grid && <path d={grid} fill="none" stroke={graticule} strokeWidth={0.8} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
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
          {highlight && paths[highlight.id] && (
            <g pointerEvents="none">
              <path d={paths[highlight.id]} fill="none" stroke={highlight.color} strokeOpacity={0.25} strokeWidth={14} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={paths[highlight.id]} fill="none" stroke={highlight.color} strokeOpacity={0.45} strokeWidth={7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={paths[highlight.id]} fill="none" stroke={highlight.color} strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          )}
          {overlay?.(t.k, ppu)}
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
