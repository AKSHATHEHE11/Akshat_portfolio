import { pad } from "@/lib/utils";

let origin = 0;

/** Seconds since this page loaded — or since the last RESTART EXPERIENCE. Client only. */
export const sessionSeconds = () => (performance.now() - origin) / 1000;

export const resetSession = () => {
  origin = performance.now();
};

/** VCR counter: 754.2 → "0:12:34" */
export function clock(seconds: number) {
  const t = Math.max(0, Math.floor(seconds));
  return `${Math.floor(t / 3600)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
}
