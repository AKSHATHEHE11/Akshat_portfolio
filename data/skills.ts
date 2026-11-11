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
