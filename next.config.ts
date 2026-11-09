import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is deliberately OFF. With it on, Next keeps the last few routes mounted but
  // hidden (React <Activity>), which leaves WebGL canvases, ScrollTrigger pins and GSAP timelines
  // half-alive behind the visible page. This site has no request-time data, so classic
  // unmount-on-navigate is both simpler and safer. Page transitions use React <ViewTransition>.
  turbopack: {
    rules: {
      // Tailwind compiles plain stylesheets. *.module.css is excluded on purpose: `as: "*.css"` would
      // otherwise re-type CSS Modules as global CSS, leaving every `styles.x` undefined.
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
