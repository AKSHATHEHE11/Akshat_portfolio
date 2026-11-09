import type { Project } from "@/lib/types";
import type { FashionScene } from "@/components/worlds/fashion/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const fybr8: Project<FashionScene> = {
  id: "03",
  slug: "fybr8",
  title: "Fybr8",
  tagline: "Denim commerce with the texture left in.",
  description:
    "Fybr8 is a denim label's online store designed like a lookbook you can buy from: fabric first, fit second, checkout in three taps.",
  category: "Fashion / Denim Commerce",
  year: 2025,
  status: "live",
  role: ["Art direction", "Frontend", "Commerce UX"],
  technologies: [
    { name: "Next.js", group: "frontend", why: "Static lookbook pages with live inventory islands." },
    { name: "GSAP", group: "motion", why: "Horizontal lookbook and fabric reveals." },
    { name: "Three.js", group: "motion", why: "A cloth you can actually tug on the product page." },
    { name: "Shopify Storefront API", group: "backend", why: "Inventory and checkout stay with the merchant." },
    { name: "Vercel", group: "cloud", why: "Edge-cached product pages for drop days." },
  ],
  color: { bg: "#e9e6df", fg: "#14161c", accent: "#c8f03c" },
  environment: "fashion",
  metrics: [
    { label: "Conversion on drop day", value: "4.8%", note: "category average ~1.9%" },
    { label: "Returns for fit", value: "−22%" },
    { label: "Time to checkout", value: "41 s", note: "median" },
  ],
  challenge:
    "Denim is bought with your hands. Most stores flatten it into identical white-background thumbnails, then wonder why returns are high.",
  solution:
    "Fabric-first product pages: weight, weave and stretch shown as interactive texture, a fit guide that uses your own jeans as reference, and editorial layouts that still check out in three taps.",
  outcome: "Drop days sold through in hours, and fewer pairs came back for fit.",
  process: [
    { title: "Fabric before photos", body: "Started from swatches, not screens. Every product page leads with weight, weave and stretch." },
    { title: "Fit by comparison", body: "Measure a pair you already love; the store tells you which Fybr8 fit matches it." },
    { title: "Editorial, but fast", body: "Oversized type and horizontal lookbooks — with the add-to-bag never more than one tap away." },
    { title: "Drop-day hardening", body: "Edge caching and queue-free checkout for the ten minutes that matter." },
  ],
  decisions: [
    {
      question: "Model photography or fabric close-ups first?",
      options: [
        { label: "Model first", note: "Aspirational — and the same as every other store." },
        { label: "Fabric first", note: "Tactile, specific, and it answers the real question." },
      ],
      chosen: 1,
      why: "People asked 'how heavy is it?' far more than 'how does it look on him?'.",
    },
    {
      question: "Size chart or fit comparison?",
      options: [
        { label: "Size chart", note: "Universal, abstract, widely ignored." },
        { label: "Fit comparison", note: "Uses a pair you already own as the ruler." },
      ],
      chosen: 1,
      why: "Nobody knows their inseam. Everyone knows their favourite jeans.",
    },
  ],
  links: [
    { label: "Shop the drop", href: "#preview" },
    { label: "Read the process", href: "#process" },
  ],
  scene: {},
};
