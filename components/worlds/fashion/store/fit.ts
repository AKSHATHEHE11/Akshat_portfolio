import type { Fit, FitSize } from "../scene";

export interface Measure {
  /** inches around (flat, doubled) */
  waist: number;
  inseam: number;
  /** inches flat, 1 in below the crotch */
  thigh: number;
}

export interface Match {
  fit: Fit;
  size: FitSize;
  /** 0–99 */
  score: number;
  /** Fybr8 minus yours, inches */
  d: { waist: number; thigh: number; inseam: number };
}

/**
 * Rank Fybr8 fits against a pair the visitor already loves.
 * Thigh decides the silhouette so it weighs most, waist next; inseam least — a hem fixes a long leg,
 * nothing fixes a short one, so short costs more than long.
 */
export function matchFits(fits: Fit[], m: Measure): Match[] {
  const best = fits.map((fit) => {
    let top: Match | null = null;
    for (const size of fit.sizes) {
      const d = { waist: size.waist - m.waist, thigh: size.thigh - m.thigh, inseam: fit.inseam - m.inseam };
      const penalty = Math.abs(d.waist) + Math.abs(d.thigh) * 1.6 + (d.inseam < 0 ? -d.inseam * 0.7 : d.inseam * 0.25);
      const score = Math.max(0, Math.min(99, Math.round(100 - penalty * 9)));
      if (!top || score > top.score) top = { fit, size, score, d };
    }
    return top;
  });
  return best.filter((x): x is Match => x !== null).sort((a, b) => b.score - a.score);
}
