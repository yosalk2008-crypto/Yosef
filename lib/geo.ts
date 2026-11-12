"use client";

import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import { geoArea, geoCentroid, geoDistance } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { BY_ID_ALL } from "./data/countries";

export type ShapeKey = "world" | "us" | "de" | "ch" | "at" | "sy" | "ma" | "tr" | "trr";
export type Shape = Feature<Geometry, { name?: string }> & { id: string };
export type ShapeSet = { list: Shape[]; byId: Record<string, Shape> };

const cache: Partial<Record<ShapeKey, Promise<ShapeSet>>> = {};

export function loadShapes(key: ShapeKey): Promise<ShapeSet> {
  if (!cache[key]) {
    cache[key] = fetch(`/geo/${key}.json`)
      .then((r) => r.json())
      .then((topo: Topology) => {
        const objName = key === "world" ? "countries" : "regions";
        const fc = feature(topo, topo.objects[objName] as GeometryCollection) as unknown as { features: Shape[] };
        // world map: every country we have data for
        const list = fc.features.map((f) => ({ ...f, id: String(f.id) })).filter((f) => key !== "world" || BY_ID_ALL[f.id]);
        return { list, byId: Object.fromEntries(list.map((f) => [f.id, f])) };
      });
  }
  return cache[key]!;
}

export function useShapes(key: ShapeKey): ShapeSet | null {
  const [s, setS] = useState<ShapeSet | null>(null);
  useEffect(() => {
    let alive = true;
    loadShapes(key).then((x) => alive && setS(x));
    return () => {
      alive = false;
    };
  }, [key]);
  return s;
}

export const EARTH_KM = 6371;

/** Great-circle distance in km between two [lat, lng] points. */
export function distanceKm(a: [number, number], b: [number, number]) {
  return geoDistance([a[1], a[0]], [b[1], b[0]]) * EARTH_KM;
}

/** Compass direction from a to b as an arrow + German label. */
export function bearing(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [la1, lo1] = [toRad(a[0]), toRad(a[1])];
  const [la2, lo2] = [toRad(b[0]), toRad(b[1])];
  const y = Math.sin(lo2 - lo1) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(lo2 - lo1);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = [
    ["↑", "N"],
    ["↗", "NO"],
    ["→", "O"],
    ["↘", "SO"],
    ["↓", "S"],
    ["↙", "SW"],
    ["←", "W"],
    ["↖", "NW"],
  ];
  const [arrow, label] = dirs[Math.round(deg / 45) % 8];
  return { deg, arrow, label };
}

export function shapeCentroid(s: Shape): [number, number] {
  const [lng, lat] = geoCentroid(s);
  return [lat, lng];
}

export function shapeAreaSr(s: Shape) {
  return geoArea(s);
}
