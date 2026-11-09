// Full-page captures of a project's live site, for LiveScreen mode "capture" (sites that refuse
// framing). Only for sites you own or have the client's written OK to show.
//   node scripts/capture-site.mjs <url> <slug> [--wait=2500]
// → public/projects/<slug>/desktop.jpg (1440 wide) and public/projects/<slug>/phone.jpg (390 wide)
// Uses the installed Chrome/Edge through playwright-core (no browser download).
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const [url, slug, ...flags] = process.argv.slice(2);
if (!url || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.log("usage: node scripts/capture-site.mjs <url> <slug> [--wait=2500]   (slug: lowercase-with-dashes)");
  process.exit(1);
}
const wait = Number(flags.find((f) => f.startsWith("--wait="))?.slice(7) ?? 2500);
const MAX_HEIGHT = 14000;

const executablePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found");

const outDir = `public/projects/${slug}`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const [name, viewport, mobile] of [
    ["desktop", { width: 1440, height: 900 }, false],
    ["phone", { width: 390, height: 844 }, true],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(wait);
    // Walk down the page so lazy-loaded images and scroll animations settle, then return to the top.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Math.min(height, MAX_HEIGHT); y += viewport.height * 0.8) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const file = `${outDir}/${name}.jpg`;
    await page.screenshot({
      path: file,
      type: "jpeg",
      quality: 82,
      fullPage: true,
      clip: { x: 0, y: 0, width: viewport.width, height: Math.min(height, MAX_HEIGHT) },
    });
    console.log(`✓ ${file}  (${viewport.width}×${Math.min(height, MAX_HEIGHT)})`);
    await context.close();
  }
} finally {
  await browser.close();
}
