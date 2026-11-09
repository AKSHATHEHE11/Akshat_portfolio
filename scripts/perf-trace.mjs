// Which code invalidates layout during an interaction? Records a Chrome trace with invalidation
// tracking and prints layout time plus the script locations that dirtied layout (dev server = names).
//   node scripts/perf-trace.mjs [--base=http://localhost:3000] [--route=/] [--mode=pointer|scroll] [--steps=90] [--warm]
// --warm visits the whole page first (lazy chunks, decoding), like perf.mjs, so the trace shows steady state.
// Also breaks every main-thread task over 50ms down by what it spent its time on.
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const opt = Object.fromEntries(
  process.argv.slice(2).map((f) => {
    const [k, ...v] = f.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const base = opt.base ?? "http://localhost:3000";
const route = "/" + String(opt.route ?? "/").replace(/\\/g, "/").replace(/^[A-Za-z]:\/.*?\/Git\/?/, "").replace(/^\/+/, "");
const mode = opt.mode ?? "pointer";
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true, args: ["--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("akshat:booted", "1");
  } catch {}
});
const page = await context.newPage();
await page.goto(base + route, { waitUntil: "networkidle", timeout: 180_000 });
await page.waitForTimeout(6000);
if (opt.warm) {
  await page.mouse.move(720, 450);
  for (let y = 0; y < 60; y++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.wheel(0, -100000);
  await page.waitForTimeout(3000);
}
const steps = Number(opt.steps ?? 90);

await browser.startTracing(page, {
  categories: [
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.invalidationTracking",
    "disabled-by-default-devtools.timeline.stack",
    "cc",
    "gpu",
    "toplevel",
    "v8",
  ],
});
if (mode === "pointer") {
  for (let i = 0; i < 90; i++) {
    const a = i / 7;
    await page.mouse.move(720 + Math.cos(a) * 500, 450 + Math.sin(a * 1.3) * 270);
    await page.waitForTimeout(16);
  }
} else {
  await page.mouse.move(720, 450);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 90);
    await page.waitForTimeout(16);
  }
}
const buf = await browser.stopTracing();
await browser.close();

const events = JSON.parse(buf.toString()).traceEvents ?? [];
const total = (name) => events.filter((e) => e.name === name && e.dur).reduce((a, e) => a + e.dur, 0) / 1000;
console.log(`${mode} on ${route}: Layout ${total("Layout").toFixed(0)} ms · UpdateLayoutTree(style) ${total("UpdateLayoutTree").toFixed(0)} ms · Paint ${total("Paint").toFixed(0)} ms · CompositeLayers ${total("CompositeLayers").toFixed(0)} ms`);
console.log(`  raster ${total("RasterTask").toFixed(0)} ms · image decode ${(total("ImageDecodeTask") + total("Decode Image")).toFixed(0)} ms · GPU ${total("GPUTask").toFixed(0)} ms · commit ${total("Commit").toFixed(0)} ms · PrePaint ${total("PrePaint").toFixed(0)} ms · Layerize ${total("Layerize").toFixed(0)} ms`);
// which layers/nodes get repainted most (Paint events carry the node id of the painting root)
const painted = new Map();
for (const e of events)
  if (e.name === "Paint" && e.dur) {
    const k = `${e.args?.data?.nodeName ?? "?"}#${e.args?.data?.nodeId ?? "?"} ${e.args?.data?.layerId ?? ""}`;
    painted.set(k, (painted.get(k) ?? 0) + e.dur / 1000);
  }
