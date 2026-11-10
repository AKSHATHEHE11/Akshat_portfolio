// Isometric drawing kit for the room. Desk space: x runs along the desk's long edge, y towards the
// sitter, z up. Every point goes through P(), which also grows the bounding box of whatever is being
// measured, so each object knows its own screen box (no hand-typed viewBoxes).
import type { ReactNode } from "react";

const C = Math.cos(Math.PI / 6);
const S = 0.5;
/** a circle of radius r on a horizontal plane projects to an ellipse with these semi-axes */
export const RX = Math.SQRT2 * C;
export const RY = Math.SQRT2 * S;

export type V3 = readonly [x: number, y: number, z: number];
export type Box = { x: number; y: number; w: number; h: number };

export const INK = "#111111";
export const MAT = {
  cream: { t: "#fbfaf6", l: "#ebe5da", r: "#d3cbbd" },
  desk: { t: "#e4dccd", l: "#d0c5b1", r: "#b9ad97" },
  ink: { t: "#3a3834", l: "#232220", r: "#151514" },
  orange: { t: "#ff8a5c", l: "#ff5a1f", r: "#d94814" },
  lime: { t: "#ecff66", l: "#d8ff00", r: "#adc800" },
  steel: { t: "#e2dfd8", l: "#c3bfb6", r: "#a19d93" },
} as const;
export type Mat = (typeof MAT)[keyof typeof MAT];

let acc: number[] | null = null;
const grow = (X: number, Y: number) => {
  if (!acc) return;
  acc[0] = Math.min(acc[0], X);
  acc[1] = Math.min(acc[1], Y);
  acc[2] = Math.max(acc[2], X);
  acc[3] = Math.max(acc[3], Y);
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** desk → screen */
export function P(x: number, y: number, z = 0): [number, number] {
  const X = (x - y) * C;
  const Y = (x + y) * S - z;
  grow(X, Y);
  return [r1(X), r1(Y)];
}

/** Runs a drawing and returns it with its screen box (+ pad for strokes). */
export function measure<T>(draw: () => T, pad = 4): { art: T; box: Box } {
  acc = [Infinity, Infinity, -Infinity, -Infinity];
  const art = draw();
  const [a, b, c, d] = acc;
  acc = null;
  return { art, box: { x: r1(a - pad), y: r1(b - pad), w: r1(c - a + 2 * pad), h: r1(d - b + 2 * pad) } };
}

export const union = (...bs: Box[]): Box => {
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
};

export const pts = (...ps: V3[]) => ps.map((p) => P(...p).join(",")).join(" ");

/** Rotate a desk point around (cx, cy) by deg (about z). */
export const turn = (cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return (x: number, y: number): [number, number] => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

/** Axis-aligned box with its three visible faces (+x right, +y left, top). */
export function box(x: number, y: number, z: number, w: number, d: number, h: number, m: Mat, cls?: string) {
  return (
    <g className={cls}>
      <polygon points={pts([x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y, z])} fill={m.r} />
      <polygon points={pts([x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x, y + d, z])} fill={m.l} />
      <polygon points={pts([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h])} fill={m.t} />
    </g>
  );
}

/** Box turned about its centre by deg (|deg| < 45 keeps the same two side faces in view). */
export function rbox(cx: number, cy: number, z: number, w: number, d: number, h: number, deg: number, m: Mat) {
  const t = turn(cx, cy, deg);
  const [a, b, c, e] = [t(cx - w / 2, cy - d / 2), t(cx + w / 2, cy - d / 2), t(cx + w / 2, cy + d / 2), t(cx - w / 2, cy + d / 2)];
  const at = (p: [number, number], zz: number): V3 => [p[0], p[1], zz];
  return (
    <g>
      <polygon points={pts(at(b, z + h), at(c, z + h), at(c, z), at(b, z))} fill={m.r} />
      <polygon points={pts(at(e, z + h), at(c, z + h), at(c, z), at(e, z))} fill={m.l} />
      <polygon points={pts(at(a, z + h), at(b, z + h), at(c, z + h), at(e, z + h))} fill={m.t} />
    </g>
  );
}

/** Vertical cylinder: side + top ellipse. */
export function cyl(cx: number, cy: number, z0: number, z1: number, r: number, m: Mat, top?: string) {
  const [bx, by] = P(cx, cy, z0);
  const [tx, ty] = P(cx, cy, z1);
  const rx = r1(r * RX);
  const ry = r1(r * RY);
  grow(bx - rx, by + ry);
  grow(bx + rx, ty - ry);
  return (
    <g>
      <path d={`M${tx - rx} ${ty}L${bx - rx} ${by}A${rx} ${ry} 0 0 0 ${bx + rx} ${by}L${tx + rx} ${ty}Z`} fill={m.l} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={top ?? m.t} />
    </g>
  );
}

/** Flat ellipse lying on a horizontal plane (shadows, rims, liquid surfaces). */
export function disc(cx: number, cy: number, z: number, r: number, props: React.SVGProps<SVGEllipseElement>) {
  const [x, y] = P(cx, cy, z);
  const rx = r1(r * RX);
  const ry = r1(r * RY);
  grow(x - rx, y - ry);
  grow(x + rx, y + ry);
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} {...props} />;
}

/** Draw in a horizontal plane at height z: local u runs along +x (turned by deg), v along +y. */
export function onTop(x: number, y: number, z: number, deg: number, children: ReactNode) {
  const a = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [X, Y] = P(x, y, z);
  const m = [(c - s) * C, (c + s) * S, (-s - c) * C, (-s + c) * S].map((n) => n.toFixed(4)).join(" ");
  return <g transform={`matrix(${m} ${X} ${Y})`}>{children}</g>;
}

/** Draw on a +y face (the side facing the sitter): local u along +x, v downwards from height z. */
export function onFront(x: number, y: number, z: number, children: ReactNode) {
  const [X, Y] = P(x, y, z);
  return <g transform={`matrix(${C.toFixed(4)} ${S} 0 1 ${X} ${Y})`}>{children}</g>;
}

/** Draw on a +x face: local u runs from the front edge (y) towards the back, v downwards from z. */
export function onSide(x: number, y: number, z: number, children: ReactNode) {
  const [X, Y] = P(x, y, z);
  return <g transform={`matrix(${C.toFixed(4)} ${-S} 0 1 ${X} ${Y})`}>{children}</g>;
}

/** Grow the current measurement by a raw screen point (for hand-drawn screen-space shapes). */
export const reach = (X: number, Y: number) => grow(X, Y);
