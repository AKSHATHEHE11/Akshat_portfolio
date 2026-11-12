import type { Project, ProjectSummary } from "@/lib/types";
import { decisionos } from "./decisionos";
import { safarZaika } from "./safar-zaika";
import { fybr8 } from "./fybr8";
import { credwise } from "./credwise";
import { synthoraSid } from "./synthora-sid";
import { nullField } from "./null-field";

/** All projects, in display order. Add/replace a project by adding a file here — no UI changes needed. */
export const projects: Project[] = [decisionos, safarZaika, fybr8, credwise, synthoraSid, nullField];

/** The first three are the fully developed "Selected Worlds". */
export const featured = projects.slice(0, 3);

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export function toSummary(p: Project): ProjectSummary {
  const { id, slug, title, tagline, category, year, status, color, environment, heroImage } = p;
  return { id, slug, title, tagline, category, year, status, color, environment, heroImage };
}

export const summaries: ProjectSummary[] = projects.map(toSummary);

/** Neighbouring worlds for the project switcher (wraps around). */
export function neighbours(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  const n = projects.length;
  return { prev: summaries[(i - 1 + n) % n], next: summaries[(i + 1) % n], index: i };
}
