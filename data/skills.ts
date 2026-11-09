// BUILD SYSTEM — the skill map. DUMMY levels/notes; same shape for real data.
// level: 1–5 (how deep), years: rough hands-on years.

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  years: number;
  note: string;
}

export interface SkillGroup {
  id: "frontend" | "backend" | "cloud" | "ai" | "design";
  label: string;
  summary: string;
  skills: Skill[];
}

export const skillMap: SkillGroup[] = [
  {
    id: "frontend",
    label: "Frontend",
    summary: "Interfaces that feel physical.",
    skills: [
      { name: "React", level: 5, years: 4, note: "Default tool for anything stateful." },
      { name: "Next.js", level: 5, years: 3, note: "This site. And most client work." },
      { name: "TypeScript", level: 5, years: 3, note: "Types are documentation that complains." },
      { name: "JavaScript", level: 5, years: 5, note: "Where it started." },
      { name: "GSAP", level: 4, years: 3, note: "Timelines for anything that should feel choreographed." },
      { name: "Three.js / R3F", level: 4, years: 2, note: "When a flat screen is not enough." },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    summary: "The boring part, done properly.",
    skills: [
      { name: "Node", level: 4, years: 4, note: "APIs, workers, scripts that generate 3D models." },
      { name: "Express", level: 4, years: 3, note: "Small, fast services." },
      { name: "APIs", level: 4, years: 3, note: "REST first, GraphQL when the client earns it." },
      { name: "PostgreSQL", level: 3, years: 2, note: "Relational until proven otherwise." },
    ],
  },
  {
    id: "cloud",
    label: "Cloud",
    summary: "Ship it somewhere real.",
    skills: [
      { name: "AWS", level: 3, years: 2, note: "Lambda, S3, the occasional surprising bill." },
      { name: "Vercel", level: 5, years: 3, note: "Preview deploys for every idea." },
      { name: "Docker", level: 3, years: 2, note: "Works on my machine, and yours." },
    ],
  },
  {
    id: "ai",
    label: "AI",
    summary: "Models that have to explain themselves.",
    skills: [
      { name: "NLP", level: 4, years: 2, note: "Classification, extraction, summarisation." },
      { name: "Computer Vision", level: 3, years: 2, note: "Detection pipelines and the UI around them." },
      { name: "ML", level: 3, years: 2, note: "Training is easy. Evaluation is the job." },
      { name: "LLM agents", level: 4, years: 1, note: "Multi-agent orchestration, as in DecisionOS." },
    ],
  },
  {
    id: "design",
    label: "Design",
    summary: "Motion is part of the meaning.",
    skills: [
      { name: "Motion", level: 5, years: 3, note: "Every animation has to explain something." },
      { name: "Interaction", level: 5, years: 4, note: "Hover, press, drag, release." },
      { name: "UX", level: 4, years: 4, note: "Interviews before pixels." },
      { name: "Figma", level: 4, years: 4, note: "Fast, then thrown away for code." },
    ],
  },
];
