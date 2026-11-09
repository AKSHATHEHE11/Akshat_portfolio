// Screenshot a route of a RUNNING server (does not start one).
//   node scripts/shot.mjs /work/fybr8 out.png [--base=http://localhost:3000] [--w=1440] [--h=900]
//        [--mobile|--android|--landscape|--tablet] [--dark] [--chaos] [--full] [--scroll=1200] [--wait=1800] [--boot]
//        [--click="css selector"] [--hover="css selector"] [--key=ArrowRight]
// Uses the installed Chrome/Edge (playwright-core, no browser download). Boot sequence is skipped
// unless --boot. Screenshots are serialized with a lock so parallel callers don't pile up browsers.
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { chromium } from "playwright-core";

const [rawRoute = "/", out = "shot.png", ...flags] = process.argv.slice(2);
// Git Bash rewrites "/work" into "C:/Program Files/Git/work" — undo that, and allow "work/x" without the slash.
const route = "/" + rawRoute.replace(/\\/g, "/").replace(/^[A-Za-z]:\/.*?\/Git\//, "").replace(/^\/+/, "");
const opt = Object.fromEntries(
  flags.map((f) => {
    const [k, ...v] = f.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const base = opt.base ?? "http://localhost:3000";
// Device presets: --mobile (iPhone 390×844) --android (360×800) --landscape (844×390) --tablet (834×1112)
const preset = opt.android ? [360, 800] : opt.landscape ? [844, 390] : opt.tablet ? [834, 1112] : opt.mobile ? [390, 844] : [1440, 900];
const mobile = !!(opt.mobile || opt.android || opt.landscape || opt.tablet);
const w = Number(opt.w ?? preset[0]);
const h = Number(opt.h ?? preset[1]);

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found");

const LOCK = ".locks/shot";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(".locks", { recursive: true });
for (;;) {
  try {
    mkdirSync(LOCK);
    break;
  } catch {
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > 3 * 60_000) rmSync(LOCK, { recursive: true, force: true });
    } catch {}
    await sleep(700);
  }
}
const release = () => rmSync(LOCK, { recursive: true, force: true });
process.on("exit", release);

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: opt.reduced ? "reduce" : "no-preference",
    colorScheme: opt.scheme === "dark" ? "dark" : "light", // --scheme=dark → prefers-color-scheme: dark
  });
  await context.addInitScript(
    ({ boot, dark, chaos }) => {
      try {
        if (!boot) sessionStorage.setItem("akshat:booted", "1");
        if (dark) localStorage.setItem("akshat:theme", "dark");
        if (chaos) sessionStorage.setItem("akshat:chaos", "on");
      } catch {}
    },
    { boot: !!opt.boot, dark: !!opt.dark, chaos: !!opt.chaos },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console.error: ${m.text().slice(0, 300)}`));
  // --until=load|domcontentloaded for external sites that never go network-idle (e.g. github.com)
  await page.goto(base + route, { waitUntil: opt.until ?? "networkidle", timeout: 90_000 });
  await page.waitForTimeout(Number(opt.wait ?? 1800));
  if (opt.scroll) {
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, Number(opt.scroll));
    await page.waitForTimeout(1400);
  }
  if (opt.hover) {
    await page.locator(String(opt.hover)).filter({ visible: true }).first().hover();
    await page.waitForTimeout(700);
  }
  if (opt.click) {
    await page.locator(String(opt.click)).filter({ visible: true }).first().click();
    await page.waitForTimeout(1400);
  }
  if (opt.key) {
    await page.keyboard.press(String(opt.key));
    await page.waitForTimeout(1400);
  }
  await page.screenshot({ path: out, fullPage: !!opt.full });
  console.log(`✓ ${out}  (${w}×${h}${mobile ? " mobile" : ""})`);
  if (errors.length) console.log(`Browser errors (${errors.length}):\n${[...new Set(errors)].slice(0, 15).join("\n")}`);
} finally {
  await browser.close();
}
