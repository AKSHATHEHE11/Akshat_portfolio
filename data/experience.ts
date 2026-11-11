// Where Akshat has worked and studied: facts from his résumé (Nov 2026) and nothing else.
// Start order; /about shows them as a server rack, newest unit on top. Projects and certifications
// carry no dates on purpose: the résumé gives none, so don't add any.

/** Year + month (1–12). Leave `m` out when the résumé only gives the year. */
export interface Month {
  y: number;
  m?: number;
}

export interface Project {
  id: "admissions" | "traffic" | "healthcare";
  name: string;
  /** printed on its drive bay (≤ 12 characters); also the skill map's proof tag unless `tag` is set */
  bay: string;
  /** the skill map's proof tag, where the bay name could be misread (e.g. "Healthcare" next to the
   *  Imperial Healthcare job) */
  tag?: string;
  stack: string[];
  line: string;
}

export interface Stint {
  id: "school" | "niet" | "oasis" | "imperial";
  kind: "education" | "work";
  org: string;
  /** the big name on the unit when `org` is too long; `org` then prints small under it */
  short?: string;
  role: string;
  /** "Remote" or a city. Work that isn't "Remote" counts as an office in the rack's header. */
  place: string;
  /** one fact about the org */
  about?: string;
  from: Month;
  /** leave out while it's still running */
  to?: Month;
  /** the pulled-out tray: one fact per line */
  did: string[];
  /** tray tags; a running job also cycles them on its LCD */
  tags?: string[];
  /** built during this stint, undated */
  projects?: Project[];
}

export interface Cert {
  id: "cisco" | "aws-academy" | "udemy" | "codio";
  by: string;
  name: string;
}

export const stints: Stint[] = [
  {
    id: "school",
    kind: "education",
    org: "Summer Fields School",
    role: "Intermediate & Class XII",
    place: "Gurugram, Haryana",
    from: { y: 2020 },
    to: { y: 2022 },
    did: ["Intermediate and Class XII, in Gurugram. The first unit in this rack."],
  },
  {
    id: "niet",
    kind: "education",
    org: "Noida Institute of Engineering and Technology",
    short: "NIET",
    role: "B.Tech, Computer Science (Cloud Computing)",
    place: "Greater Noida, U.P.",
    from: { y: 2023 },
    did: ["Built during the B.Tech:"],
    projects: [
      {
        id: "admissions",
        name: "Cloud-Based Admission Management System",
        bay: "Admissions",
        stack: ["AWS EC2", "RDS", "ALB", "Auto Scaling", "VPC", "Secrets Manager"],
        line: "Built on AWS for high availability: an ALB with Auto Scaling in front, RDS in private subnets inside its own VPC, secrets kept in Secrets Manager.",
      },
      {
        id: "traffic",
        name: "AI-Powered Traffic Intelligence System",
        bay: "Traffic AI",
        stack: ["Python", "YOLO", "OpenCV", "ML"],
        line: "Detects and counts vehicles in real time, measures traffic density, and uses that density to time the signals.",
      },
      {
        id: "healthcare",
        name: "Smart Healthcare & Emergency Response Platform",
        bay: "Healthcare",
        tag: "Health app",
        stack: ["MERN", "JWT", "RBAC", "Google Maps API", "WebSockets"],
        line: "Patient management, ambulance dispatch and hospital resource monitoring. Secure REST APIs with JWT and role-based access; live ambulance tracking and ETAs over WebSockets and Google Maps.",
      },
    ],
  },
  {
    id: "oasis",
    kind: "work",
    org: "OASIS INFOBYTES",
    role: "Web Developer Intern",
    place: "Remote",
    from: { y: 2025, m: 8 },
    to: { y: 2025, m: 9 },
    did: ["I built responsive web apps in HTML, CSS and JavaScript, with CRUD, authentication, Local Storage, input validation and cross-browser testing."],
    tags: ["HTML", "CSS", "JavaScript"],
  },
  {
    id: "imperial",
    kind: "work",
    org: "Imperial Healthcare Systems",
    // the title is still being confirmed (résumé vs LinkedIn): this string is the only place it lives
    role: "Full Stack Engineer",
    place: "Remote",
    about: "US-based healthcare company",
    from: { y: 2026, m: 8 },
    did: [
      "I've built several high-end e-commerce sites, each with a fully customisable admin panel for products, content and layout.",
      "I develop inventory, warehouse and product management systems, and tune their APIs, database queries and app logic for performance.",
      "I work with AI agents and LLMs: custom skills, structured context and reusable workflows that speed up development and raise code quality.",
      "And I test it: functional, responsive and cross-browser.",
    ],
    tags: ["E-commerce", "Admin panels", "Inventory", "Warehouse", "AI agents", "Testing"],
  },
];

export const certs: Cert[] = [
  { id: "cisco", by: "Cisco", name: "Computer Networking" },
  { id: "aws-academy", by: "AWS Academy", name: "Cloud Architect Training" },
  { id: "udemy", by: "Udemy", name: "Python Network Automation" },
  { id: "codio", by: "Codio", name: "Cloud Computing Primer" },
];

/** the empty top slot, and the unit it hot-swaps in (a toy for this visit; nothing is saved) */
export const reserved = {
  title: "Reserved",
  line: "Room for one more. Your team?",
  key: "Slot it in",
  team: "Your team",
  role: "Role: let's talk",
  start: "Start: when you say",
  cta: "Write to me",
};

/**
 * @deprecated The old timeline shape. components/about/room/Panel.tsx still reads it, so it is derived
 * from `stints` and can't drift. No "future" entry: Panel would print it as a dated claim.
 */
export interface JourneyStop {
  year: number;
  title: string;
  place: string;
  kind: "origin" | "education" | "work" | "project" | "milestone" | "future";
  body: string;
  tags?: string[];
}

export const journey: JourneyStop[] = stints.map((s) => ({
  year: s.from.y,
  title: `${s.role}, ${s.org}`,
  place: s.place,
  kind: s.kind,
  body: s.did[0],
  tags: s.tags,
}));
