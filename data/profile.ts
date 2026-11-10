// Who Akshat is. DUMMY content in the right shape — replace with real details later.

export const profile = {
  name: "Akshat Agrawal",
  short: "Akshat",
  initials: "AA",
  roles: ["Digital builder", "Design engineer", "Experimenter"],

  /** Hero headline, one line per entry. The last line is the accent word. */
  headline: ["I build things", "that should", "exist."],
  /** The single supporting line under the hero headline. */
  intro: "I'm Akshat — I turn curious ideas into playful, useful things on the web.",

  location: { city: "New Delhi", country: "India", coords: "28.6139° N, 77.2090° E", timezone: "Asia/Kolkata" },
  availability: { open: true, label: "Taking on select projects — early 2027" },

  email: "hello@akshat.example", // DUMMY (reserved .example domain)
  socials: [
    { label: "GitHub", handle: "@akshat", href: "https://github.com/" }, // DUMMY handle/link
    { label: "LinkedIn", handle: "in/akshat-agrawal", href: "https://www.linkedin.com/" }, // DUMMY
    { label: "X", handle: "@akshat_builds", href: "https://x.com/" }, // DUMMY
  ],
  resume: "/resume.pdf", // placeholder file generated in /public

  /** "System status" panel — the playful readout. */
  status: {
    mode: "BUILDING",
    meters: [
      { label: "Creative", value: 94 },
      { label: "Energy", value: 78 },
      { label: "Focus", value: 61 },
    ],
    counters: [
      { label: "Projects", value: 7 },
      { label: "Coffee", value: 2 },
      { label: "Bugs", value: 13 },
      { label: "Shipped", value: 24 },
    ],
  },

  /** Product-datasheet facts about Akshat (identity / spec-sheet moments). */
  spec: [
    { key: "Model", value: "AA-26" },
    { key: "Class", value: "Design engineer, full-stack" },
    { key: "Runs on", value: "Chai, curiosity, TypeScript" },
    { key: "Operating range", value: "Figma → production" },
    { key: "Known side effects", value: "Rebuilds things that already work" },
    { key: "Warranty", value: "Void if bored" },
  ],
  composition: [
    { label: "Curiosity", value: 41 },
    { label: "Craft", value: 27 },
    { label: "Engineering", value: 22 },
    { label: "Chaos", value: 10 },
  ],

  bio: [
    "I'm a design engineer who sits exactly where the Figma file meets the pull request. I like that seam — most good ideas die there, and most of mine were born there.",
    "I build products end to end: the interface, the motion, the API behind it, and the cloud it runs on. Lately that means AI products that have to explain themselves to people who did not ask for AI.",
    "When I'm not shipping client work I'm building things nobody asked for, mostly to find out what happens.",
  ],

  interests: ["Indian railways", "Mechanical keyboards", "Generative art", "Street food maps", "Old CRT televisions"],

  /** /about copy that isn't biography. Headings are [plain, serif accent]. */
  about: {
    desk: ["Nothing on this desk is decoration.", "Pick something up."],
    build: ["How I’m", "wired."],
    journey: ["The line", "so far."],
  },
} as const;
