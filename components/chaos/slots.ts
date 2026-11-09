// Floating "found UI" for chaos mode: project chips (real links into each world) and system signals.
// Slots are art-directed, not random: links sit fully on-screen, signals may hang off an edge.
// They keep clear of the nav band, the scroll rail (right edge, mid-height), the HUD corners and
// the keycaps; anything still landing on content tucks into its edge at runtime (engine).
import { site } from "@/data/site";
import { summaries } from "@/data/projects";
import type { ProjectSummary } from "@/lib/types";

export type Side = "left" | "right" | "top" | "bottom";
export type Look = "led" | "tape" | "dash" | "stamp" | "build";

/** Screen edge, position along it (0..1), gap from it in px (negative peeks off-screen), tilt in deg. */
export interface Slot {
  side: Side;
  at: number;
  inset: number;
  rot: number;
}

export type FragItem =
  | { key: string; slot: Slot; kind: "project"; project: ProjectSummary }
  | { key: string; slot: Slot; kind: "signal"; look: Look; text: string };

type Layout = { projects: Slot[]; signals: (Slot & { look: Look })[] };

const WIDE: Layout = {
  projects: [
    { side: "left", at: 0.08, inset: 20, rot: -3 },
    { side: "right", at: 0.02, inset: 24, rot: 2.5 },
    { side: "bottom", at: 0.5, inset: 18, rot: -1.5 },
  ],
  signals: [
    { side: "bottom", at: 0.78, inset: 18, rot: -4, look: "led" },
    { side: "left", at: 0.42, inset: -16, rot: 7, look: "tape" },
    { side: "bottom", at: 0.22, inset: 16, rot: 3, look: "dash" },
    { side: "right", at: 0.16, inset: -14, rot: -9, look: "stamp" },
    { side: "top", at: 0.56, inset: 16, rot: -2, look: "build" },
  ],
};

const COMPACT: Layout = {
  projects: [
    { side: "left", at: 0.86, inset: 10, rot: -3 },
    { side: "right", at: 0.1, inset: 10, rot: 3 },
  ],
  signals: [
    { side: "right", at: 0.52, inset: -22, rot: -8, look: "stamp" },
    { side: "left", at: 0.4, inset: -26, rot: 7, look: "tape" },
  ],
};

/** At most 8 fragments (4 on small screens; 4 static stickers for reduced motion). Never the open world. */
export function pickFragments(seed: number, world: string | null, compact: boolean, still: boolean): FragItem[] {
  const l = compact ? COMPACT : WIDE;
  const pool = summaries.filter((p) => p.slug !== world);
  const projects = (still ? l.projects.slice(0, 2) : l.projects).map((slot, i): FragItem => {
    const project = pool[(seed + i) % pool.length];
    return { key: `p-${project.slug}`, slot, kind: "project", project };
  });
  const signals = (still ? l.signals.slice(0, 2) : l.signals).map(({ look, ...slot }, i): FragItem => ({
    key: `s-${i}`,
    slot,
    kind: "signal",
    look,
    text: look === "build" ? site.version : site.signals[(seed * 3 + i) % site.signals.length],
  }));
  return [...projects, ...signals];
}
