import type { MetadataRoute } from "next";
import { site } from "@/data/site";

// /robots.txt: everything is public except the music API, which only the music island calls.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
