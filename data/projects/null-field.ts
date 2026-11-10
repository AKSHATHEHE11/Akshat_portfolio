import type { Project } from "@/lib/types";
import type { LabScene, Patch } from "@/components/worlds/lab/scene";

// DUMMY project content — realistic shape, replace with real details later.

/** cosine palettes: [a.rgb, b.rgb, c.rgb, d.rgb] → colour(t) = a + b·cos 2π(c·t + d) */
const GRAY = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

const patch = (p: Omit<Patch, "hue" | "mirror" | "polar"> & Partial<Pick<Patch, "hue" | "mirror" | "polar">>): Patch => ({
  hue: 0,
  mirror: false,
  polar: false,
  ...p,
});

export const nullField: Project<LabScene> = {
  id: "06",
  slug: "null-field",
  title: "Null Field",
  tagline: "A WebGL sandbox where every slider is a bad idea worth trying.",
  description:
    "Null Field is an experimental WebGL playground: a live shader instrument with knobs, presets and a record button, built to find visuals by accident.",
  category: "Experimental WebGL Playground",
  year: 2026,
  status: "in progress",
  role: ["Creative coding", "Shader art", "Tooling"],
  technologies: [
    { name: "GLSL", group: "motion", why: "Value noise, a two-level domain warp, cosine palettes and an 8×8 Bayer dither. Everything you see is maths." },
    { name: "Three.js", group: "motion", why: "Two half-float render targets ping-pong the feedback; one full-screen quad does the drawing." },
    { name: "React Three Fiber", group: "frontend", why: "Mounts one canvas, parks it when it's off-screen and gives me a single frame callback for both passes." },
    { name: "TypeScript", group: "frontend", why: "A patch is a typed object: ten numbers, two switches and a palette. Presets, REC and the LFO all speak it." },
    { name: "Canvas API", group: "frontend", why: "REC reads the frame straight off the canvas the moment it's drawn. No screenshot library." },
    { name: "Web Storage", group: "data", why: "Saved patches live in your browser at about 300 bytes each. No account, no server, nothing to sync." },
  ],
  color: { bg: "#060607", fg: "#ece8e1", accent: "#ff4f9a" },
  environment: "lab",
  metrics: [
    { label: "Presets in memory", value: "64", note: "kept after a year of evenings" },
    { label: "GPU ms per frame", value: "2.1", note: "integrated laptop graphics, pixel size 3" },
    { label: "Lines of GLSL", value: "1.9k", note: "half of it is the dither, somehow" },
    { label: "Accidents in client work", value: "4", note: "two album covers, a launch film, a club visual" },
  ],
  challenge: "Shader sketches died in my code editor. Changing one number meant a recompile, a squint and a lost evening.",
  solution: "Every number became a knob with sane limits. The render never stops, and keeping a happy accident costs one key.",
  outcome: "It's the instrument I play most nights. Four of its accidents ended up in client work; the rest are still in memory.",
  process: [
    {
      title: "Uniforms as knobs",
      body: "I pulled every number out of the shader and gave it a range that can't break the picture. Double-click puts it back.",
    },
    {
      title: "Warp before colour",
      body: "Noise fed back into its own coordinates. Grey on purpose: if the shape isn't interesting in grey, colour won't save it.",
    },
    {
      title: "A palette you can turn",
      body: "Colour is four vectors in a cosine. Hue and spread turn them; presets swap them wholesale.",
    },
    {
      title: "Feedback and fat pixels",
      body: "The noise is shaded once per cell, never per pixel, and the field remembers its last frame. Trails for free, two milliseconds a frame on a laptop.",
    },
    {
      title: "Presets as memory",
      body: "R saves the frame as a PNG and the patch under a made-up name. Most of my favourites started as a slip on a fader.",
    },
  ],
  decisions: [
    {
      question: "Code editor or instrument?",
      options: [
        { label: "Live code editor", note: "Powerful, and you spend the evening reading code instead of looking." },
        { label: "Instrument", note: "Ten controls, fast hands, more accidents. You can't type a mistake this good." },
      ],
      chosen: 1,
      why: "The point is to be surprised, not to be precise.",
    },
    {
      question: "Full resolution or fat pixels?",
      options: [
        { label: "Full resolution", note: "Sharper, and a laptop fan you can hear from the next room." },
        { label: "Fat pixels + dither", note: "A ninth of the pixels to shade, and the dither turned out to be the look." },
      ],
      chosen: 1,
      why: "The constraint paid twice: a laptop GPU barely notices, and a style I didn't have to invent.",
    },
    {
      question: "Listen to the microphone?",
      options: [
        { label: "Audio-reactive", note: "Impressive for ten seconds, then every frame is about the song." },
        { label: "Hands only", note: "Nothing moves unless you move it, or the LFO does." },
      ],
      chosen: 1,
      why: "An instrument you play beats one that plays along.",
    },
  ],
  links: [
    { label: "Play the field", href: "#preview" },
    { label: "Read the patch notes", href: "#process" },
  ],
  scene: {
    model: "NF-1",
    serial: "SN 0006 · 2026",
    presets: [
      {
        name: "Ultraviolet Tide",
        note: "Indigo to orchid, slow tide, soft trails. The default for a reason.",
        patch: patch({ warp: 1.1, scale: 2.2, detail: 5, flow: 0.45, spread: 1, feed: 0.55, crush: 0.3, grain: 0.28, pixel: 3, palette: [0.54, 0.25, 0.5, 0.46, 0.22, 0.35, 0.5, 0.5, 0.6, 0.5, 0.5, 0.6] }),
      },
      {
        name: "Sodium Lamp",
        note: "One street light, four levels of orange. A photocopy of 2 a.m.",
        patch: patch({ warp: 0.8, scale: 1.8, detail: 4.5, flow: 0.3, spread: 1.1, feed: 0.2, crush: 0.78, grain: 0.35, pixel: 5, palette: [0.52, 0.3, 0.08, 0.48, 0.28, 0.08, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }),
      },
      {
        name: "Dead Channel",
        note: "One-bit snow at full detail. A television tuned to nothing.",
        patch: patch({ warp: 1.6, scale: 4.6, detail: 7, flow: 1.2, spread: 1, feed: 0, crush: 1, grain: 0.55, pixel: 3, palette: GRAY }),
      },
      {
        name: "Monsoon Glass",
        note: "Teal under heavy warp, long trails. Rain on a bus window.",
        patch: patch({ warp: 2.1, scale: 1.5, detail: 6, flow: 0.22, spread: 0.9, feed: 0.78, crush: 0.12, grain: 0.2, pixel: 3, palette: [0.2, 0.46, 0.5, 0.2, 0.4, 0.3, 0.5, 0.5, 0.6, 0.5, 0.5, 0.55] }),
      },
      {
        name: "Acid Proof",
        note: "Mirrored and loud. For when the room needs waking up.",
        patch: patch({ warp: 1.3, scale: 2.8, detail: 5, flow: 1.1, spread: 1.6, feed: 0.3, crush: 0.5, grain: 0.25, pixel: 4, mirror: true, palette: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.8, 0.9, 0.3] }),
      },
      {
        name: "Oxide",
        note: "Rust into verdigris, bent into rings.",
        patch: patch({ warp: 0.9, scale: 2.6, detail: 5.5, flow: 0.35, spread: 1.2, feed: 0.4, crush: 0.4, grain: 0.4, pixel: 3, polar: true, palette: [0.42, 0.36, 0.32, 0.38, 0.3, 0.28, 0.8, 0.8, 0.8, 0.6, 0.35, 0.3] }),
      },
      {
        name: "Night Bus",
        note: "Navy with sodium streaks. Trails as long as the 343 route.",
        patch: patch({ warp: 0.6, scale: 3.2, detail: 4, flow: 0.9, spread: 1, feed: 0.9, crush: 0.22, grain: 0.3, pixel: 3, palette: [0.51, 0.3, 0.3, 0.49, 0.27, 0.15, 0.5, 0.5, 1, 0.5, 0.5, 0.5] }),
      },
      {
        name: "Paper Moon",
        note: "Bone and graphite, folded six ways. Prints well.",
        patch: patch({ warp: 0.9, scale: 2, detail: 5, flow: 0.18, spread: 0.9, feed: 0.3, crush: 0.62, grain: 0.5, pixel: 4, mirror: true, polar: true, palette: [0.6, 0.58, 0.54, 0.34, 0.33, 0.31, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }),
      },
    ],
    names: {
      adjectives: ["Wet", "Quiet", "Burnt", "Low", "Soft", "Late", "Hollow", "Bent", "Feral", "Slow", "Velvet", "Static", "Paper", "Second", "Lucky", "Borrowed"],
      nouns: ["Neon", "Orbit", "Tide", "Moth", "Signal", "Harbour", "Lantern", "Weather", "Glass", "Engine", "Choir", "Comet", "Smoke", "Ferry", "Monsoon", "Antenna"],
    },
    story: [
      { lead: "Noise.", tweak: { crush: 0.7, grain: 0.45, spread: 0.6 } },
      { lead: "Signal.", tweak: { crush: -1, grain: -1, feed: 0.15 } },
      { lead: "Field.", tweak: { warp: 0.6, feed: 0.3, spread: 0.25 } },
    ],
    patchNotes: [
      {
        version: "0.1",
        date: "2025-03-02",
        changes: ["+ ten uniforms on knobs and faders", "+ double-click resets a control", "- the code editor, off the screen for good"],
        build: { warp: 0, feed: 0, crush: 0, grain: 0, mirror: false, polar: false, palette: GRAY },
      },
      {
        version: "0.3",
        date: "2025-04-19",
        changes: ["+ two-level domain warp", "+ DETAIL: one to seven octaves, the last one fades in", "~ value noise instead of simplex: faster, no uglier"],
        build: { feed: 0, crush: 0, grain: 0, palette: GRAY },
      },
      {
        version: "0.6",
        date: "2025-06-08",
        changes: ["+ cosine palettes, twelve numbers each", "+ HUE and SPREAD knobs", "- the HSV picker; nobody can play one"],
        build: { feed: 0, crush: 0, grain: 0 },
      },
      {
        version: "0.9",
        date: "2025-09-27",
        changes: ["+ FEED: last frame, zoomed back in", "+ PIXEL: 2 to 12 px cells", "+ CRUSH: ordered 8×8 dither", "- no grain yet; it arrived in 1.0"],
        build: { grain: 0 },
      },
      {
        version: "1.2",
        date: "2026-02-14",
        changes: ["+ REC: a PNG and a preset in one key", "+ eight factory presets", "+ LFO and randomise-within-taste", "~ new presets are named by hashing the patch"],
        build: {},
      },
    ],
    flow: [
      {
        id: "uniforms",
        label: "Uniforms",
        spec: "10 knobs · 2 switches",
        note: "Every control writes a uniform on the next frame. Nothing recompiles, ever.",
        tech: ["React Three Fiber", "TypeScript"],
      },
      {
        id: "noise",
        label: "Noise",
        spec: "value noise × 7 oct",
        note: "Layered value noise. DETAIL sets how many layers; the last one fades in so the knob never steps.",
        tech: ["GLSL"],
      },
      {
        id: "warp",
        label: "Warp",
        spec: "fbm(p + w·fbm(p))",
        note: "The noise bends its own coordinates, twice. This is where it stops looking like clouds.",
        tech: ["GLSL"],
      },
      {
        id: "palette",
        label: "Palette",
        spec: "a + b·cos 2π(ct + d)",
        note: "Twelve numbers per preset. HUE turns them, SPREAD stretches them across the field.",
        tech: ["GLSL"],
      },
      {
        id: "feedback",
        label: "Feedback",
        spec: "2 half-float targets",
        note: "The last frame comes back zoomed by a hair and bent along the warp. FEED says how much survives.",
        tech: ["Three.js"],
      },
      {
        id: "crush",
        label: "Crush",
        spec: "8×8 Bayer · 2–40 lv",
        note: "Fewer steps per colour, and an ordered dither hides the seams. At full crush it's one bit per channel.",
        tech: ["GLSL"],
      },
      {
        id: "output",
        label: "Output",
        spec: "grain · PNG · memory",
        note: "Grain at screen resolution, then the frame. R reads it off the canvas and files the patch in memory.",
        tech: ["Three.js", "Canvas API", "Web Storage"],
      },
    ],
    meters: [
      { max: 80, ticks: [0, 20, 40, 60, 80], red: 60 },
      // milliseconds: the red zone starts where a 144 Hz frame runs out
      { max: 8, ticks: [0, 2, 4, 6, 8], red: 6.9 },
      { max: 2400, ticks: [0, 600, 1200, 1800, 2400], red: 2000 },
      { max: 8, ticks: [0, 2, 4, 6, 8], red: 6 },
    ],
  },
};