console.log("\nheaviest Paint roots (ms):");
for (const [k, ms] of [...painted.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`${ms.toFixed(1).padStart(8)}  ${k}`);

const where = (e) => {
  const st = e.args?.data?.stackTrace ?? e.args?.data?.stack ?? e.args?.beginData?.stackTrace;
  if (!st?.length) return "(no JS stack — style/CSS/animation driven)";
  const f = st.find((s) => !/node_modules|react-dom|scheduler/.test(s.url ?? "")) ?? st[0];
  return `${f.functionName || "(anonymous)"} ${(f.url ?? "").replace(/^.*\/_next\/static\/chunks\//, "").replace(/\?.*$/, "")}:${f.lineNumber}`;
};
const tally = (pred, label) => {
  const m = new Map();
  for (const e of events) if (pred(e)) m.set(where(e), (m.get(where(e)) ?? 0) + 1);
  console.log(`\n${label}:`);
  for (const [k, n] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${String(n).padStart(6)}  ${k}`);
};
tally((e) => e.name === "LayoutInvalidationTracking", "layout invalidations by source");
tally((e) => e.name === "Layout" && e.args?.beginData?.stackTrace, "forced (synchronous) layouts by source");
const nodes = new Map();
for (const e of events)
  if (e.name === "LayoutInvalidationTracking") {
    const k = `${e.args?.data?.reason ?? "?"} · ${e.args?.data?.nodeName ?? "?"}`;
    nodes.set(k, (nodes.get(k) ?? 0) + 1);
  }
console.log("\ninvalidation reasons · node:");
for (const [k, n] of [...nodes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${String(n).padStart(6)}  ${k}`);

// Long tasks: every main-thread task over 50ms, broken down by self time per event (JS by function).
const names = new Map();
const thread = (e) => `${e.pid}:${e.tid}`;
for (const e of events) if (e.ph === "M" && e.name === "thread_name") names.set(thread(e), e.args?.name);
const mains = new Set([...names].filter(([, n]) => n === "CrRendererMain").map(([k]) => k));
const label = (e) => {
  const d = e.args?.data ?? {};
  if (e.name === "FunctionCall" || e.name === "EvaluateScript" || e.name === "v8.compile") {
    const file = (d.url ?? "").replace(/^.*\/(_next\/static\/chunks|src)\//, "").replace(/\?.*$/, "");
    return `JS ${d.functionName || "(anon)"} ${file}:${d.lineNumber ?? ""}`;
  }
  if (e.name === "EventDispatch") return `EventDispatch ${d.type ?? ""}`;
  return e.name;
};
const longTasks = [];
const self = new Map();
for (const key of mains) {
  const list = events.filter((e) => e.ph === "X" && e.dur && thread(e) === key).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = [];
  for (const e of list) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    e.self = e.dur;
    e.root = stack.length ? stack[0].root : e;
    e.depth = stack.length;
    if (stack.length) stack[stack.length - 1].self -= e.dur;
    else if (e.dur > 50_000) longTasks.push((e.kids = [], e));
    if (e.depth > 0 && e.depth <= 2 && e.root.kids && e.dur > 3000) e.root.kids.push(e);
    stack.push(e);
  }
  for (const e of list) if (e.root.dur > 50_000 && e.self > 0) self.set(label(e), (self.get(label(e)) ?? 0) + e.self / 1000);
}
const longMs = longTasks.reduce((a, e) => a + e.dur, 0) / 1000;
console.log(`\nlong tasks (>50ms): ${longTasks.length}, ${longMs.toFixed(0)} ms — self time inside them:`);
for (const [k, ms] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`${ms.toFixed(1).padStart(8)}  ${k}`);
// what each long task was, from its first two levels (events over 3ms)
const t0 = events.reduce((m, e) => (e.ts && e.ts < m ? e.ts : m), Infinity);
for (const e of longTasks.slice(0, Number(opt.list ?? 12)))
  console.log(
    `  +${((e.ts - t0) / 1000).toFixed(0).padStart(6)}ms ${(e.dur / 1000).toFixed(0).padStart(4)}ms: ` +
      e.kids.map((k) => `${"›".repeat(k.depth)}${label(k)} ${(k.dur / 1000).toFixed(0)}`).join("  "),
  );
