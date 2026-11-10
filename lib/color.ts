const NAMED: Record<string, string> = { red: "#ff0000", gray: "#808080", gold: "#ffd700", purple: "#800080", white: "#ffffff", black: "#000000" };

export function normHex(token: string): string | null {
  let h = token.trim().toLowerCase();
  if (NAMED[h]) h = NAMED[h];
  if (!h.startsWith("#")) return null;
  if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h.length === 7 ? h : null;
}

/** Replace every fill/stroke that resolves to `target` with `color`. */
export function recolorSvg(svg: string, target: string, color: string) {
  return svg.replace(/(fill|stroke)="([^"]+)"/g, (m, attr, val) => (normHex(val) === target ? `${attr}="${color}"` : m));
}

export function svgDataUrl(svg: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}

export function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function toLab(hex: string): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = hexToRgb(hex).map((x) => lin(x / 255));
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference */
export function deltaE(a: string, b: string) {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function isNeutral(hex: string) {
  const [, s, l] = hexToHsl(hex);
  return s < 12 || l > 93 || l < 8;
}
