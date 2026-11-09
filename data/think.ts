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

/** Principles — short, opinionated. Used on /think. */
export const principles = [
  { title: "Motion is meaning", body: "If an animation does not explain where something came from or went, it is decoration. Cut it." },
  { title: "Delete before you add", body: "Most good product decisions are subtractions somebody was brave enough to make." },
  { title: "Prototype in the real material", body: "A browser tells the truth about timing, touch and performance. A static frame never will." },
  { title: "Explain the machine", body: "Especially with AI: people trust what they can see the reasons for." },
  { title: "Calm, then a surprise", body: "Restraint is what makes the one wild moment land." },
];

/** Notes from the field — fragments, not essays. */
export const notes = [
  { date: "2026-10", title: "Why every button on this site is a key", tag: "interaction" },
  { date: "2026-08", title: "Designing AI agents that disagree on purpose", tag: "AI" },
  { date: "2026-05", title: "The 6-minute window: logistics UX on Indian railways", tag: "product" },
  { date: "2026-02", title: "Variable fonts are physics with better kerning", tag: "type" },
  { date: "2025-11", title: "Fabric first: selling denim without the thumbnail grid", tag: "commerce" },
];
