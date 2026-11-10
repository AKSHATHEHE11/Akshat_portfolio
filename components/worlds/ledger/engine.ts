// The CredWise scorecard — pure functions, no React, no imports with runtime code (engine.check.mjs
// runs this file directly in Node).
//
// How a score is made
//   score = BASE + Σ points(factor), clamped to 300–900.
//   Each factor is a clamped straight line over one fact read from the statement (table below).
//   Points are rounded to whole numbers BEFORE they are summed, so the five reason codes plus
//   "other" add up to the score exactly — the additivity SHAP gives a tree model, here by construction.
//
//   factor  fact                         points                       range
//   income  months with income credited  (m − 8) × 9                  −72 … +72
//   emi     EMIs as % of income (FOIR)   (30 − foir) × 2              −110 … +40
//   util    % of card/overdraft used     (35 − u) × 1.1               −72 … +33
//   bounce  bounced payments, 12 months  20 − 36 × b                  −124 … +20
//   buffer  balance in days of spending  (d − 14) × 1.6               −16 … +40
//   rent    months rent left by the 5th  (r − 6) × 3.5, none → 0      −21 … +21
//   cash    % of spending taken as cash  (25 − c) × 0.8               −36 … +16
//
//   Bands: ≥ 700 approved · 620–699 review · < 620 declined.
//
// What would change it
//   Four levers (EMI, months of income, utilisation, bounces) are walked one step at a time from the
//   statement value toward the next band — or, for an approved file, toward the review line. Every
//   single-lever change that crosses is a candidate; pairs (of levers no single change used) are
//   tried only when fewer than two singles exist. Cost = distance moved ÷ the lever's range; the two
//   cheapest are offered.
import type { Band, Profile } from "./scene";

export const BASE = 600;
export const MIN = 300;
export const MAX = 900;
export const CUT = { approved: 700, review: 620 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** half away from zero, so +3.5 and −3.5 round symmetrically */
const round = (v: number) => Math.sign(v) * Math.round(Math.abs(v));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** ₹ with Indian digit grouping: 250000 → "₹2,50,000" */
export const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** fixed obligations to income, % */
export const foir = (p: Profile) => (p.income > 0 ? (p.emi / p.income) * 100 : 100);

export type FactorKey = "income" | "emi" | "util" | "bounce" | "buffer" | "rent" | "cash";

const POINTS: Record<FactorKey, (p: Profile) => number> = {
  income: (p) => clamp((p.incomeMonths - 8) * 9, -72, 72),
  emi: (p) => clamp((30 - foir(p)) * 2, -110, 40),
  util: (p) => clamp((35 - p.utilisation) * 1.1, -72, 33),
  bounce: (p) => clamp(20 - 36 * p.bounces, -124, 20),
  buffer: (p) => clamp((p.bufferDays - 14) * 1.6, -16, 40),
  rent: (p) => (p.rentOnTime === null ? 0 : clamp((p.rentOnTime - 6) * 3.5, -21, 21)),
  cash: (p) => clamp((25 - p.cashShare) * 0.8, -36, 16),
};
const KEYS = Object.keys(POINTS) as FactorKey[];

/** Reason-code names as the desk prints them. */
export const CODES: Record<FactorKey, string> = {
  income: "INC-REG",
  emi: "EMI-LOAD",
  util: "UTIL",
  bounce: "BOUNCE",
  buffer: "BUFFER",
  rent: "RENT",
  cash: "CASH",
};

const lineName = (p: Profile) => (p.line === "card" ? "the card" : "the overdraft");

/** The reason in words. Lower-case start: it is spliced into sentences. */
function say(key: FactorKey, p: Profile, good: boolean): string {
  const line = lineName(p);
  switch (key) {
    case "income":
      return good
        ? `income landed in ${p.incomeMonths} of the last ${Math.max(p.incomeMonths, p.months)} months`
        : `only ${plural(p.incomeMonths, "month")} of income on record`;
    case "emi":
      return good ? `EMIs take only ${Math.round(foir(p))}% of income` : `EMIs already take ${Math.round(foir(p))}% of income`;
    case "util":
      return good ? `${line} sits at ${p.utilisation}% of its limit` : `${line} is at ${p.utilisation}% of its limit`;
    case "bounce":
      return p.bounces === 0 ? "no bounced payments in a year" : `${p.bounces === 1 ? "one" : p.bounces} bounced payment${p.bounces === 1 ? "" : "s"} in a year`;
    case "buffer":
      return good ? `keeps ${p.bufferDays} days of spending in the bank` : `the balance covers ${plural(p.bufferDays, "day")} of spending`;
    case "rent":
      if (p.rentOnTime === null) return "no rent on the statement";
      return good ? `rent left by the 5th in ${p.rentOnTime} of 12 months` : `rent was late in ${12 - p.rentOnTime} of 12 months`;
    case "cash":
      return good ? `only ${p.cashShare}% of spending is cash` : `${p.cashShare}% of spending goes out as cash, which is hard to trace`;
  }
}

export interface Factor {
  key: FactorKey;
  code: string;
  points: number;
  text: string;
}

const pointsOf = (p: Profile) => KEYS.reduce((s, k) => s + round(POINTS[k](p)), 0);
export const scoreOf = (p: Profile) => clamp(BASE + pointsOf(p), MIN, MAX);
export const bandOf = (s: number): Band => (s >= CUT.approved ? "approved" : s >= CUT.review ? "review" : "declined");

export interface Explanation {
  score: number;
  band: Band;
  /** every factor, biggest |points| first */
  factors: Factor[];
  /** the five reason codes */
  top: Factor[];
  /** what the other factors add up to */
  other: number;
}

export function explain(p: Profile): Explanation {
  const factors = KEYS.map((key) => {
    const points = round(POINTS[key](p));
    return { key, code: CODES[key], points, text: say(key, p, points >= 0) };
  }).sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || KEYS.indexOf(a.key) - KEYS.indexOf(b.key));
  const score = scoreOf(p);
  const top = factors.slice(0, 5);
  return { score, band: bandOf(score), factors, top, other: factors.slice(5).reduce((s, f) => s + f.points, 0) };
}

