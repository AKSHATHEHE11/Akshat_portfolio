import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { projects } from "@/data/projects";

// /sitemap.xml: the pages in the nav, then every project world.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", ...site.nav.map((n) => n.href), ...projects.map((p) => `/work/${p.slug}`)];
  return [...new Set(pages)].map((path) => ({ url: `${site.url}${path}` }));
}
