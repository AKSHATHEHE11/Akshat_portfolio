// BUILD SYSTEM — the skill map: the résumé's own five groups and 31 parts, word for word. No levels,
// no years. A part's `used` says where the résumé shows it in use (a job or a B.Tech project); a part
// without it is on the list and nothing more is claimed.
import type { Project, Stint } from "./experience";

export type Proof = Stint["id"] | Project["id"];

export interface Part {
  name: string;
  /** what it did there; falls back to the group's summary */
  note?: string;
  used?: Proof[];
}

export interface PartGroup {
  id: "languages" | "frontend" | "backend" | "cloud" | "ai";
  label: string;
  summary: string;
  parts: Part[];
}

export const stack: PartGroup[] = [
  {
    id: "languages",
    label: "Languages",
    summary: "Four languages, from C to JavaScript.",
    parts: [
      { name: "C" },
      { name: "C++" },
      { name: "Java" },
      { name: "JavaScript", used: ["oasis"], note: "Responsive web apps at OASIS INFOBYTES: CRUD, auth, Local Storage, validation." },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    summary: "React and Next.js, styled with Tailwind.",
    parts: [
      { name: "React.js", used: ["healthcare"], note: "The healthcare platform's front end, on MERN." },
      { name: "Next.js" },
      { name: "Tailwind CSS" },
      { name: "React Hooks" },
      { name: "Context API" },
      { name: "HTML", used: ["oasis"], note: "Responsive layouts at OASIS INFOBYTES, tested across browsers." },
      { name: "CSS", used: ["oasis"], note: "Responsive and cross-browser, at OASIS INFOBYTES." },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    summary: "Node and Express: REST, MVC, async.",
    parts: [
      { name: "Node.js", used: ["healthcare"], note: "The healthcare platform's server, on MERN." },
      { name: "Express.js", used: ["healthcare"], note: "REST APIs with JWT and role-based access." },
      { name: "RESTful APIs", used: ["healthcare"], note: "Secured with JWT and RBAC on the healthcare platform." },
      { name: "MVC Architecture" },
      { name: "Asynchronous Programming" },
    ],
  },
  {
    id: "cloud",
    label: "Data & Cloud",
    summary: "MongoDB, SQL and six AWS services.",
    parts: [
      { name: "MongoDB", used: ["healthcare"], note: "The healthcare platform's database, on MERN." },
      { name: "SQL" },
      { name: "AWS EC2", used: ["admissions"], note: "The admission system, behind an ALB with Auto Scaling." },
      { name: "AWS S3" },
      { name: "AWS IAM" },
      { name: "AWS Lambda" },
      { name: "AWS CloudFront" },
      { name: "AWS RDS", used: ["admissions"], note: "The admission system's database, in private subnets." },
    ],
  },
  {
    id: "ai",
    label: "AI & ML",
    summary: "Vision, NLP and the Python data stack.",
    parts: [
      { name: "Computer Vision", used: ["traffic"], note: "Vehicle detection, counting and traffic density, in real time." },
      { name: "NLP" },
      { name: "OpenCV", used: ["traffic"], note: "In the traffic system, with YOLO." },
      { name: "YOLO", used: ["traffic"], note: "Real-time vehicle detection in the traffic system." },
      { name: "NumPy" },
      { name: "Pandas" },
      { name: "Matplotlib" },
    ],
  },
];

// ── legacy ───────────────────────────────────────────────────────────────────────────────────────
// @deprecated DUMMY levels and years. Only components/about/room (Panel.tsx's desk panels, objects.ts)
// still read these; delete them once those move to `stack`.

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
