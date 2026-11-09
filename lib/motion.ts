// Motion + layering constants for JS (mirrors the CSS tokens in app/globals.css).
// GSAP: use the ease strings. Motion (motion/react): use the bezier arrays.

export const DUR = {
  micro: 0.12,
  hover: 0.24,
  reveal: 0.64,
  scene: 0.9,
  page: 1.1,
} as const;

export const EASE = {
  /** default for reveals & arrivals */
  out: "expo.out",
  /** state changes, mechanical movement */
  machine: "machine",
  /** keys, toggles, things that click into place */
  snap: "snap",
  inOut: "power3.inOut",
} as const;

/** Same curves for motion/react `transition={{ ease: BEZIER.out }}` */
export const BEZIER = {
  out: [0.16, 1, 0.3, 1],
  quart: [0.25, 1, 0.5, 1],
  machine: [0.7, 0, 0.2, 1],
  snap: [0.34, 1.56, 0.64, 1],
} as const;

/** Spring presets for motion/react */
export const SPRING = {
  key: { type: "spring", stiffness: 700, damping: 30, mass: 0.6 },
  soft: { type: "spring", stiffness: 180, damping: 22 },
  magnet: { type: "spring", stiffness: 260, damping: 18, mass: 0.4 },
} as const;

/** z-index scale — never invent numbers outside this list */
export const Z = {
  content: 1,
  sticky: 20,
  worldUi: 40,
  chaos: 45,
  hud: 50,
  nav: 60,
  sheet: 70,
  boot: 90,
  grain: 95,
  cursor: 100,
} as const;
