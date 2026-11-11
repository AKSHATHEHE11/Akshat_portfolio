// Poster frames of the hero console: the real 3D scene, photographed at rest, so the page can show it at
// first paint and the live 3D takes over without a visible change (no flat stand-in, no pop).
//   1. next build && next start -p 3100
//   2. node scripts/console-poster.mjs [--base=http://localhost:3100]
// Writes public/console/poster-{light,dark}-{wide,tall}.webp and components/hero/console/poster.ts (where
// each control sits on the poster, so the hit areas line up before the 3D is live). Re-run it whenever
// the model, the lighting or the pose changes.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const opt = Object.fromEntries(process.argv.slice(2).map((f) => f.replace(/^--/, "").split("=")));
const base = opt.base ?? "http://localhost:3100";
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find((p) => existsSync(p));

// The poster covers the device's VIEW box plus this much breathing room (shadow below, lean to the side).
export const PAD = { x: 0.1, top: 0.08, bottom: 0.2 };
const VIEW = { w: 2.35, h: 1.85 };
const LAYOUTS = {
  // ≥1024px: the console sits to the right of the headline (lg layout)
  wide: { viewport: { width: 1600, height: 1000 }, dpr: 2, out: 1400 },
  // phones and tablets: centred under the headline
  // (tall enough that the whole poster area is on screen: the layout depends on width only)
  tall: { viewport: { width: 430, height: 1400 }, dpr: 3, out: 1100 },
};

mkdirSync("public/console", { recursive: true });
const browser = await chromium.launch({ executablePath, args: ["--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const rects = {};
for (const [layout, L] of Object.entries(LAYOUTS)) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: L.viewport, deviceScaleFactor: L.dpr, reducedMotion: "reduce" });
    await ctx.addInitScript((theme) => {
      try {
        sessionStorage.setItem("akshat:booted", "1");
        localStorage.setItem("akshat:theme", theme);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "networkidle" });
    // the 3D is live once the stand-in has left
    await page.waitForFunction(() => document.querySelector("[data-console-fallback]")?.classList.contains("hidden"), null, { timeout: 60000 });
    await page.mouse.move(1, 1); // pointer away: no lean
    await page.waitForTimeout(2500);
    const m = await page.evaluate(({ VIEW, PAD }) => {
      const anchor = document.querySelector("[data-console-fallback]").parentElement.getBoundingClientRect();
      // the VIEW box: what the 3D fits the device into (Scene.tsx), centred in the anchor
      const w = Math.min(anchor.width, anchor.height * (VIEW.w / VIEW.h));
      const h = (w * VIEW.h) / VIEW.w;
      const box = { x: anchor.left + (anchor.width - w) / 2, y: anchor.top + (anchor.height - h) / 2, w, h };
      const clip = { x: box.x - w * PAD.x, y: box.y - h * PAD.top, width: w * (1 + 2 * PAD.x), height: h * (1 + PAD.top + PAD.bottom) };
      const group = document.querySelector('[data-console] [role="group"][aria-label="Console"]');
      const controls = {};
      for (const el of group.querySelectorAll("button, [role=slider]")) {
        const r = el.getBoundingClientRect();
        const id = el.getAttribute("role") === "slider" ? "knob" : el.getAttribute("role") === "switch" ? "switch" : el.getAttribute("aria-label").toLowerCase();
        controls[id] = {
          left: +(((r.left - box.x) / w) * 100).toFixed(2),
          top: +(((r.top - box.y) / h) * 100).toFixed(2),
          width: +((r.width / w) * 100).toFixed(2),
          height: +((r.height / h) * 100).toFixed(2),
        };
      }
      return { box, clip, controls };
    }, { VIEW, PAD });
    // The page can only be photographed on screen. Where the poster area runs past the viewport (the
    // console bleeds to the right edge on wide screens), the canvas ends there too: that part is empty.
    const vp = page.viewportSize();
    const c = m.clip;
    const seen = { x: Math.max(0, c.x), y: Math.max(0, c.y) };
    seen.width = Math.min(vp.width, c.x + c.width) - seen.x;
    seen.height = Math.min(vp.height, c.y + c.height) - seen.y;
    // only the canvas: everything else hidden, transparent page
    await page.addStyleTag({
      content: `html,body{background:transparent!important} body *{visibility:hidden!important} [data-console] canvas{visibility:visible!important}`,
    });
    await page.waitForTimeout(400);
    const shot = await page.screenshot({ clip: seen, omitBackground: true, animations: "disabled" });
    const px = (v) => Math.max(0, Math.round(v * L.dpr));
    const full = await sharp(shot)
      .extend({
        left: px(seen.x - c.x),
        top: px(seen.y - c.y),
        right: px(c.x + c.width - (seen.x + seen.width)),
        bottom: px(c.y + c.height - (seen.y + seen.height)),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const file = `public/console/poster-${theme}-${layout}.webp`;
    await sharp(full).resize({ width: L.out }).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(file);
    if (theme === "light") rects[layout] = m.controls;
    console.log(file, Math.round(m.box.w), "x", Math.round(m.box.h), "css px box");
    await ctx.close();
  }
}
await browser.close();

writeFileSync(
  "components/hero/console/poster.ts",
  `// GENERATED by scripts/console-poster.mjs — do not edit by hand.
// The hero console's poster frames (public/console/poster-*.webp) and where each control sits on them,
// in % of the device's VIEW box, so the stand-in's hit areas line up with the photographed parts.
export const POSTER_PAD = ${JSON.stringify(PAD)};
export const POSTER_RECTS = ${JSON.stringify(rects, null, 2)} as const;
`,
);
console.log("wrote components/hero/console/poster.ts");
