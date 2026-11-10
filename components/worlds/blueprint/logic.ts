// Pure rules behind the Synthora SID demo. No imports, so `node logic.check.mjs` can run it as is.

/* ── time ─────────────────────────────────────────────────────────────── */

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const two = (n: number) => String(n).padStart(2, "0");
export const fmt = (min: number) => `${two(Math.floor(min / 60) % 24)}:${two(((min % 60) + 60) % 60)}`;
/** 147 → "2 h 27 min", 12 → "12 min" */
export function span(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/* ── attendance: a semester budget of misses, not a percentage ───────── */

interface Tally {
  held: number;
  attended: number;
  planned: number;
}

/** Misses the whole semester can afford at `min` attendance (0–1). */
export const allowance = (s: Tally, min: number) => s.planned - Math.ceil(min * s.planned - 1e-9);
/** Classes you can still miss and finish at or above `min`. Negative = short by that many. */
export const margin = (s: Tally, min: number) => allowance(s, min) - (s.held - s.attended);
export const percent = (s: Tally) => (s.held ? Math.round((100 * s.attended) / s.held) : 100);

export type Risk = "safe" | "careful" | "last" | "short";
export const risk = (m: number): Risk => (m >= 3 ? "safe" : m >= 1 ? "careful" : m === 0 ? "last" : "short");

/** One class marked missed (it counts as held). Stops at the planned total. */
export const miss = <T extends Tally>(s: T): T => (s.held >= s.planned ? s : { ...s, held: s.held + 1 });

/* ── timetable ────────────────────────────────────────────────────────── */

interface SlotLike {
  day: number;
  start: string;
  end: string;
}

export const dayOf = <T extends SlotLike>(week: T[], day: number) =>
  week.filter((s) => s.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));

/** The class running now, else the next one today (null when the day is done). */
export function upNext<T extends SlotLike>(week: T[], day: number, now: number) {
  const today = dayOf(week, day);
  const live = today.find((s) => toMin(s.start) <= now && now < toMin(s.end));
  if (live) return { slot: live, live: true };
  const next = today.find((s) => toMin(s.start) > now);
  return next ? { slot: next, live: false } : null;
}

/** "B-204" → "B" */
export const buildingOf = (room: string) => room.split("-")[0];

/* ── walking routes on the campus plan (Dijkstra; the graph is ~20 nodes) ── */

interface Graph {
  nodes: { id: string; x: number; y: number }[];
  paths: [string, string][];
}

export function route(g: Graph, from: string, to: string) {
  const at = new Map(g.nodes.map((n) => [n.id, n]));
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set(g.nodes.map((n) => n.id));
  while (open.size) {
    let u = "";
    for (const id of open) if (dist.has(id) && (!u || dist.get(id)! < dist.get(u)!)) u = id;
    if (!u || u === to) break;
    open.delete(u);
    for (const [a, b] of g.paths) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || !open.has(v)) continue;
      const p = at.get(u)!;
      const q = at.get(v)!;
      const d = dist.get(u)! + Math.hypot(q.x - p.x, q.y - p.y);
      if (d < (dist.get(v) ?? Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
      }
    }
  }
  if (!dist.has(to)) return null;
  const ids = [to];
  while (ids[0] !== from) ids.unshift(prev.get(ids[0])!);
  return { points: ids.map((id) => at.get(id)!), metres: Math.round(dist.get(to)!) };
}

/** Walking minutes, rounded up: nobody is late by being told 2 when it's 2.6. */
export const walkMin = (metres: number, perMin: number) => Math.max(1, Math.ceil(metres / perMin));
export const pathD = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${p.x} ${p.y}`).join("L")}`;

/* ── grades ───────────────────────────────────────────────────────────── */

export const internalOf = (s: { internals: { got: number; of: number }[] }) =>
  s.internals.reduce((a, i) => ({ got: a.got + i.got, of: a.of + i.of }), { got: 0, of: 0 });

/** End-sem marks needed for a total of `min` (out of 100). null = out of reach this semester. */
export function needFor(internal: number, min: number, endMax: number, endPass: number) {
  const need = Math.max(endPass, min - internal);
  return need > endMax ? null : need;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* ── money ────────────────────────────────────────────────────────────── */

/** 50440 → "50,440" (Indian grouping: 1,23,456) */
export const rupees = (n: number) => n.toLocaleString("en-IN");

/* ── outcome metrics as dimensions ────────────────────────────────────── */

export interface Measure {
  /** counter start and end */
  from: number;
  to: number;
  /** dimension length at the start and the end, 0–1 */
  l0: number;
  l1: number;
  /** what the counter reads at value v */
  text: (v: number) => string;
  /** "5 → 1": the drawn object is `from` boxes merging into `to` */
  boxes?: [number, number];
}

const num = (s: string) => Number(s.replace(/,/g, ""));

/** Reads a metric value: "5 → 1", "38 s → 4 s", "−70%", "+40%", "3,040", "1.8×". */
export function measure(value: string): Measure {
  const v = value.trim();
  const arrow = v.match(/^([\d,.]+)\s*([^\d→]*?)\s*→\s*([\d,.]+)\s*(.*)$/);
  if (arrow) {
    const [a, b] = [num(arrow[1]), num(arrow[3])];
    const unit = arrow[4] ? ` ${arrow[4]}` : "";
    const big = Math.max(a, b) || 1;
    return {
      from: a,
      to: b,
      l0: a / big,
      l1: b / big,
      text: (x) => `${Math.round(x)}${unit}`,
      boxes: Number.isInteger(a) && Number.isInteger(b) && a <= 12 && b <= 12 && !unit ? [a, b] : undefined,
    };
  }
  const pc = v.match(/^([−+-])\s*([\d.]+)\s*%$/);
  if (pc) {
    const n = num(pc[2]);
    const down = pc[1] !== "+";
    return {
      from: 0,
      to: n,
      l0: down ? 1 : 100 / (100 + n),
      l1: down ? Math.max(0, 1 - n / 100) : 1,
      text: (x) => `${pc[1]}${Math.round(x)}%`,
    };
  }
  const plain = v.match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);
  if (plain) {
    const n = num(plain[2]);
    const dec = plain[2].split(".")[1]?.length ?? 0;
    const grouped = plain[2].includes(",");
    return {
      from: 0,
      to: n,
      l0: 0,
      l1: 1,
      text: (x) =>
        plain[1] + (grouped ? Math.round(x).toLocaleString("en-US") : dec ? x.toFixed(dec) : String(Math.round(x))) + plain[3],
    };
  }
  return { from: 0, to: 0, l0: 1, l1: 1, text: () => v };
}

/* ── drawing helpers ──────────────────────────────────────────────────── */

/** A revision cloud: a closed run of outward arcs around a rectangle (clockwise). */
export function cloud(x: number, y: number, w: number, h: number, r = 7) {
  const corners: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  let d = `M${x} ${y}`;
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n = Math.max(1, Math.round(len / (r * 1.6)));
    for (let k = 1; k <= n; k++) {
      const ex = p[0] + ((q[0] - p[0]) * k) / n;
      const ey = p[1] + ((q[1] - p[1]) * k) / n;
      d += `A${((len / n) * 0.62).toFixed(2)} ${((len / n) * 0.62).toFixed(2)} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    }
  });
  return `${d}Z`;
}
