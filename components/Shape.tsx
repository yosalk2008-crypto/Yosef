"use client";

import { useMemo } from "react";
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance, geoPath } from "d3-geo";
import type { Shape as ShapeT } from "@/lib/geo";

type Poly = number[][][];

/**
 * The recognisable part of a country: its largest landmass plus everything close to it or of similar size.
 * Far-away small territories (the Dutch Caribbean, French Guiana, Alaska/Hawaii, Easter Island …) would
 * otherwise shrink the outline to a dot when it is fitted into a box.
 */
export function mainland(shape: ShapeT): ShapeT {
  const g = shape.geometry as { type: string; coordinates: unknown };
  if (g?.type !== "MultiPolygon") return shape;
  const polys = (g.coordinates as Poly[]).map((p) => {
    const f = { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: p } };
    return { p, area: geoArea(f), c: geoCentroid(f) };
  });
  const big = polys.reduce((a, b) => (b.area > a.area ? b : a));
  const radius = Math.sqrt(big.area / Math.PI); // angular radius of the main landmass
  const keep = polys.filter((x) => x === big || x.area >= big.area * 0.25 || (x.area >= big.area * 0.0005 && geoDistance(x.c, big.c) <= 3 * radius + 0.05));
  return { ...shape, geometry: { type: "MultiPolygon", coordinates: keep.map((x) => x.p) } } as ShapeT;
}

/** A single outline, centred and fitted into its box (equal-area projection around the shape). */
export function ShapeOutline({
  shape,
  fill = "currentColor",
  className = "",
  size = 200,
  pad = 0.06,
  label,
}: {
  shape: ShapeT;
  fill?: string;
  className?: string;
  size?: number;
  /** empty margin on each side, as a share of the box */
  pad?: number;
  label?: string;
}) {
  const d = useMemo(() => {
    const s = mainland(shape);
    const [lng, lat] = geoCentroid(s);
    const proj = geoAzimuthalEqualArea()
      .rotate([-lng, -lat])
      .fitExtent(
        [
          [size * pad, size * pad],
          [size * (1 - pad), size * (1 - pad)],
        ],
        s
      );
    return geoPath(proj)(s) || "";
  }, [shape, size, pad]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label || "Umriss / outline"}>
      <path d={d} fill={fill} stroke="none" />
    </svg>
  );
}
