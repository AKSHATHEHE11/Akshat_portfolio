// Self-check for the CredWise scorecard and its data. Run: node components/worlds/ledger/engine.check.mjs
// (Node ≥ 23.6 strips the TypeScript types on import.)
import assert from "node:assert/strict";
import { BASE, LEVERS, apply, bandOf, chain, describeFlip, explain, flips, scoreOf, verdict } from "./engine.ts";
import { credwise } from "../../../data/projects/credwise.ts";

const { scene } = credwise;
const by = Object.fromEntries(scene.borrowers.map((b) => [b.id, b]));

// the four files land where the story needs them: one per band at least, review first
const expected = { riya: [688, "review"], imran: [711, "approved"], aarav: [527, "declined"], lakshmi: [732, "approved"] };
for (const [id, [score, band]] of Object.entries(expected)) {
  const x = explain(by[id].profile);
  assert.equal(x.score, score, `${id} score`);
  assert.equal(x.band, band, `${id} band`);
  // reason codes + other add up to the score exactly
  assert.equal(BASE + x.top.reduce((s, f) => s + f.points, 0) + x.other, x.score, `${id} additivity`);
  assert.equal(x.top.length, 5);
  assert.ok(verdict(x, by[id].ask).endsWith("."));
}

// counterfactuals: every option really crosses the line it promises
for (const b of scene.borrowers) {
  const f = flips(b.profile);
  assert.ok(f.options.length > 0, `${b.id}: no way to change it`);
  for (const o of f.options) {
    const s = scoreOf(apply(b.profile, o.changes));
    assert.equal(s, o.score);
    if (f.worse) assert.ok(s < 700, `${b.id}: ${describeFlip(o, b.profile)} should break approval`);
    else assert.equal(bandOf(s), f.goal, `${b.id}: ${describeFlip(o, b.profile)} should reach ${f.goal}`);
  }
}
assert.equal(describeFlip(flips(by.riya.profile).options[0], by.riya.profile), "2 more months of income");
assert.equal(flips(by.aarav.profile).goal, "review");
assert.ok(flips(by.imran.profile).worse);

// monotonic levers: moving a lever the "up" way never lowers the score
for (const b of scene.borrowers)
  for (const l of LEVERS) {
    let last = -Infinity;
    for (let k = 0; k <= 20; k++) {
      const v = l.up > 0 ? l.min + ((l.max(b.profile) - l.min) * k) / 20 : l.max(b.profile) - ((l.max(b.profile) - l.min) * k) / 20;
      const s = scoreOf(apply(b.profile, [{ key: l.key, from: b.profile[l.key], to: Math.round(v) }]));
      assert.ok(s >= last, `${b.id}/${l.key} not monotonic`);
      last = s;
    }
  }

// data: the tape agrees with the profile, and every part of the world has its row
const LOANS = new Set(["EMI", "LOAN APP", "SHG EMI"]);
for (const b of scene.borrowers) {
  const emi = b.txns.filter((t) => LOANS.has(t.tag)).reduce((s, t) => s - t.amount, 0);
  assert.equal(emi, b.profile.emi, `${b.id}: EMI lines on the tape should add up to the profile`);
  assert.equal(b.profile.emi % 250, 0, `${b.id}: EMI must sit on the slider's 250 step`);
  b.txns.forEach((t) => assert.ok(!t.hit || t.narration.includes(t.hit), `${b.id}: "${t.hit}" not in "${t.narration}"`));
}
assert.equal(scene.audit.length, credwise.process.length);
assert.equal(scene.journal.length, credwise.decisions.length);
credwise.decisions.forEach((d, i) => assert.equal(scene.journal[i].lines.length, d.options.length));
assert.equal(scene.ticker.length, credwise.metrics.length);
const techs = new Set(credwise.technologies.map((t) => t.name));
scene.pipeline.forEach((s) => s.techs.forEach((t) => assert.ok(techs.has(t), `pipeline tech ${t} missing`)));
assert.equal(scene.pipeline.flatMap((s) => s.techs).length, techs.size, "every technology sits on the pipeline once");

// the pipeline's last packet is the first file's real explanation
const riya = explain(scene.borrowers[0].profile);
const codes = riya.top.map((f) => `${f.code} ${f.points > 0 ? "+" : "−"}${Math.abs(f.points)}`).join(" · ");
assert.equal(scene.pipeline.at(-1).sample, codes);
assert.ok(scene.pipeline.some((s) => s.packet === String(riya.score)));

// the audit chain: an edit breaks its own hash and every one after it, never the ones before
const entries = scene.audit.map((a) => `${a.at}|${a.action}|${a.artefact}`);
const signed = chain(entries);
const edited = chain(entries.map((e, i) => (i === 2 ? `${e}!` : e)));
assert.deepEqual(chain(entries), signed, "chain is deterministic");
signed.forEach((h, i) => assert.equal(h === edited[i], i < 2, `audit hash ${i}`));
assert.equal(new Set(signed).size, signed.length);

console.log("ledger engine: ok");
for (const b of scene.borrowers) {
  const x = explain(b.profile);
  const f = flips(b.profile);
  console.log(`  ${b.name.padEnd(14)} ${x.score} ${x.band.padEnd(9)} → ${f.goal}: ${f.options.map((o) => `${describeFlip(o, b.profile)} (${o.score})`).join(" | ")}`);
}
