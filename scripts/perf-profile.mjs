// CPU profile of one interaction, aggregated by function (use the dev server so names are readable).
//   node scripts/perf-profile.mjs [--base=http://localhost:3000] [--route=/] [--mode=pointer|scroll] [--top=30]
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
const top = Number(opt.top ?? 30);
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true, args: ["--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("akshat:booted", "1");
  } catch {}
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.goto(base + route, { waitUntil: "networkidle", timeout: 180_000 });
await page.waitForTimeout(5000);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
if (mode === "pointer") {
  for (let i = 0; i < 120; i++) {
    const a = i / 7;
    await page.mouse.move(720 + Math.cos(a) * 500, 450 + Math.sin(a * 1.3) * 270);
    await page.waitForTimeout(16);
  }
} else {
  await page.mouse.move(720, 450);
  for (let i = 0; i < 120; i++) {
    await page.mouse.wheel(0, 90);
    await page.waitForTimeout(16);
  }
}
const { profile } = await cdp.send("Profiler.stop");
await browser.close();

// self time per node → aggregate by function + script
const dt = new Map();
for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0));
const agg = new Map();
let total = 0;
for (const n of profile.nodes) {
  const t = (dt.get(n.id) ?? 0) / 1000;
  total += t;
  const cf = n.callFrame;
  const file = (cf.url || "").replace(/^.*\/_next\//, "").replace(/\?.*$/, "");
  const key = `${cf.functionName || "(anonymous)"}  ${file ? `${file}:${cf.lineNumber + 1}` : ""}`;
  agg.set(key, (agg.get(key) ?? 0) + t);
}
const rows = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
console.log(`${mode} on ${route}: ${total.toFixed(0)} ms sampled`);
for (const [k, ms] of rows) console.log(`${ms.toFixed(1).padStart(8)} ms  ${((100 * ms) / total).toFixed(1).padStart(5)}%  ${k}`);

// --callers=fnName : who calls a hot native (e.g. getBoundingClientRect), two frames up
if (opt.callers) {
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n);
  const label = (n) => {
    const cf = n.callFrame;
    return `${cf.functionName || "(anonymous)"} ${(cf.url || "").replace(/^.*\/_next\/static\/chunks\//, "").replace(/\?.*$/, "")}:${cf.lineNumber + 1}`;
  };
  const by = new Map();
  for (const n of profile.nodes) {
    if (n.callFrame.functionName !== opt.callers) continue;
    const p1 = parent.get(n.id);
    const p2 = p1 && parent.get(p1.id);
    const key = `${p1 ? label(p1) : "?"}  ←  ${p2 ? label(p2) : "?"}`;
    by.set(key, (by.get(key) ?? 0) + (dt.get(n.id) ?? 0) / 1000);
  }
  console.log(`\ncallers of ${opt.callers}:`);
  for (const [k, ms] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${ms.toFixed(1).padStart(8)} ms  ${k}`);
}
