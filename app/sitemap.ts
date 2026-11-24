import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { projects } from "@/data/projects";

// /sitemap.xml: the pages in the nav, then the real projects. The demo worlds (no `live` site) stay out,
// so search engines aren't handed made-up work.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", ...site.nav.map((n) => n.href), ...projects.filter((p) => p.live).map((p) => `/work/${p.slug}`)];
  return [...new Set(pages)].map((path) => ({ url: `${site.url}${path}` }));
}
