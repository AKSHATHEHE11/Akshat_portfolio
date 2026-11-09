import type { Project } from "@/lib/types";
import type { LedgerScene } from "@/components/worlds/ledger/scene";

// DUMMY project content — realistic shape, replace with real details later.
export const credwise: Project<LedgerScene> = {
  id: "04",
  slug: "credwise",
  title: "CredWise",
  tagline: "Credit decisions you can actually explain.",
  description:
    "CredWise is an AI credit-risk engine for small lenders that scores thin-file borrowers from bank statements — and shows the exact reasons behind every number.",
  category: "AI Credit Intelligence",
  year: 2025,
  status: "prototype",
  role: ["Product design", "Frontend", "ML explainability"],
  technologies: [
    { name: "React", group: "frontend", why: "Dense analyst tooling with keyboard-first navigation." },
    { name: "Python", group: "backend", why: "Statement parsing and feature pipelines." },
    { name: "Gradient boosting", group: "ai", why: "Accurate on tabular data and explainable with SHAP." },
    { name: "NLP", group: "ai", why: "Categorises messy bank-statement narrations." },
    { name: "PostgreSQL", group: "data", why: "Every score is versioned with the features that produced it." },
    { name: "AWS", group: "cloud", why: "Encrypted document storage with short retention." },
  ],
  color: { bg: "#0f100d", fg: "#f2eee7", accent: "#ff5a1f" },
  environment: "ledger",
  metrics: [
    { label: "Thin-file approvals", value: "+31%", note: "at constant default rate" },
    { label: "Analyst review time", value: "−48%" },
    { label: "Reason codes per score", value: "5" },
  ],
  challenge:
    "Small lenders turn away good borrowers who have no credit history, because the alternative is a black-box model nobody in compliance can defend.",
  solution:
    "Scores built from twelve months of bank statements, each delivered with five plain-language reasons and a what-would-change-it simulator analysts can show the borrower.",
  outcome: "More approvals for first-time borrowers, and a compliance team that signed off in one review.",
  process: [
    { title: "Read a thousand statements", body: "The signal was in the narration text — rent, salary, EMI — not in the totals." },
    { title: "Reasons before scores", body: "The interface was designed around the explanation; the number came second." },
    { title: "Counterfactuals", body: "Every decline shows what would flip it: a lower EMI, three more months of salary credits." },
  ],
  decisions: [
    {
      question: "Most accurate model or most explainable?",
      options: [
        { label: "Deep model", note: "Two points more AUC, zero points of trust." },
        { label: "Boosted trees + SHAP", note: "Nearly as accurate, fully explainable." },
      ],
      chosen: 1,
      why: "A score you cannot explain to the borrower is a score you cannot use.",
    },
  ],
  links: [
    { label: "Score a borrower", href: "#preview" },
    { label: "Read the process", href: "#process" },
  ],
  scene: {},
};