/** The verdict a person would write on the file. */
export function verdict(x: Explanation, ask: { amount: number; months: number }) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const pos = x.factors.filter((f) => f.points > 0);
  const neg = x.factors.filter((f) => f.points < 0);
  if (x.band === "approved")
    return `Approve ${rupees(ask.amount)} over ${ask.months} months. ${cap(pos[0]?.text ?? "the statement holds up")}${pos[1] ? `, and ${pos[1].text}` : ""}.`;
  if (x.band === "review")
    return `Send it to an analyst. ${cap(pos[0]?.text ?? "nothing stands out")}${neg[0] ? `, but ${neg[0].text}` : ""}.`;
  return `Not yet. ${cap(neg[0]?.text ?? "the statement is too quiet to lend on")}${neg[1] ? `, and ${neg[1].text}` : ""}.`;
}

/* ── levers + counterfactuals ─────────────────────────────────────────────── */

export type Lever = "emi" | "incomeMonths" | "utilisation" | "bounces";

export interface LeverSpec {
  key: Lever;
  min: number;
  max: (p: Profile) => number;
  step: number;
  /** +1 if raising the lever raises the score */
  up: 1 | -1;
}

export const LEVERS: LeverSpec[] = [
  { key: "emi", min: 0, max: (p) => Math.max(p.emi, Math.ceil((p.income * 0.7) / 500) * 500), step: 250, up: -1 },
  { key: "incomeMonths", min: 0, max: () => 24, step: 1, up: 1 },
  { key: "utilisation", min: 0, max: () => 100, step: 1, up: -1 },
  { key: "bounces", min: 0, max: () => 6, step: 1, up: -1 },
];

export interface Change {
  key: Lever;
  from: number;
  to: number;
}

export interface Flip {
  changes: Change[];
  score: number;
  band: Band;
  cost: number;
}

export interface Flips {
  /** the band the options reach */
  goal: Band;
  /** true for an approved file: the options are what would break it */
  worse: boolean;
  options: Flip[];
}

/** The profile with some levers moved. */
export function apply(p: Profile, changes: Change[]): Profile {
  const q = { ...p };
  for (const c of changes) q[c.key] = c.to;
  return q;
}

/** Every value a lever can take moving from the statement value in one direction, nearest first. */
function path(l: LeverSpec, p: Profile, dir: number) {
  const out: number[] = [];
  for (let v = p[l.key] + dir * l.step; v >= l.min && v <= l.max(p); v += dir * l.step) out.push(v);
  return out;
}

