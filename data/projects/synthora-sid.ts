import type { Project } from "@/lib/types";
import type { BlueprintScene } from "@/components/worlds/blueprint/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const synthoraSid: Project<BlueprintScene> = {
  id: "05",
  slug: "synthora-sid",
  title: "Synthora SID",
  tagline: "A student information system students don't hate.",
  description:
    "Synthora SID replaces a campus's five portals with one: timetable, attendance, grades, fees and a digital ID — designed for the student first and the registrar second.",
  category: "Student Information System",
  year: 2024,
  status: "shipped",
  role: ["UX research", "Product design", "Full-stack"],
  technologies: [
    { name: "Next.js", group: "frontend", why: "One codebase for students, faculty and admin views." },
    { name: "TypeScript", group: "frontend", why: "Academic rules are complicated; types keep them honest." },
    { name: "Node", group: "backend", why: "Integrations with the legacy registrar database." },
    { name: "PostgreSQL", group: "data", why: "Row-level security per department." },
    { name: "Docker", group: "cloud", why: "Runs on the campus's own servers." },
  ],
  color: { bg: "#1c3fa8", fg: "#eaf0ff", accent: "#ffd23f" },
  environment: "blueprint",
  metrics: [
    { label: "Weekly active students", value: "3,040" },
    { label: "Portals replaced", value: "5 → 1" },
    { label: "Attendance disputes", value: "−70%" },
  ],
  challenge:
    "Students juggled five portals with five passwords to answer one question: where do I need to be, and am I about to fail attendance?",
  solution:
    "One home screen built around the next class and the attendance margin, a digital ID that works offline, and admin tools that finally agree with each other.",
  outcome: "Daily use without reminders — and the registrar retired two of the old systems.",
  process: [
    { title: "Map the campus", body: "Walked a student's week and drew every system they touched on a blueprint of the campus." },
    { title: "Next class first", body: "The home screen answers 'where now?' before anything else." },
    { title: "Margin, not percentage", body: "Attendance shows how many classes you can still miss, not a percentage you have to do maths with." },
  ],
  decisions: [
    {
      question: "Attendance as a percentage or as a margin?",
      options: [
        { label: "Percentage", note: "Accurate and useless at 8:55am." },
        { label: "Classes you can miss", note: "One number that changes behaviour." },
      ],
      chosen: 1,
      why: "Students don't make decisions in percentages.",
    },
  ],
  links: [
    { label: "Open the student view", href: "#preview" },
    { label: "Read the process", href: "#process" },
  ],
  scene: {},
};
