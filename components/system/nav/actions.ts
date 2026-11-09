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

/** Lights flood out of the switch (a view-transition iris) where the browser can; instant otherwise. */
export function flipLights(from?: Point) {
  const s = system.get();
  const lightsOn = s.theme === "dark";
  play(lightsOn ? "toggle-on" : "toggle-off");
  if (!from || s.reducedMotion || !("startViewTransition" in document)) {
    system.toggleTheme();
    return lightsOn;
  }
  const root = document.documentElement;
  root.style.setProperty("--sys-lx", `${Math.round(from.x)}px`);
  root.style.setProperty("--sys-ly", `${Math.round(from.y)}px`);
  root.classList.add("sys-lights");
  const vt = document.startViewTransition(() => system.toggleTheme());
  vt.ready.catch(() => {}); // skipped transitions reject; the theme has still flipped
  vt.finished.finally(() => root.classList.remove("sys-lights"));
  return lightsOn;
}
