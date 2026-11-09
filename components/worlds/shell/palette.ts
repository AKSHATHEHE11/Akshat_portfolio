import type { CSSProperties } from "react";
import type { ProjectColor } from "@/lib/types";

/** WCAG relative luminance of #rrggbb. */
function luminance(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6).padEnd(6, "0"), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink or bone — whichever reads better on `hex` (orange gets ink, like the site's signal). */
export function inkOn(hex: string) {
  const l = luminance(hex);
  return (l + 0.05) / 0.0556 >= 0.903 / (l + 0.05) ? "#111111" : "#f2eee7";
}

/**
 * Re-point the site's semantic tokens at a world's palette. Anything inside (Button, Kbd,
 * text-fg, border-line…) then speaks the world's colours without knowing about worlds.
 */
export function worldTokens(c: ProjectColor): CSSProperties {
  return {
    "--bg": c.bg,
    "--fg": c.fg,
    "--fg-muted": `color-mix(in oklab, ${c.fg} 70%, ${c.bg})`,
    "--line": `color-mix(in oklab, ${c.fg} 16%, transparent)`,
    "--line-strong": c.fg,
    "--surface": `color-mix(in oklab, ${c.bg} 88%, ${c.fg})`,
    "--surface-2": `color-mix(in oklab, ${c.bg} 80%, ${c.fg})`,
    "--accent": c.accent,
    "--accent-ink": inkOn(c.accent),
    color: c.fg,
  } as CSSProperties;
}
