// The board's session engine — pure functions, no React (checked by engine.check.mjs).
// A session is a fixed timeline: convene → each agent thinks, then streams its quote → brief.
// Calm: agents speak in turn. Chaos: they talk over each other. Reduced motion: no streaming.
import type { AgentId, Scenario, Stance } from "./scene";

export type Mode = "calm" | "chaos" | "reduced";
export type AgentStatus = "idle" | "waiting" | "thinking" | "speaking" | "done";
export interface Slot {
  think: number;
  speak: number;
  done: number;
}
export interface Plan {
  slots: Record<string, Slot>;
  brief: number;
  /** characters per second while streaming */
  cps: number;
}

export const CONVENE_MS = 900;

export function schedule(s: Scenario, order: AgentId[], mode: Mode): Plan {
  const cps = mode === "chaos" ? 90 : 62;
  const slots: Record<string, Slot> = {};
  let t = CONVENE_MS;
  let end = CONVENE_MS;
  order.forEach((id, i) => {
    const len = s.takes[id].quote.length;
    if (mode === "chaos") {
      const think = CONVENE_MS + i * 320;
      const speak = think + 420;
      slots[id] = { think, speak, done: speak + (len / cps) * 1000 };
    } else if (mode === "reduced") {
      slots[id] = { think: t, speak: t + 250, done: t + 250 };
      t += 600;
    } else {
      const speak = t + 800;
      const done = speak + (len / cps) * 1000;
      slots[id] = { think: t, speak, done };
      t = done + 450;
    }
    end = Math.max(end, slots[id].done);
  });
  return { slots, brief: end + 700, cps };
}

export function statusAt(plan: Plan | null, id: AgentId, t: number): AgentStatus {
  if (!plan) return "idle";
  const s = plan.slots[id];
  if (t < s.think) return "waiting";
  if (t < s.speak) return "thinking";
  if (t < s.done) return "speaking";
  return "done";
}

/** How much of the quote is on screen at time t. */
export function charsAt(plan: Plan, id: AgentId, t: number, len: number) {
  const s = plan.slots[id];
  if (t >= s.done) return len;
  return Math.max(0, Math.min(len, Math.floor(((t - s.speak) / 1000) * plan.cps)));
}

/**
 * Free text → the closest matter on file: most keyword hits wins (prefix match, so "hiring" hits "hire").
 * No hit at all → a stable hash, so the same question always lands on the same matter.
 * ponytail: keyword scoring, not semantics; swap for embeddings if the board ever gets real agents.
 */
export function matchScenario(text: string, scenarios: Scenario[]): { index: number; exact: boolean } {
  const q = text.toLowerCase().trim();
  const exact = scenarios.findIndex((s) => s.prompt.toLowerCase() === q);
  if (exact >= 0) return { index: exact, exact: true };
  const words = q.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  let best = -1;
  let bestScore = 0;
  scenarios.forEach((s, i) => {
    const score = s.keywords.filter((k) =>
      words.some((w) => w === k || (k.length > 3 && w.startsWith(k)) || (w.length > 3 && k.startsWith(w))),
    ).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  if (best >= 0) return { index: best, exact: false };
  let h = 0;
  for (const c of q) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { index: h % scenarios.length, exact: false };
}

export const STANCE_LABEL: Record<Stance, string> = { for: "For", against: "Against", conditional: "Conditional" };

export function tally(s: Scenario, order: AgentId[]) {
  const n = { for: 0, against: 0, conditional: 0 };
  order.forEach((id) => n[s.takes[id].stance]++);
  return n;
}
