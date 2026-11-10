// Self-check for the Synthora SID rules + QR encoder. Run: node components/worlds/blueprint/logic.check.mjs
// (Node ≥ 23.6 strips the TypeScript types on import.)
import assert from "node:assert/strict";
import { allowance, margin, risk, miss, upNext, toMin, fmt, span, route, walkMin, needFor, measure, rupees, cloud } from "./logic.ts";
import { rs, format, qr } from "./qr.ts";
import { synthoraSid } from "../../../data/projects/synthora-sid.ts";

const { scene } = synthoraSid;
const MIN = scene.minAttendance;
const by = Object.fromEntries(scene.subjects.map((s) => [s.short, s]));

// margins: planned 42 at 75% → need 32, so 10 misses a semester; DBMS has used 8
assert.equal(allowance(by.DBMS, MIN), 10);
assert.deepEqual(
  scene.subjects.map((s) => margin(s, MIN)),
  [2, 8, 1, 0, 4, 5],
);
assert.equal(risk(2), "careful");
assert.equal(risk(0), "last");
assert.equal(risk(-1), "short");
assert.equal(margin(miss(by["P&S"]), MIN), -1); // one more and P&S is short
const full = { held: 40, attended: 30, planned: 40 };
assert.equal(miss(full), full); // can't miss beyond the plan

// the morning: 09:48 Tuesday → DBMS lab at 10:00, 12 min away
const now = toMin(scene.now.time);
const next = upNext(scene.week, scene.now.day, now);
assert.equal(next.slot.subject, "DBMS");
assert.equal(next.live, false);
assert.equal(toMin(next.slot.start) - now, 12);
assert.equal(upNext(scene.week, 1, toMin("10:30")).live, true);
assert.equal(upNext(scene.week, 1, toMin("16:00")), null);
assert.equal(fmt(toMin("09:05")), "09:05");
assert.equal(span(147), "2 h 27 min");

// walk: library steps → Block B door is 195 m, 3 minutes at 75 m/min; every building is reachable
const r = route(scene.campus, scene.campus.you.node, "dB");
assert.equal(r.metres, 195);
assert.equal(walkMin(r.metres, scene.campus.walk), 3);
for (const b of scene.campus.buildings) assert.ok(route(scene.campus, scene.campus.you.node, b.door), `no route to ${b.id}`);
for (const s of scene.week) assert.ok(scene.campus.buildings.some((b) => b.id === s.room.split("-")[0]), `unknown room ${s.room}`);
for (const s of scene.week) assert.ok(by[s.subject], `unknown subject ${s.subject}`);

// grades: 31/40 internal → A+ (80) needs 49/60; O (90) needs 59; nothing below the 24 pass mark
assert.equal(needFor(31, 80, 60, 24), 49);
assert.equal(needFor(31, 90, 60, 24), 59);
assert.equal(needFor(31, 40, 60, 24), 24);
assert.equal(needFor(22, 90, 60, 24), null);
assert.equal(rupees(50440), "50,440");

// metric values read as dimensions
assert.deepEqual([measure("5 → 1").from, measure("5 → 1").to, measure("5 → 1").l1], [5, 1, 0.2]);
assert.deepEqual(measure("5 → 1").boxes, [5, 1]);
assert.equal(measure("38 s → 4 s").text(38), "38 s");
assert.equal(measure("38 s → 4 s").boxes, undefined);
assert.equal(measure("−70%").l1.toFixed(2), "0.30");
assert.equal(measure("−70%").text(70), "−70%");
assert.equal(measure("3,040").text(3040), "3,040");
assert.equal(measure("3,040").l0, 0);
assert.match(cloud(0, 0, 100, 40), /^M0 0(A[\d. ]+0 0 1 [\d.]+ [\d.]+)+Z$/);

// QR: Reed–Solomon against the classic "HELLO WORLD" 1-M example, format bits for L/mask 0
assert.deepEqual(rs([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
assert.equal(format(0), 0b111011111000100);
assert.equal(qr(`SID:${scene.student.roll}`).length, 21); // 13 bytes → version 1
const m = qr(`KIT/SID/${scene.student.roll}/${scene.student.validTill}`); // 29 bytes → version 2
assert.equal(m.length, 25);
const finder = (r0, c0) => [0, 1, 2, 3, 4, 5, 6].map((c) => m[r0 + 3][c0 + c]).join();
for (const [r0, c0] of [[0, 0], [0, 18], [18, 0]]) assert.equal(finder(r0, c0), "true,false,true,true,true,false,true");
assert.equal(m[25 - 8][8], true); // dark module

console.log("blueprint logic: ok");
