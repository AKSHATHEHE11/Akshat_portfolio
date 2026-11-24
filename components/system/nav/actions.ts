"use client";
// The three console switches. Shared by the nav bar, the menu panel and the keyboard shortcuts so a
// switch sounds and behaves the same however it is flipped.
import { play } from "@/lib/sound";
import { emit, system } from "@/lib/system";

export type Point = { x: number; y: number };

const centre = (): Point => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

/** Centre of an element — where a switch-triggered effect should start from. */
export function originOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function flipChaos(from?: Point) {
  const on = !system.get().chaos;
  system.toggleChaos(on);
  play(on ? "toggle-on" : "toggle-off");
  if (on) emit("chaos:burst", from ?? centre());
  return on;
}

export function flipSound() {
  const on = !system.get().sound;
  if (!on) play("toggle-off"); // play() goes silent once sound is off, so click on the way out…
  system.toggleSound(on);
  if (on) play("toggle-on"); // …and confirm once it is on (this click also unlocks the AudioContext)
  return on;
}

// The ink the new theme pours in with: a grid of mask frames made by scripts/ink.mjs, one sheet for
// wide screens and one for tall ones. Fetched once the switch is about to be used (hover, focus, the menu
// opening), on touch a few seconds after load (Nav); until a sheet has decoded, the switch falls back to
// the iris.
const INK = { land: "/fx/ink-land.webp", port: "/fx/ink-port.webp" };
const sheets = new Map<string, HTMLImageElement | null>(); // null while loading; kept so it stays decoded
const inkSheet = () => (window.matchMedia("(orientation: portrait)").matches ? INK.port : INK.land); // as nav.css picks it

export function primeInk() {
  const url = inkSheet();
  if (sheets.has(url) || system.get().reducedMotion) return;
  sheets.set(url, null);
  const img = new Image();
  img.src = url;
  img.decode().then(
    () => sheets.set(url, img),
    () => sheets.delete(url),
  );
}

/** The ink sheet this screen needs is on its way. */
export const inkLoading = () => sheets.get(inkSheet()) === null;

/** Colour transitions jump to their end, so nothing fades behind the ink. Finishing one on a parent can
 *  start one on its children, hence the few rounds. */
function settle() {
  for (let i = 0; i < 4; i++) {
    const running = document.getAnimations().filter((a) => a instanceof CSSTransition);
    if (!running.length) return;
    running.forEach((a) => a.finish());
  }
}

/** The ink floods the screen in the new theme's colour, the theme flips underneath, then the ink thins
 *  out. For browsers without view transitions, and for phones too slow for one: starting a view
 *  transition restyles the whole page twice (Chrome, even an empty one), which freezes them for a second
 *  or more before any ink shows. */
function pourOver(lightsOn: boolean) {
  const el = document.createElement("div");
  el.className = "sys-pour";
  el.setAttribute("aria-hidden", "true");
  el.style.backgroundColor = lightsOn ? "#f2eee7" : "#0c0c0b"; // --bg of the theme it turns into
  el.addEventListener(
    "animationend",
    () => {
      system.toggleTheme(lightsOn ? "light" : "dark");
      settle();
      el.animate({ opacity: [1, 0] }, { duration: 350, fill: "forwards" }).onfinish = () => el.remove();
    },
    { once: true },
  );
  document.body.append(el);
}

/** The new theme pours over the page as ink (an iris until the ink has loaded); instant with reduced
 *  motion. `slow`: this device is struggling, use the cheap pour. */
export function flipLights(from?: Point, slow = false) {
  const s = system.get();
  const lightsOn = s.theme === "dark";
  play(lightsOn ? "toggle-on" : "toggle-off");
  const root = document.documentElement;
  const url = inkSheet();
  const canReveal = "startViewTransition" in document;
  if (from && !s.reducedMotion && sheets.get(url) && (slow || !canReveal)) {
    pourOver(lightsOn);
    return lightsOn;
  }
  if (!from || s.reducedMotion || !canReveal) {
    system.toggleTheme();
    return lightsOn;
  }
  const mode = sheets.get(url) ? "sys-ink" : "sys-lights";
  if (mode === "sys-lights") {
    primeInk(); // next time
    root.style.setProperty("--sys-lx", `${Math.round(from.x)}px`);
    root.style.setProperty("--sys-ly", `${Math.round(from.y)}px`);
  }
  root.classList.add(mode);
  const vt = document.startViewTransition(() => {
    system.toggleTheme();
    settle();
  });
  vt.ready.catch(() => {}); // skipped transitions reject; the theme has still flipped
  vt.finished.finally(() => root.classList.remove(mode));
  return lightsOn;
}
