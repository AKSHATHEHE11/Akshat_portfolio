// /think copy that data/think.ts has no fields for yet. DUMMY copy in the right shape.
// ponytail: lives here because data/ is read-only for this feature — move `symptoms` onto
// principles[] and `notes` onto notes[] (preview + body) in data/think.ts, then read them from there.

/** What the world looks like with each rule OFF — same order as principles in data/think.ts. */
export const symptoms = [
  "Everything bounces. Nothing tells you where it went.",
  "Every complaint got its own feature. Now nobody can find the button.",
  "Signed off in the frame. Never touched by a thumb.",
  "The model says 72%. Nobody in the room can say why.",
  "Everything is shouting, so nothing gets heard.",
];

/** Field-note extras, keyed by note title. A note without an entry stays a plain log line. */
export const notes: Record<string, { preview: string; body: string[] }> = {
  "Why every button on this site is a key": {
    preview: "A key tells you it was pressed. A rectangle that changes colour doesn't.",
    body: [
      "Every button here travels two pixels down and its shadow collapses under your finger. That is the whole idea: feedback you can feel before you read anything.",
      "Flat buttons came first. Testers double-clicked them. Nobody double-clicks a key.",
    ],
  },
  "Designing AI agents that disagree on purpose": {
    preview: "Five agents that agree are one agent with extra latency.",
    body: [
      "Each agent gets a brief it is not allowed to drop: cost, risk, the user, the deadline. The verdict is the least interesting thing they produce.",
      "The useful part is the dissent on record: the one reason the plan might still be wrong, written down before anyone commits money to it.",
    ],
  },
  "The 6-minute window: logistics UX on Indian railways": {
    preview: "The train stops for six minutes. Your food has to be on the platform in five.",
    body: [
      "Ordering to a seat is a race against a timetable that changes mid-journey. So the screen shows one thing: the station where your order will meet you, and how sure we are.",
      "Delays re-route the order before the passenger notices. The best logistics screen is one that never needs to change.",
    ],
  },
  "Variable fonts are physics with better kerning": {
    preview: "A width axis is a spring. Treat it like one and type starts to have weight.",
    body: [
      "Archivo runs from 62 to 125 on its width axis. Map that to velocity and a headline squashes when you fling it, then settles.",
      "Two rules from production: quantise the axis, because every distinct value is a new font instance, and never animate it on more than one line at a time.",
    ],
  },
  "Fabric first: selling denim without the thumbnail grid": {
    preview: "Nobody buys jeans from a 240px thumbnail. They buy the weight, the weave and the fade.",
    body: [
      "So the store opens on a swatch you can drag, not a grid. Ounces, twill direction, what it looks like after six months: the things a shop assistant would let you touch.",
      "The grid is still there. It just isn't the front door any more.",
    ],
  },
};
