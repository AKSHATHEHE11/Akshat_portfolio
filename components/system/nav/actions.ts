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
// wide screens and one for tall ones. Fetched only once the switch is about to be used (hover, focus,
// the menu opening), never on page load; until a sheet has decoded, the switch falls back to the iris.
const INK = { land: "/fx/ink-land.webp", port: "/fx/ink-port.webp" };
const sheets = new Map<string, HTMLImageElement | null>(); // null while loading; kept so it stays decoded
const inkSheet = () => (window.innerHeight > window.innerWidth ? INK.port : INK.land);

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

/** The new theme pours over the page as ink where the browser can (an iris until the ink has loaded);
 *  instant otherwise. */
export function flipLights(from?: Point) {
  const s = system.get();
  const lightsOn = s.theme === "dark";
  play(lightsOn ? "toggle-on" : "toggle-off");
  if (!from || s.reducedMotion || !("startViewTransition" in document)) {
    system.toggleTheme();
    return lightsOn;
  }
  const root = document.documentElement;
  const url = inkSheet();
  const mode = sheets.get(url) ? "sys-ink" : "sys-lights";
  if (mode === "sys-ink") root.style.setProperty("--sys-ink", `url("${url}")`);
  else {
    primeInk(); // next time
    root.style.setProperty("--sys-lx", `${Math.round(from.x)}px`);
    root.style.setProperty("--sys-ly", `${Math.round(from.y)}px`);
  }
  root.classList.add(mode);
  const vt = document.startViewTransition(() => system.toggleTheme());
  vt.ready.catch(() => {}); // skipped transitions reject; the theme has still flipped
  vt.finished.finally(() => root.classList.remove(mode));
  return lightsOn;
}
