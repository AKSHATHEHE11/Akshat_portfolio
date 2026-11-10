// What lives in the tray. Bench objects reuse the home bench's skins (ThingView + bench.css);
// the steel parts (bearing, washer) are the tray's own. Sizes are px at --u = 1 (see engine.ts).
import type { Thing } from "@/components/home/bench/things";

export interface TrayThing {
  id: string;
  kind: Thing["kind"] | "bearing" | "washer";
  char?: string;
  tone?: Thing["tone"];
  w: number;
  h: number;
  shape: Thing["shape"];
  r?: number;
  /** the electromagnet pulls it */
  metal?: true;
  /** also in the tray on phones (they get roughly half the bodies) */
  phone?: true;
}

export const TRAY: TrayThing[] = [
  { id: "l", kind: "key", char: "L", tone: "orange", w: 96, h: 96, shape: "box", r: 14, phone: true },
  { id: "a", kind: "key", char: "A", tone: "cream", w: 96, h: 96, shape: "box", r: 14, phone: true },
  { id: "b", kind: "key", char: "B", tone: "ink", w: 96, h: 96, shape: "box", r: 14, phone: true },
  { id: "crt", kind: "crt", w: 150, h: 120, shape: "box", r: 18 },
  { id: "ring", kind: "ring", w: 92, h: 92, shape: "circle", phone: true },
  { id: "pill", kind: "pill", w: 150, h: 54, shape: "box", r: 27, phone: true },
  { id: "star", kind: "star", w: 96, h: 96, shape: "pent", phone: true },
  { id: "bolt", kind: "bolt", w: 70, h: 110, shape: "box", r: 10 },
  { id: "cube", kind: "cube", w: 92, h: 92, shape: "hex", phone: true },
  { id: "knob", kind: "knob", w: 80, h: 80, shape: "circle" },
  { id: "switch", kind: "switch", w: 120, h: 50, shape: "box", r: 25 },
  { id: "nut1", kind: "nut", w: 44, h: 44, shape: "hex", metal: true, phone: true },
  { id: "nut2", kind: "nut", w: 44, h: 44, shape: "hex", metal: true, phone: true },
  { id: "nut3", kind: "nut", w: 36, h: 36, shape: "hex", metal: true },
  { id: "ball1", kind: "bearing", w: 38, h: 38, shape: "circle", metal: true, phone: true },
  { id: "ball2", kind: "bearing", w: 30, h: 30, shape: "circle", metal: true },
  { id: "washer", kind: "washer", w: 50, h: 50, shape: "circle", metal: true, phone: true },
];

export type Gravity = "down" | "zero" | "up";
export const GRAVITY: { id: Gravity; label: string; y: number }[] = [
  { id: "down", label: "1G ↓", y: 1 },
  { id: "zero", label: "0G", y: 0 },
  { id: "up", label: "1G ↑", y: -1 },
];
