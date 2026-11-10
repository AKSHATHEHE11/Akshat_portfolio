// THINK — how Akshat works. Shared by the home teaser and /think. DUMMY copy in the right shape.

export interface PipelineStage {
  id: "observe" | "question" | "design" | "build" | "break" | "fix" | "ship";
  label: string;
  /** what happens at this stage, one line */
  line: string;
  /** a concrete habit — the evidence */
  habit: string;
  /** tiny artefact name shown like a file in the module's readout */
  artefact: string;
}

export const pipeline: PipelineStage[] = [
  {
    id: "observe",
    label: "Observe",
    line: "Watch what people actually do, not what they say they do.",
    habit: "I sit next to someone using the old thing before I draw the new thing.",
    artefact: "field-notes.md",
  },
  {
    id: "question",
    label: "Question",
    line: "Find the question underneath the request.",
    habit: "Every brief gets rewritten as one question with a measurable answer.",
    artefact: "the-real-question.txt",
  },
  {
    id: "design",
    label: "Design",
    line: "Sketch fast, in the material it will ship in.",
    habit: "Prototypes in code by day two. Figma is for thinking, not for approval.",
    artefact: "prototype-v3.tsx",
  },
  {
    id: "build",
    label: "Build",
    line: "Make it real end to end — interface, motion, API, deploy.",
    habit: "A preview URL exists from the first commit.",
    artefact: "main.ts",
  },
  {
    id: "break",
    label: "Break",
    line: "Try to ruin it before anyone else can.",
    habit: "Slow 3G, a screen reader, a toddler, and one very angry test user.",
    artefact: "bug-hunt.log",
  },
  {
    id: "fix",
    label: "Fix",
    line: "Fix the cause, then delete the workaround.",
    habit: "The shortest diff in the right place, never five patches in the wrong ones.",
    artefact: "fix-root-cause.diff",
  },
  {
    id: "ship",
    label: "Ship",
    line: "Put it in front of people and watch again.",
    habit: "Shipping is the start of observation, so the loop closes back to step one.",
    artefact: "release-notes.md",
  },
];

/** A house rule. On /think each one is a lever on the switchboard, next to a live demo of it. */
export interface Principle {
  /** stable key: /think matches the rule to its demo by this, never by array order */
  id: "motion" | "delete" | "material" | "explain" | "calm";
  title: string;
  body: string;
  /** what the world looks like with the rule OFF, shown while its lever is down */
  symptom: string;
}

/** Principles — short, opinionated. Used on /think. */
export const principles: Principle[] = [
  {
    id: "motion",
    title: "Motion is meaning",
    body: "If an animation does not explain where something came from or went, it is decoration. Cut it.",
    symptom: "Everything bounces. Nothing tells you where it went.",
  },
  {
    id: "delete",
    title: "Delete before you add",
    body: "Most good product decisions are subtractions somebody was brave enough to make.",
    symptom: "Every complaint got its own feature. Now nobody can find the button.",
  },
  {
    id: "material",
    title: "Prototype in the real material",
    body: "A browser tells the truth about timing, touch and performance. A static frame never will.",
    symptom: "Signed off in the frame. Never touched by a thumb.",
  },
  {
    id: "explain",
    title: "Explain the machine",
    body: "Especially with AI: people trust what they can see the reasons for.",
    symptom: "The model says 72%. Nobody in the room can say why.",
  },
  {
    id: "calm",
    title: "Calm, then a surprise",
    body: "Restraint is what makes the one wild moment land.",
    symptom: "Everything is shouting, so nothing gets heard.",
  },
];

/** A field note. There are no article pages: the row on /think unfolds in place. */
export interface FieldNote {
  /** YYYY-MM */
  date: string;
  title: string;
  tag: string;
  /** the first line, typed out when the row is hovered, focused or scrolled to on touch */
  preview: string;
  /** the fragment itself, one string per paragraph */
  body: string[];
}

/** Notes from the field — fragments, not essays. */
export const notes: FieldNote[] = [
  {
    date: "2026-10",
    title: "Why every button on this site is a key",
    tag: "interaction",
    preview: "A key tells you it was pressed. A rectangle that changes colour doesn't.",
    body: [
      "Every button here travels two pixels down and its shadow collapses under your finger. That is the whole idea: feedback you can feel before you read anything.",
      "Flat buttons came first. Testers double-clicked them. Nobody double-clicks a key.",
    ],
  },
  {
    date: "2026-08",
    title: "Designing AI agents that disagree on purpose",
    tag: "AI",
    preview: "Five agents that agree are one agent with extra latency.",
    body: [
      "Each agent gets a brief it is not allowed to drop: cost, risk, the user, the deadline. The verdict is the least interesting thing they produce.",
      "The useful part is the dissent on record: the one reason the plan might still be wrong, written down before anyone commits money to it.",
    ],
  },
  {
    date: "2026-05",
    title: "The 6-minute window: logistics UX on Indian railways",
    tag: "product",
    preview: "The train stops for six minutes. Your food has to be on the platform in five.",
    body: [
      "Ordering to a seat is a race against a timetable that changes while the train is moving. So the screen shows one thing: the station where your order will meet you, and how sure we are.",
      "Delays re-route the order before the passenger notices. The best logistics screen is one that never needs to change.",
    ],
  },
  {
    date: "2026-02",
    title: "Variable fonts are physics with better kerning",
    tag: "type",
    preview: "A width axis is a spring. Treat it like one and type starts to have weight.",
    body: [
      "Archivo runs from 62 to 125 on its width axis. Map that to velocity and a headline squashes when you fling it, then settles.",
      "Two rules from production: quantise the axis, because every distinct value is a new font instance, and never animate it on more than one line at a time.",
    ],
  },
  {
    date: "2025-11",
    title: "Fabric first: selling denim without the thumbnail grid",
    tag: "commerce",
    preview: "Nobody buys jeans from a 240px thumbnail. They buy the weight, the weave and the fade.",
    body: [
      "So the store opens on a swatch you can drag, not a grid. Ounces, twill direction, what it looks like after six months: the things a shop assistant would let you touch.",
      "The grid is still there. It just isn't the front door any more.",
    ],
  },
];
