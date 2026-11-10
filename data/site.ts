// Site-wide copy & navigation. DUMMY where marked — replace with real values later.

export const site = {
  title: "Akshat Agrawal — Digital Playground",
  short: "Akshat",
  description:
    "Akshat Agrawal is a design engineer who builds playful, useful things for the web. This portfolio is a playground: enter it.",
  url: "https://akshat.example", // DUMMY — real domain later
  build: "2026.11",
  version: "AKSHAT/OS 26.11",

  /** Work and Design lead: they are the two portfolios. */
  nav: [
    { id: "01", label: "Work", href: "/work", key: "w" },
    { id: "02", label: "Design", href: "/design", key: "d" },
    { id: "03", label: "Play", href: "/playground", key: "p" },
    { id: "04", label: "Think", href: "/think", key: "t" },
    { id: "05", label: "Experiment", href: "/experiments", key: "e" },
    { id: "06", label: "About", href: "/about", key: "a" },
  ],

  /** Keyboard shortcuts — the shortcuts sheet (press ?) renders this list. */
  shortcuts: [
    { keys: ["C"], label: "Chaos mode" },
    { keys: ["S"], label: "Sound on / off" },
    { keys: ["L"], label: "Lights (theme)" },
    { keys: ["H"], label: "Home" },
    { keys: ["W"], label: "Work" },
    { keys: ["D"], label: "Design" },
    { keys: ["P"], label: "Playground" },
    { keys: ["T"], label: "Think" },
    { keys: ["E"], label: "Experiments" },
    { keys: ["A"], label: "About" },
    { keys: ["←", "→"], label: "Previous / next world" },
    { keys: ["Esc"], label: "Exit a world" },
    { keys: ["?"], label: "This sheet" },
  ],

  boot: [
    "AKSHAT/OS 26.11 — COLD START",
    "CHECKING CURIOSITY ........ OK",
    "LOADING WORLDS ............ 06",
    "LOADING EXPERIMENTS ....... 06",
    "CALIBRATING CHAOS ......... HELD",
    "SYSTEM READY.",
  ],

  /** Short system phrases for HUD / chaos fragments. Keep them dry. */
  signals: [
    "SIGNAL DETECTED",
    "SYSTEM: ONLINE",
    "CURIOSITY: NOMINAL",
    "COFFEE: LOW",
    "BUILD 2026.11",
    "RENDERING WORLDS",
    "NO TEMPLATES FOUND",
    "HANDMADE: TRUE",
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
