// Small shared helpers for the fashion world: colour maths, money/inch formatting, pinked edges.

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
export const rgbToHex = ([r, g, b]: RGB) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/** Mix two hex colours, t = 0 → a, 1 → b. */
export function mix(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** WCAG relative luminance 0..1 */
export function luminance(hex: string) {
  const lin = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export const INK = "#14161c";
export const PAPER = "#f4f1ea";
export const COPPER = "#c4823b";
export const ECRU = "#ddd6c6";

/** Readable text colour on a background. */
export const inkOn = (bg: string) => (luminance(bg) > 0.3 ? INK : PAPER);

/** Detail/seam colour derived from a garment colour (darker on light cloth, lighter on dark). */
export const detailOf = (hex: string) => (luminance(hex) > 0.2 ? mix(hex, "#000000", 0.3) : mix(hex, "#ffffff", 0.22));

const formatters = new Map<string, Intl.NumberFormat>();
export function money(value: number, currency = "INR", locale = "en-IN") {
  const key = `${locale}:${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    formatters.set(key, f);
  }
  return f.format(value);
}

const FRACTIONS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };
/** 32.5 → "32½", 0.25 → "¼" */
export function inches(v: number) {
  const whole = Math.floor(Math.abs(v) + 1e-6);
  const frac = Math.round((Math.abs(v) - whole) * 4) / 4;
  const sign = v < 0 ? "−" : "";
  if (frac === 1) return `${sign}${whole + 1}`;
  const f = FRACTIONS[String(frac)] ?? "";
  return `${sign}${whole || !f ? whole : ""}${f}`;
}

/**
 * Pinking-shears edge as a clip-path polygon (percent units) for a box of the given aspect.
 * `teeth` along the short side; depth in percent of the short side.
 */
export function pinked(aspect = 0.8, teeth = 12, depth = 2.6) {
  const pts: string[] = [];
  const f = (v: number) => +v.toFixed(2);
  const nx = teeth;
  const ny = Math.round(teeth / aspect);
  const dx = depth;
  const dy = depth * aspect;
  for (let i = 0; i <= nx * 2; i++) pts.push(`${f((i / (nx * 2)) * 100)}% ${i % 2 ? f(dy) : 0}%`);
  for (let i = 1; i <= ny * 2; i++) pts.push(`${i % 2 ? f(100 - dx) : 100}% ${f((i / (ny * 2)) * 100)}%`);
  for (let i = nx * 2 - 1; i >= 0; i--) pts.push(`${f((i / (nx * 2)) * 100)}% ${i % 2 ? f(100 - dy) : 100}%`);
  for (let i = ny * 2 - 1; i >= 1; i--) pts.push(`${i % 2 ? f(dx) : 0}% ${f((i / (ny * 2)) * 100)}%`);
  return `polygon(${pts.join(",")})`;
}

/** Split "−22%" / "4.8%" / "41 s" into prefix, number, suffix and decimals for count-ups. */
export function splitValue(value: string) {
  const m = value.match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return null;
  const num = m[2].replace(",", ".");
  return { prefix: m[1], value: parseFloat(num), suffix: m[3], decimals: num.split(".")[1]?.length ?? 0 };
}
