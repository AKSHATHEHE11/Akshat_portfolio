import type { MetadataRoute } from "next";
import { site } from "@/data/site";

// /manifest.webmanifest: the name and colours phones use when the site is added to a home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.short,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f2eee7", // --color-bone
    theme_color: "#111111", // --color-ink
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
