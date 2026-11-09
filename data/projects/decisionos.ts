import type { Project } from "@/lib/types";
import type { CommandCenterScene } from "@/components/worlds/command-center/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const decisionos: Project<CommandCenterScene> = {
  id: "01",
  slug: "decisionos",
  title: "DecisionOS",
  tagline: "A boardroom of AI agents that argues before you decide.",
  description:
    "DecisionOS gives founders a command center of role-specific AI agents — CEO, CFO, COO, CMO — that read the same numbers, argue from their own incentives and hand back one decision brief.",
  category: "AI Business OS",
  year: 2026,
  status: "prototype",
  role: ["Product design", "Frontend", "Agent orchestration"],
  technologies: [
    { name: "Next.js", group: "frontend", why: "Streaming UI for agent responses as they think." },
    { name: "TypeScript", group: "frontend", why: "Agent message contracts are typed end to end." },
    { name: "Three.js", group: "motion", why: "The globe makes regional impact legible in one glance." },
    { name: "Python", group: "backend", why: "Simulation workers and model evaluation." },
    { name: "LLM agents", group: "ai", why: "Four agents with separate briefs, memories and veto rules." },
    { name: "PostgreSQL", group: "data", why: "Every decision and every dissent is stored and replayable." },
    { name: "Vercel", group: "cloud", why: "Preview deployments for every scenario template." },
  ],
  color: { bg: "#07090a", fg: "#e9f0ea", accent: "#d8ff00" },
  environment: "command-center",
  metrics: [
    { label: "Time to decision", value: "−63%", note: "pilot founders, median" },
    { label: "Scenarios simulated", value: "1,240" },
    { label: "Dissents surfaced", value: "318", note: "objections a human would have missed" },
  ],
  challenge:
    "Small teams make big calls on gut feeling because modelling a decision properly takes a week nobody has — and the one sceptic in the room usually stays quiet.",
  solution:
    "Four agents with real job descriptions read the same data, simulate the outcome from their own seat and are required to disagree out loud. The founder gets a one-page brief: options, costs, risks and who objected.",
  outcome:
    "Pilot founders went from three decision meetings to one, and kept the dissent on record for the post-mortem.",
  process: [
    { title: "Shadow the boardroom", body: "Sat in on twelve real decision meetings. The insight: the best meetings had someone paid to say no." },
    { title: "Give every agent a job", body: "Each agent gets a mandate, a metric it is judged on and the right to veto. Personalities came free." },
    { title: "Design for disagreement", body: "Agreement is collapsed by default. Conflicts are expanded, coloured and pinned to the top." },
    { title: "Ship the brief, not the chat", body: "Chat logs are evidence. The deliverable is a one-page decision brief you can forward." },
  ],
  decisions: [
    {
      question: "Chat thread or command center?",
      options: [
        { label: "Chat thread", note: "Familiar, but disagreement gets buried in scrollback." },
        { label: "Command center", note: "Every agent visible at once — conflict becomes spatial." },
      ],
      chosen: 1,
      why: "A decision is a room, not a thread. You should see who is arguing with whom.",
    },
    {
      question: "One smart agent or four opinionated ones?",
      options: [
        { label: "One generalist", note: "Cheaper, smoother — and confidently one-sided." },
        { label: "Four specialists", note: "Slower, louder, much harder to fool." },
      ],
      chosen: 1,
      why: "Consensus from a single model is just an opinion with good grammar.",
    },
  ],
  links: [
    { label: "Run a scenario", href: "#preview" },
    { label: "Read the process", href: "#process" },
  ],
  scene: {},
};
