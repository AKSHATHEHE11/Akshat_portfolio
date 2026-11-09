// Frame-time profiler for a RUNNING server (production build recommended: next build && next start).
//   node scripts/perf.mjs [--base=http://localhost:3100] [--routes=/,/work/fybr8] [--off=cursor,grain]
//        [--dpr=1.25] [--w=1440] [--h=900] [--mobile]
// For each route it measures three scenarios in real Chrome:
//   idle   — 3s untouched at the top of the page
//   pointer — 3s of mouse movement across the viewport (cursor, kinetic type, tilt)
//   scroll — wheel-scroll through the whole page
// Reported: frames/s, p95 frame time, % frames over 33ms (visible jank), long tasks (>50ms), and
// main-thread time split into script / layout / style. --off hides a feature to measure its cost.
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const opt = Object.fromEntries(
  process.argv.slice(2).map((f) => {
    const [k, ...v] = f.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const base = opt.base ?? "http://localhost:3100";
// Git Bash rewrites "/work" into "C:/Program Files/Git/work" — undo that; "work/x" works without the slash too.
const routes = String(opt.routes ?? "/")
  .split(",")
  .map((r) => "/" + r.replace(/\\/g, "/").replace(/^[A-Za-z]:\/.*?\/Git\/?/, "").replace(/^\/+/, ""));
const off = opt.off ? String(opt.off).split(",") : [];

// Feature switches for A/B measurements (hide = not drawn/composited at all)
const ABLATE = {
  cursor: ".cur-layer{display:none!important}",
  grain: '[style*="site-grain"]{display:none!important}',
  navblur: "header *, header{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}",
  hud: '[style*="site-hud"]{display:none!important}',
  canvas: "#enter canvas{visibility:hidden!important}",
  headline: ".hero-headline{display:none!important}",
  allcanvas: "canvas{visibility:hidden!important}",
  blurs: '*{filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  blend: "*{mix-blend-mode:normal!important}",
  modules: ".hero-mod{display:none!important}",
};

const executablePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11", "--disable-frame-rate-limit=false"],
});

const pct = (arr, p) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0);

async function measure(page, cdp, run) {
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(() => {
    window.__f = [];
    window.__lt = [];
    window.__rec = true;
    const loop = (t) => {
      if (!window.__rec) return;
      window.__f.push(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const t0 = Date.now();
  await run();
  const wall = (Date.now() - t0) / 1000;
  const { f, lt } = await page.evaluate(() => {
    window.__rec = false;
    return { f: window.__f, lt: window.__lt };
  });
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  const ms = (k) => ((m1[k] - m0[k]) * 1000) / wall; // ms of main thread per second of wall time
  return {
    fps: +(d.length / wall).toFixed(1),
    p95: +pct(d, 0.95).toFixed(1),
    jank: d.length ? +((100 * d.filter((x) => x > 33.4).length) / d.length).toFixed(1) : 0,
    long: lt.length,
    longMs: Math.round(lt.reduce((a, b) => a + b, 0)),
    script: Math.round(ms("ScriptDuration")),
    layout: Math.round(ms("LayoutDuration")),
    style: Math.round(ms("RecalcStyleDuration")),
    task: Math.round(ms("TaskDuration")),
  };
}

const rows = [];
let renderer = "";
for (const route of routes) {
  const context = await browser.newContext({
    viewport: { width: Number(opt.w ?? (opt.mobile ? 390 : 1440)), height: Number(opt.h ?? (opt.mobile ? 844 : 900)) },
    deviceScaleFactor: Number(opt.dpr ?? 1.25),
    isMobile: !!opt.mobile,
    hasTouch: !!opt.mobile,
  });
  if (off.includes("nowebgl"))
    await context.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(type) ? null : get.call(this, type, ...rest);
      };
    });
  await context.addInitScript((css) => {
    try {
      sessionStorage.setItem("akshat:booted", "1");
    } catch {}
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (window.__rec) window.__lt.push(e.duration);
    }).observe({ type: "longtask", buffered: false });
    if (css) document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    });
  }, off.map((k) => ABLATE[k] ?? "").join("\n"));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 120_000 });
  if (!renderer)
    renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "no webgl";
    });
  const W = Number(opt.w ?? 1440);
  const H = Number(opt.h ?? 900);
  // Warm-up: let lazy chunks, GLB parsing and shader compilation finish, and visit the whole page once,
  // so the numbers describe steady-state browsing rather than first-load setup.
  await page.waitForTimeout(6000);
  await page.mouse.move(W / 2, H / 2);
  for (let y = 0; y < 60; y++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.wheel(0, -100000);
  await page.waitForTimeout(3000);

  const idle = await measure(page, cdp, () => page.waitForTimeout(3000));
  const pointer = await measure(page, cdp, async () => {
    for (let i = 0; i < 90; i++) {
      const a = i / 7;
      await page.mouse.move(W / 2 + Math.cos(a) * W * 0.35, H / 2 + Math.sin(a * 1.3) * H * 0.3);
      await page.waitForTimeout(16);
    }
  });
  const scroll = await measure(page, cdp, async () => {
    await page.mouse.move(W / 2, H / 2);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const steps = Math.min(220, Math.max(40, Math.round(total / 90)));
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 90);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(600);
  });
  for (const [name, r] of Object.entries({ idle, pointer, scroll })) rows.push({ route, off: off.join("+") || "-", scenario: name, ...r });
  await context.close();
}
await browser.close();

console.log(`renderer: ${renderer}`);
console.table(rows);
