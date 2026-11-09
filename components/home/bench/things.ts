// The objects on the bench. Sizes are px on a 1440px-wide bench; CSS scales them with --u.
// `d` / `m` are resting poses used without physics (reduced motion, before the drop) and as the
// x-position each object falls from: [x % of width, lift px above the floor, rotation deg].
// No `m` = the object stays off the bench on phones.

export type Pose = [x: number, lift: number, rot: number];

export interface Thing {
  id: string;
  kind: "key" | "crt" | "ring" | "pill" | "star" | "bolt" | "cube" | "knob" | "switch" | "nut";
  /** keycap legend */
  char?: string;
  tone?: "cream" | "ink" | "orange";
  w: number;
  h: number;
  shape: "box" | "circle" | "hex" | "pent";
  /** corner radius of box bodies */
  r?: number;
  d: Pose;
  m?: Pose;
}

export const THINGS: Thing[] = [
  { id: "p", kind: "key", char: "P", tone: "orange", w: 96, h: 96, shape: "box", r: 14, d: [23, 0, -6], m: [11, 0, -4] },
  { id: "l", kind: "key", char: "L", tone: "cream", w: 96, h: 96, shape: "box", r: 14, d: [30.5, 0, 3], m: [27, 0, 3] },
  { id: "a", kind: "key", char: "A", tone: "ink", w: 96, h: 96, shape: "box", r: 14, d: [38, 0, -2], m: [43, 0, -2] },
  { id: "y", kind: "key", char: "Y", tone: "cream", w: 96, h: 96, shape: "box", r: 14, d: [45.5, 0, 6], m: [59, 0, 5] },
  { id: "crt", kind: "crt", w: 150, h: 120, shape: "box", r: 18, d: [63, 0, -2], m: [85, 0, -2] },
  { id: "ring", kind: "ring", w: 92, h: 92, shape: "circle", d: [63, 120, 0], m: [85, 120, 0] },
  { id: "star", kind: "star", w: 96, h: 96, shape: "pent", d: [53.5, 0, 12], m: [57, 96, 10] },
  { id: "pill", kind: "pill", w: 150, h: 54, shape: "box", r: 27, d: [74, 0, 0], m: [34, 96, -3] },
  { id: "bolt", kind: "bolt", w: 70, h: 110, shape: "box", r: 10, d: [74, 46, -72], m: [34, 140, -72] },
  { id: "cube", kind: "cube", w: 92, h: 92, shape: "hex", d: [16.5, 0, 0], m: [12, 96, 0] },
  { id: "knob", kind: "knob", w: 80, h: 80, shape: "circle", d: [7, 0, 0] },
  { id: "nut", kind: "nut", w: 40, h: 40, shape: "hex", d: [11.4, 0, 0], m: [71, 0, 0] },
  { id: "switch", kind: "switch", w: 120, h: 50, shape: "box", r: 25, d: [85, 0, 0] },
  { id: "nut2", kind: "nut", w: 40, h: 40, shape: "hex", d: [91, 0, 0] },
];

/** Keycaps drop first, in order, so the bench spells the word before the rest rains in. */
export const WORD = THINGS.filter((t) => t.kind === "key").map((t) => t.char).join("");
