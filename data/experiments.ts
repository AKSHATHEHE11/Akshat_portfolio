// The experiment lab. Each entry is a small, runnable creative-coding piece.
// `slug` maps to an implementation in components/experiments/<slug>.

export interface Experiment {
  id: string; // "EXP-01"
  slug: "liquid-type" | "particle-field" | "pattern-machine" | "oscilloscope" | "magnetic-dots" | "ascii-room";
  title: string;
  note: string;
  tags: string[];
  year: number;
  status: "stable" | "unstable" | "volatile";
  /** what to do with it — shown as the single instruction */
  verb: string;
}

export const experiments: Experiment[] = [
  {
    id: "EXP-01",
    slug: "liquid-type",
    title: "Liquid Type",
    note: "Letters that stretch with the speed of your cursor. Variable fonts are just physics with better kerning.",
    tags: ["variable fonts", "pointer velocity"],
    year: 2026,
    status: "stable",
    verb: "Move fast",
  },
  {
    id: "EXP-02",
    slug: "particle-field",
    title: "Particle Field",
    note: "Twenty thousand points that remember where you have been for about two seconds.",
    tags: ["WebGL", "shaders"],
    year: 2026,
    status: "unstable",
    verb: "Drag through it",
  },
  {
    id: "EXP-03",
    slug: "pattern-machine",
    title: "Pattern Machine",
    note: "Four knobs, one seed, no undo button. Every frame is a poster nobody asked for.",
    tags: ["generative", "canvas"],
    year: 2025,
    status: "stable",
    verb: "Turn the knobs",
  },
  {
    id: "EXP-04",
    slug: "oscilloscope",
    title: "Oscilloscope Synth",
    note: "Play a chord on your keyboard and watch its shape draw itself.",
    tags: ["WebAudio", "canvas"],
    year: 2025,
    status: "volatile",
    verb: "Press A–K",
  },
  {
    id: "EXP-05",
    slug: "magnetic-dots",
    title: "Magnetic Dots",
    note: "A grid of dots that leans toward attention and gossips about it afterwards.",
    tags: ["pointer", "spring physics"],
    year: 2024,
    status: "stable",
    verb: "Hover",
  },
  {
    id: "EXP-06",
    slug: "ascii-room",
    title: "ASCII Room",
    note: "A real-time 3D scene rendered entirely in characters, like a terminal that dreamed it was a GPU.",
    tags: ["three.js", "ascii"],
    year: 2026,
    status: "unstable",
    verb: "Orbit",
  },
];
