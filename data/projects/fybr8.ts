import type { Project } from "@/lib/types";

// DUMMY project content — realistic shape, replace with real details later.

export const fybr8: Project = {
  id: "03",
  slug: "fybr8",
  title: "Fybr8",
  tagline: "Fabric-first jeans, fair prices.",
  description:
    "A sleek, fabric-focused denim brand with a new-gen look: one straight comfort fit in twelve shades, cut from 12.5 oz cotton-rich denim, sold through its own store and a three-step checkout.",
  category: "Fashion / Denim Commerce",
  year: 2025,
  status: "live",
  role: ["Art direction", "Frontend", "Commerce UX"],
  technologies: [
    { name: "Next.js", group: "frontend", why: "Static lookbook pages with live inventory islands." },
    { name: "GSAP", group: "motion", why: "The sideways lookbook, the fabric reveals, the bag toss." },
    { name: "Three.js", group: "motion", why: "A cloth you can actually tug on the product page." },
    { name: "Shopify Storefront API", group: "backend", why: "Inventory and checkout stay with the merchant." },
    { name: "Vercel", group: "cloud", why: "Edge-cached product pages for drop days." },
    { name: "Figma", group: "design", why: "Every garment drawn as a flat from real fabric scans." },
  ],
  // the live storefront's own palette: canvas, charcoal and its royal-blue accent
  color: { bg: "#f7f5f0", fg: "#262626", accent: "#4169e1" },
  environment: "fashion",
  metrics: [
    { label: "Conversion on drop day", value: "4.8%", note: "category average ~1.9%" },
    { label: "Returns for fit", value: "−22%", note: "first two drops" },
    { label: "Time to checkout", value: "41 s", note: "median" },
  ],
  challenge:
    "Denim is bought with your hands. Most stores flatten it into identical white-background thumbnails, then wonder why returns are high.",
  solution:
    "Product pages that lead with the cloth: weight, weave and stretch you can poke at, a fit finder that uses your own jeans as the ruler, and editorial layouts that still check out in three taps.",
  outcome: "Drop days sold through in hours, and fewer pairs came back for fit.",
  process: [
    { title: "Fabric before photos", body: "Started from swatches, not screens. Every product page leads with weight, weave and stretch." },
    { title: "Fit by comparison", body: "Measure a pair you already love; the store tells you which Fybr8 fit matches it." },
    { title: "Editorial, but fast", body: "Oversized type and a sideways lookbook — with add-to-bag never more than one tap away." },
    { title: "Drop-day hardening", body: "Edge caching and a queue-free checkout for the ten minutes that matter." },
  ],
  decisions: [
    {
      question: "Model photography or fabric close-ups first?",
      options: [
        { label: "Model first", note: "Aspirational — and the same as every other store." },
        { label: "Fabric first", note: "Tactile, specific, and it answers the real question." },
      ],
      chosen: 1,
      why: "People asked “how heavy is it?” far more than “how does it look on him?”.",
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
    {
      question: "Account before checkout, or after?",
      options: [
        { label: "Account first", note: "Good for the CRM. Bad for a drop that lasts ten minutes." },
        { label: "Pay, then claim", note: "Guest checkout; the receipt turns into an account with one tap." },
      ],
      chosen: 1,
      why: "Every extra field on drop day cost pairs. Accounts can wait for the receipt.",
    },
  ],
  // the real store; it allows framing, so it runs inside the world (scripts/check-embeds.mjs)
  heroImage: "/projects/fybr8/card.webp",
  live: { url: "https://www.fybr8.com/", mode: "embed", capture: "/projects/fybr8/poster.webp", permission: "own" },
  // read from the live checkout (fybr8.com/checkout)
  highlights: {
    title: "Checkout in three steps",
    intro: "What it does differently: no password, one short form, and you only pay part of the price to book your pair.",
    steps: [
      {
        title: "Sign in with a code",
        text: "No password. A one-time code comes on WhatsApp or email, or it's one tap with Google, and returning customers find their saved addresses already filled in.",
      },
      {
        title: "One screen for the address",
        text: "Your name and where it goes: that's the whole form. The PIN code is checked, and the delivery estimate for it shows before you pay.",
      },
      {
        title: "Pre-book, pay the rest later",
        text: "Pay part now to book your pair. The balance goes online before dispatch, with a link when your jeans are ready, or cash on delivery, confirmed on WhatsApp first. Payments run through Razorpay.",
      },
    ],
  },
  links: [{ label: "Shop the drop", href: "#preview" }],
  scene: null,
};
