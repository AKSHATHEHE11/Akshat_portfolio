// Content model. Everything the UI shows comes from /data and matches these types,
// so real content can replace the dummy content without touching components.

/** Which environment a project page renders as. One component per type in components/worlds/<type>. */
export type WorldType = "command-center" | "railway" | "fashion" | "ledger" | "blueprint" | "lab";

export interface Metric {
  label: string;
  value: string;
  note?: string;
}

export interface ProcessStep {
  title: string;
  body: string;
}

export interface Decision {
  question: string;
  options: { label: string; note: string }[];
  /** index into options of what was chosen */
  chosen: number;
  why: string;
}

export type TechGroup = "frontend" | "backend" | "cloud" | "ai" | "design" | "data" | "motion";

export interface Tech {
  name: string;
  group: TechGroup;
  /** why it was used here — shown on hover in tech visualisations */
  why?: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectColor {
  /** world background — also the colour the portal morphs from */
  bg: string;
  /** text on bg */
  fg: string;
  /** the world's own accent */
  accent: string;
}

export interface Project<Scene = unknown> {
  /** display index, "01" */
  id: string;
  slug: string;
  title: string;
  /** one short line in the project's own voice */
  tagline: string;
  /** 1–2 sentences: what it is */
  description: string;
  category: string;
  year: number;
  status: "live" | "shipped" | "prototype" | "in progress";
  role: string[];
  technologies: Tech[];
  color: ProjectColor;
  environment: WorldType;
  /** optional real imagery — worlds must look complete without it */
  heroImage?: string;
  gallery?: string[];
  metrics: Metric[];
  challenge: string;
  solution: string;
  outcome: string;
  process: ProcessStep[];
  decisions: Decision[];
  links: ProjectLink[];
  /** world-specific content (stations, agents, products…). Typed by each world in components/worlds/<type>/scene.ts */
  scene: Scene;
}

/** The light-weight project info safe to pass around (nav rails, switchers, chaos fragments). */
export type ProjectSummary = Pick<
  Project,
  "id" | "slug" | "title" | "tagline" | "category" | "year" | "status" | "color" | "environment"
>;
