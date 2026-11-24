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
  // Basic hardening: browsers don't guess file types, and other sites can't frame the portfolio
  // (clickjacking). The portfolio framing project sites (LiveScreen) is a different direction and unaffected.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // the ink sheets: kept for a year, or the browser asks the server again as the ink starts.
        // Give a sheet a new name if it ever changes.
        source: "/fx/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
