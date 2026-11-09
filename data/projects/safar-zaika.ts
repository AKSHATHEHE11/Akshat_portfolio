import type { Project } from "@/lib/types";
import type { RailwayScene } from "@/components/worlds/railway/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const safarZaika: Project<RailwayScene> = {
  id: "02",
  slug: "safar-zaika",
  title: "Safar Zaika",
  tagline: "Hot regional food, delivered to your seat at the next station.",
  description:
    "Safar Zaika lets railway passengers order from local kitchens along their route. Enter a PNR, pick a station ahead, and the meal is waiting on the platform when your coach rolls in.",
  category: "Railway Food Delivery",
  year: 2025,
  status: "shipped",
  role: ["Product design", "Frontend", "Logistics UX"],
  technologies: [
    { name: "Next.js", group: "frontend", why: "Fast first load on patchy 3G between stations." },
    { name: "React Native", group: "frontend", why: "Delivery partners use the same components on Android." },
    { name: "Node", group: "backend", why: "Order timing service keyed to live train positions." },
    { name: "Express", group: "backend", why: "Small, boring, reliable — the kitchen tablets depend on it." },
    { name: "PostgreSQL", group: "data", why: "Stations, kitchens, menus and time windows." },
    { name: "AWS", group: "cloud", why: "Queues that survive a train running four hours late." },
  ],
  color: { bg: "#14243f", fg: "#f6eedd", accent: "#f2b705" },
  environment: "railway",
  metrics: [
    { label: "Stations covered", value: "418" },
    { label: "Median delivery window", value: "6 min", note: "from platform arrival" },
    { label: "Orders per day", value: "2.3k", note: "peak season" },
  ],
  challenge:
    "On a 14-hour journey passengers get one choice: whatever the pantry car made at six in the morning. Meanwhile every station they pass is famous for something.",
  solution:
    "A PNR-first ordering flow that knows your train, its live delay and the stations ahead — and only shows kitchens that can hit the platform in your coach's window.",
  outcome: "Repeat orders on the same journey became the norm: people ordered breakfast at Kanpur and lunch at Prayagraj.",
  process: [
    { title: "Ride the route", body: "Took the Delhi–Varanasi run three times with a notebook. Mapped where hunger and halts overlap." },
    { title: "PNR as the login", body: "No sign-up. Your ticket already knows your seat, coach and route." },
    { title: "Time is the menu", body: "Menus filter by whether the food can reach your coach in the halt window, not by cuisine." },
    { title: "Platform handoff", body: "Delivery partners see coach position on a platform diagram, not a map pin." },
  ],
  decisions: [
    {
      question: "Login with phone or with PNR?",
      options: [
        { label: "Phone + OTP", note: "Standard, but OTPs fail in tunnels and dead zones." },
        { label: "PNR only", note: "Ten digits the passenger already has on their ticket." },
      ],
      chosen: 1,
      why: "The ticket is the identity. Everything else can be asked for later.",
    },
    {
      question: "Show every kitchen or only reachable ones?",
      options: [
        { label: "Everything", note: "Big menus look impressive and fail at the platform." },
        { label: "Reachable only", note: "Smaller menus that are always on time." },
      ],
      chosen: 1,
      why: "A late meal on a train is not late — it is gone. Reliability beats choice.",
    },
  ],
  links: [
    { label: "Order a meal", href: "#preview" },
    { label: "See the route", href: "#journey" },
  ],
  scene: {},
};
