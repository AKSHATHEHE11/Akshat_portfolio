// Self-check for the instrument's vocabulary and the Null Field data. Run:
//   node components/worlds/lab/patch.check.mjs      (Node ≥ 23.6 strips the TypeScript types on import)
import assert from "node:assert/strict";
import { clampParam, hashPatch, levels, MEMORY_MAX, nameFor, PARAMS, parseMemory, sanitize, spec, taste } from "./patch.ts";
import { nullField } from "../../../data/projects/null-field.ts";

const { scene } = nullField;
const base = scene.presets[0].patch;
const valid = (p, where) => {
  for (const s of PARAMS) assert.ok(p[s.key] >= s.min && p[s.key] <= s.max, `${where}: ${s.key}=${p[s.key]} out of range`);
  assert.equal(p.palette.length, 12, `${where}: palette needs 12 numbers`);
  assert.equal(typeof p.mirror, "boolean");
  assert.equal(typeof p.polar, "boolean");
};

// ranges: clamp, wrap, integer pixels, junk
assert.equal(clampParam("warp", 9), spec.warp.max);
assert.equal(clampParam("warp", -1), spec.warp.min);
assert.ok(Math.abs(clampParam("hue", 1.25) - 0.25) < 1e-9);
assert.ok(Math.abs(clampParam("hue", -0.25) - 0.75) < 1e-9);
assert.equal(clampParam("pixel", 3.6), 4);
assert.equal(clampParam("scale", NaN), spec.scale.min);
assert.equal(levels(0), 40);
assert.equal(levels(1), 2);

// data: every factory patch and every firmware build is playable
scene.presets.forEach((p) => valid(p.patch, p.name));
scene.patchNotes.forEach((n) => valid({ ...base, ...n.build }, `v${n.version}`));
assert.ok(scene.presets.length >= 1 && scene.presets.length <= 9, "presets map to keys 1–9");
assert.equal(scene.patchNotes.length, nullField.process.length, "one patch note per process step");
assert.equal(scene.meters.length, nullField.metrics.length, "one meter per metric");
assert.equal(scene.story.length, 3, "challenge, solution, outcome");
for (const k of scene.story.flatMap((b) => Object.keys(b.tweak))) assert.ok(spec[k], `story tweak on unknown control ${k}`);
// the flow screens are drawn by stage index in FLOW_FRAG: the order is part of the shader
assert.deepEqual(
  scene.flow.map((s) => s.id),
  ["uniforms", "noise", "warp", "palette", "feedback", "crush", "output"],
);
const tech = new Set(nullField.technologies.map((t) => t.name));
for (const s of scene.flow) for (const t of s.tech) assert.ok(tech.has(t), `${s.id}: unknown technology ${t}`);
for (const t of nullField.technologies) assert.ok(scene.flow.some((s) => s.tech.includes(t.name)), `${t.name} powers no stage`);

// names: stable per patch, never a duplicate
const words = scene.names;
assert.equal(nameFor(base, words), nameFor({ ...base, palette: [...base.palette] }, words));
assert.match(nameFor(base, words), /^\w+ \w+ \d{3}$/);
const first = nameFor(base, words);
assert.notEqual(nameFor(base, words, [first]), first);
assert.notEqual(hashPatch(base), hashPatch({ ...base, warp: base.warp + 0.1 }));

// taste: always inside the instrument's ranges, palettes from the bank
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const palettes = scene.presets.map((p) => p.patch.palette);
for (let i = 0; i < 300; i++) {
  const p = taste(palettes, rnd);
  valid(p, `taste #${i}`);
  assert.ok(palettes.some((pal) => pal.join() === p.palette.join()));
}

// memory: whatever is in localStorage comes back clean (or not at all)
assert.deepEqual(parseMemory(null, base), []);
assert.deepEqual(parseMemory("{nope", base), []);
assert.deepEqual(parseMemory('{"a":1}', base), []);
const mem = parseMemory(
  JSON.stringify([
    { id: "m1", name: "  Wet Neon 001 ", at: 1, patch: { warp: 99, pixel: 2.4, mirror: true, palette: [1, 2] } },
    { id: "m1", name: "Duplicate", at: 2, patch: {} },
    { id: "", name: "No id", patch: {} },
    { id: "m2", name: "", patch: {} },
    null,
    { id: "m3", name: "Bad palette", at: "x", patch: { palette: Array(12).fill(9) } },
  ]),
  base,
);
assert.deepEqual(
  mem.map((m) => m.id),
  ["m1", "m3"],
);
assert.equal(mem[0].name, "Wet Neon 001");
assert.equal(mem[0].patch.warp, spec.warp.max);
assert.equal(mem[0].patch.pixel, 2);
assert.equal(mem[0].patch.mirror, true);
assert.deepEqual(mem[0].patch.palette, base.palette);
assert.deepEqual(mem[1].patch.palette, base.palette);
assert.equal(mem[1].at, 0);
const many = Array.from({ length: MEMORY_MAX + 5 }, (_, i) => ({ id: `m${i}`, name: `P ${i}`, at: i, patch: {} }));
assert.equal(parseMemory(JSON.stringify(many), base).length, MEMORY_MAX);
assert.deepEqual(sanitize(undefined, base), base);

console.log("patch: ok");