export function flips(p: Profile): Flips {
  const now = bandOf(scoreOf(p));
  const worse = now === "approved";
  const goal: Band = now === "review" ? "approved" : "review";
  const line = now === "declined" ? CUT.review : CUT.approved;
  const hit = (s: number) => (worse ? s < line : s >= line);
  const cost = (l: LeverSpec, v: number) => Math.abs(v - p[l.key]) / (l.max(p) - l.min);
  const paths = LEVERS.map((l) => path(l, p, worse ? -l.up : l.up));
  const one = (k: Lever, v: number) => scoreOf(apply(p, [{ key: k, from: p[k], to: v }]));
  const flip = (changes: Change[], c: number): Flip => {
    const s = scoreOf(apply(p, changes));
    return { changes, score: s, band: bandOf(s), cost: c };
  };

  const singles: Flip[] = [];
  LEVERS.forEach((l, i) => {
    const v = paths[i].find((to) => hit(one(l.key, to)));
    if (v !== undefined) singles.push(flip([{ key: l.key, from: p[l.key], to: v }], cost(l, v)));
  });
  singles.sort((a, b) => a.cost - b.cost);
  if (singles.length >= 2) return { goal, worse, options: singles.slice(0, 2) };

  // ponytail: pairs are sampled (≤ 40 values per lever) so a drag stays well under a millisecond;
  // the cheapest pair can be a step or two off on the EMI lever. Search finer if that ever matters.
  // the alternative to a single change is a different route, not the same lever plus a nudge
  const used = new Set(singles.map((s) => s.changes[0].key));
  let pair: Flip | null = null;
  for (let a = 0; a < LEVERS.length; a++)
    for (let b = a + 1; b < LEVERS.length; b++) {
      const [la, lb] = [LEVERS[a], LEVERS[b]];
      if (used.has(la.key) || used.has(lb.key)) continue;
      const pa = paths[a].filter((_, k, all) => k % Math.ceil(all.length / 40) === 0);
      for (const va of pa) {
        if (hit(one(la.key, va))) break; // a alone is enough from here on: that's a single, not a pair
        const ca: Change = { key: la.key, from: p[la.key], to: va };
        const vb = paths[b].find((to) => hit(scoreOf(apply(p, [ca, { key: lb.key, from: p[lb.key], to }]))));
        if (vb === undefined || hit(one(lb.key, vb))) continue;
        const c = cost(la, va) + cost(lb, vb);
        if (!pair || c < pair.cost) pair = flip([ca, { key: lb.key, from: p[lb.key], to: vb }], c);
      }
    }
  return { goal, worse, options: [...singles, ...(pair ? [pair] : [])].slice(0, 2) };
}

/** One change in words: "2 more months of income", "EMIs reach ₹39,500 a month". */
export function describe(c: Change, p: Profile): string {
  const d = Math.abs(c.to - c.from);
  const up = c.to > c.from;
  switch (c.key) {
    case "emi":
      return up ? `EMIs reach ${rupees(c.to)} a month` : `EMIs cut to ${rupees(c.to)} a month`;
    case "incomeMonths":
      return up ? `${d} more month${d === 1 ? "" : "s"} of income` : `income in only ${plural(c.to, "month")}`;
    case "utilisation":
      return up ? `${lineName(p)} at ${c.to}% of its limit` : `${lineName(p)} down to ${c.to}%`;
    case "bounces":
      return up ? (d === 1 ? "one bounced payment" : `${d} bounced payments`) : c.to === 0 ? "no bounced payments" : `${d} fewer bounced payment${d === 1 ? "" : "s"}`;
  }
}

export const describeFlip = (f: Flip, p: Profile) => f.changes.map((c) => describe(c, p)).join(" and ");

/* ── the audit chain ──────────────────────────────────────────────────────── */

/** FNV-1a, 32-bit, as 8 hex digits. Not cryptographic — it only has to show that an edit is visible. */
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Each entry's hash covers the one before it, so editing entry k changes every hash from k on. */
export function chain(entries: string[]): string[] {
  const out: string[] = [];
  entries.forEach((e, i) => out.push(fnv(`${out[i - 1] ?? "00000000"}|${e}`)));
  return out;
}
