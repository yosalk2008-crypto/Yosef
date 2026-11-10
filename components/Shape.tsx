"use client";

import { useMemo } from "react";
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from "d3-geo";
import type { Shape as ShapeT } from "@/lib/geo";

/** A single outline, centred and fitted into its box (equal-area projection around the shape). */
export function ShapeOutline({
  shape,
  fill = "currentColor",
  className = "",
  size = 200,
  label,
}: {
  shape: ShapeT;
  fill?: string;
  className?: string;
  size?: number;
  label?: string;
}) {
  const d = useMemo(() => {
    const [lng, lat] = geoCentroid(shape);
    const proj = geoAzimuthalEqualArea()
      .rotate([-lng, -lat])
      .fitExtent(
        [
          [size * 0.06, size * 0.06],
          [size * 0.94, size * 0.94],
        ],
        shape
      );
    return geoPath(proj)(shape) || "";
  }, [shape, size]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label || "Umriss"}>
      <path d={d} fill={fill} stroke="none" />
    </svg>
  );
}
