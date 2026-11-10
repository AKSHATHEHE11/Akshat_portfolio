// What sits on the desk and what each thing stands for. Topics come from data/skills.ts where a skill
// group exists; the rest are this page's own labels. Order = depth order on the desk (back → front),
// which is also the numbering, the tab order and the phone's exhibit order.
import { skillMap, type SkillGroup } from "@/data/skills";
import { pad } from "@/lib/utils";
import { ART, SCENE, type ArtId } from "./art";
import { P } from "./iso";

export type Body =
  | { kind: "skills"; groups: SkillGroup["id"][] }
  | { kind: "experiments" }
  | { kind: "interests" }
  | { kind: "journey" };

const label = (id: SkillGroup["id"]) => skillMap.find((g) => g.id === id)?.label ?? id;

interface Spec {
  id: ArtId;
  name: string;
  topic: string;
  body: Body;
  /** where the leader starts, in desk space */
  at: [number, number, number];
  /** leader elbow, in screen units from the anchor; the label sits on `side` of it */
  to: [number, number];
  side: "l" | "r" | "t";
}

const SPECS: Spec[] = [
  { id: "monitor", name: "Monitor", topic: "Development", body: { kind: "skills", groups: ["frontend", "backend"] }, at: [70, 62, 198], to: [-36, -30], side: "l" },
  { id: "lamp", name: "Cloud lamp", topic: label("cloud"), body: { kind: "skills", groups: ["cloud"] }, at: [330, 36, 140], to: [30, -30], side: "r" },
  { id: "beakers", name: "Beakers", topic: "Experimentation", body: { kind: "experiments" }, at: [540, 50, 64], to: [0, -74], side: "t" },
  { id: "robot", name: "Chip robot", topic: label("ai"), body: { kind: "skills", groups: ["ai"] }, at: [441, 160, 64], to: [-44, -34], side: "l" },
  { id: "sketchbook", name: "Sketchbook, two pens", topic: label("design"), body: { kind: "skills", groups: ["design"] }, at: [70, 200, 7], to: [-30, -52], side: "l" },
  { id: "passport", name: "Passport", topic: "Experience", body: { kind: "journey" }, at: [300, 248, 8], to: [-48, 70], side: "l" },
  { id: "interests", name: "Headphones, ticket, macro pad", topic: "Interests", body: { kind: "interests" }, at: [490, 204, 7], to: [44, 104], side: "r" },
];

const pct = (v: number) => `${Math.round(v * 10000) / 100}%`;
/** widest exhibit sets the phone scale, so every object keeps its size relative to the others */
const WIDEST = Math.max(...Object.values(ART).map((a) => a.box.w));

export const OBJECTS = SPECS.map((s, i) => {
  const { box } = ART[s.id];
  const [ax, ay] = P(...s.at);
  const ex = ax + s.to[0];
  const ey = ay + s.to[1];
  return {
    ...s,
    n: pad(i + 1),
    art: ART[s.id].art,
    box,
    /** position on the stage, % of the scene */
    place: { left: pct((box.x - SCENE.x) / SCENE.w), top: pct((box.y - SCENE.y) / SCENE.h), width: pct(box.w / SCENE.w), height: pct(box.h / SCENE.h) },
    /** width in the phone exhibit grid, % of its cell */
    phone: pct(Math.min(1, (box.w / WIDEST) * 1.12)),
    leader: { x1: ax, y1: ay, x2: ex, y2: ey },
    elbow: { left: pct((ex - SCENE.x) / SCENE.w), top: pct((ey - SCENE.y) / SCENE.h) },
  };
});

export type RoomObject = (typeof OBJECTS)[number];
export type ObjectId = RoomObject["id"];
