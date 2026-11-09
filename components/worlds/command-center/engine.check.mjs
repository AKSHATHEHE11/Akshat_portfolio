// Self-check for the board engine. Run: node components/worlds/command-center/engine.check.mjs
// (Node ≥ 23.6 strips the TypeScript types on import.)
import assert from "node:assert/strict";
import { matchScenario, schedule, statusAt, charsAt } from "./engine.ts";
import { decisionos } from "../../../data/projects/decisionos.ts";

const { scenarios, agents } = decisionos.scene;
const order = agents.map((a) => a.id);
const id = (text) => scenarios[matchScenario(text, scenarios).index].id;

// presets map to themselves; free text maps to the nearest matter; nonsense is stable
scenarios.forEach((s, i) => assert.deepEqual(matchScenario(s.prompt, scenarios), { index: i, exact: true }));
assert.equal(id("should we open an office in Singapore?"), "sea");
assert.equal(id("Can we reduce our Google ads budget"), "paid");
assert.equal(id("hiring more developers next month"), "hire");
assert.equal(id("what if we increase pricing on renewals"), "price");
assert.equal(id("qwzx blorp"), id("qwzx blorp"));

// every scenario has a take per agent, and every region is a real city
const cities = new Set(decisionos.scene.cities.map((c) => c.id));
for (const s of scenarios)
  for (const a of order) {
    assert.ok(s.takes[a], `${s.id} missing ${a}`);
    s.takes[a].regions.forEach((r) => assert.ok(cities.has(r), `${s.id}/${a}: unknown city ${r}`));
  }

// calm: strictly in turn; chaos: overlapping; brief always after the last word
for (const s of scenarios) {
  const calm = schedule(s, order, "calm");
  order.slice(1).forEach((a, i) => assert.ok(calm.slots[a].think > calm.slots[order[i]].done));
  const chaos = schedule(s, order, "chaos");
  assert.ok(chaos.slots[order[1]].think < chaos.slots[order[0]].done, "chaos agents should overlap");
  for (const p of [calm, chaos, schedule(s, order, "reduced")])
    order.forEach((a) => assert.ok(p.brief > p.slots[a].done));
  const first = calm.slots[order[0]];
  assert.equal(statusAt(calm, order[0], first.think - 1), "waiting");
  assert.equal(statusAt(calm, order[0], first.speak), "speaking");
  assert.equal(charsAt(calm, order[0], first.done, 50), 50);
}
console.log("engine: ok");
