// The journey: years become coordinates, roles become destinations. DUMMY entries.

export interface JourneyStop {
  year: number;
  title: string;
  place: string;
  kind: "origin" | "education" | "work" | "project" | "milestone" | "future";
  body: string;
  tags?: string[];
}

export const journey: JourneyStop[] = [
  {
    year: 2021,
    title: "First thing I built that someone else used",
    place: "A school club website",
    kind: "origin",
    body: "Forty students, one event calendar and a bug that sent every RSVP to the same inbox. Hooked.",
    tags: ["HTML", "CSS", "jQuery"],
  },
  {
    year: 2022,
    title: "B.Tech, Computer Science",
    place: "University (dummy)",
    kind: "education",
    body: "Algorithms by day, side projects by night. Learned that shipping teaches faster than grades.",
    tags: ["Algorithms", "Systems"],
  },
  {
    year: 2023,
    title: "Freelance design engineer",
    place: "Independent",
    kind: "work",
    body: "Landing pages that became products. Started owning the whole stack because handoffs kept losing the idea.",
    tags: ["React", "Node", "Figma"],
  },
  {
    year: 2024,
    title: "Synthora SID ships",
    place: "Campus pilot",
    kind: "project",
    body: "A student information system 3,000 students actually opened on purpose.",
    tags: ["Next.js", "PostgreSQL"],
  },
  {
    year: 2025,
    title: "Safar Zaika + Fybr8",
    place: "Two launches, one summer",
    kind: "project",
    body: "Railway food delivery and a denim store. Learned logistics from one, taste from the other.",
    tags: ["Product", "Commerce"],
  },
  {
    year: 2026,
    title: "DecisionOS",
    place: "AI product (prototype)",
    kind: "milestone",
    body: "A boardroom of AI agents that argue before a founder decides. My favourite hard problem so far.",
    tags: ["LLM agents", "Data viz"],
  },
  {
    year: 2027,
    title: "Next stop: unknown",
    place: "Your project?",
    kind: "future",
    body: "The rail keeps going. Say hello if you want to be the next station.",
  },
];
