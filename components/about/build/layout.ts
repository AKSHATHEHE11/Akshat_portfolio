// Geometry for the BUILD SYSTEM schematic. Pure functions of (mode, width) so nodes and traces always
// agree: nodes are HTML positioned with the same numbers the SVG traces are drawn with (CSS px).
import { skillMap } from "@/data/skills";

export const GROUPS = skillMap;
export const SKILLS = skillMap.flatMap((g, gi) => g.skills.map((s) => ({ ...s, gi })));
/** each skill's real parent group (chaos rewires a copy of this) */
export const PARENTS = SKILLS.map((s) => s.gi);

export type Mode = "wide" | "tall";
type Pt = { x: number; y: number };

/** node boxes in CSS px. Groups: in-port on the left edge, out-port on the right (wide) or below (tall). */
export const BOX = { rootW: 150, rootH: 76, tallRootH: 48, groupW: 132, groupH: 34, trunk: 12 } as const;
/** wide mode: node columns as fractions of the width, so HTML can place them before the width is known */
export const FX = { group: 0.3, skill: 0.58 } as const;
export const ROW = { wide: 32, tall: 44 } as const;
const R = 9;

export interface Layout {
  mode: Mode;
  h: number;
  root: Pt;
  groups: Pt[];
  skills: Pt[];
}

/** horizontal → vertical at xm → horizontal, rounded corners */
function hvh(x0: number, y0: number, xm: number, y1: number, x1: number) {
  const dy = y1 - y0;
  const r = Math.min(R, Math.abs(dy) / 2, Math.abs(xm - x0), Math.abs(x1 - xm));
  if (Math.abs(dy) < 0.5 || r < 0.5) return `M${x0} ${y0}H${x1}`;
  const s = Math.sign(dy);
  return `M${x0} ${y0}H${xm - r}Q${xm} ${y0} ${xm} ${y0 + s * r}V${y1 - s * r}Q${xm} ${y1} ${xm + r} ${y1}H${x1}`;
}

/** vertical → horizontal (the tall tree), up or down */
function vh(x0: number, y0: number, y1: number, x1: number) {
  const s = Math.sign(y1 - y0) || 1;
  const r = Math.min(R, Math.abs(y1 - y0), Math.abs(x1 - x0));
  return `M${x0} ${y0}V${y1 - s * r}Q${x0} ${y1} ${x0 + r} ${y1}H${x1}`;
}

export function layout(mode: Mode, w: number): Layout {
  if (mode === "wide") {
    const gap = 24;
    const pad = 18;
    const row = ROW.wide;
    const skills = SKILLS.map((s, k) => ({ x: w * FX.skill, y: pad + k * row + s.gi * gap + row / 2 }));
    const groups = GROUPS.map((_, gi) => {
      const ys = skills.filter((_, k) => SKILLS[k].gi === gi).map((p) => p.y);
      return { x: w * FX.group, y: (ys[0] + ys[ys.length - 1]) / 2 };
    });
    const h = pad * 2 + SKILLS.length * row + (GROUPS.length - 1) * gap;
    return { mode, h, root: { x: 0, y: h / 2 }, groups, skills };
  }
  const row = ROW.tall;
  let y = BOX.tallRootH + 20;
  const groups: Pt[] = [];
  const skills: Pt[] = [];
  GROUPS.forEach((g) => {
    groups.push({ x: 28, y: y + BOX.groupH / 2 });
    y += BOX.groupH + 4;
    g.skills.forEach(() => {
      skills.push({ x: 64, y: y + row / 2 });
      y += row;
    });
    y += 16;
  });
  return { mode, h: y, root: { x: 0, y: BOX.tallRootH / 2 }, groups, skills };
}

/** root → group gi */
export function rootTrace(L: Layout, gi: number) {
  const g = L.groups[gi];
  if (L.mode === "tall") return vh(BOX.trunk, BOX.tallRootH, g.y, g.x);
  return hvh(BOX.rootW, L.root.y, (BOX.rootW + g.x) / 2, g.y, g.x);
}

/** group gi → skill k. Each group's bus turns at its own x, so a rewired trace visibly crosses. */
export function skillTrace(L: Layout, k: number, gi: number) {
  const g = L.groups[gi];
  const s = L.skills[k];
  if (L.mode === "tall") return vh(g.x + 14, g.y + BOX.groupH / 2, s.y, s.x);
  const x0 = g.x + BOX.groupW;
  return hvh(x0, g.y, x0 + (s.x - x0) * (0.28 + gi * 0.11), s.y, s.x);
}
