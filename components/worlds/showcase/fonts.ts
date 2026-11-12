import { Barlow, Barlow_Semi_Condensed, Inter, Sofia_Sans_Condensed } from "next/font/google";

// A showcased project speaks in its own website's typefaces (read from that site's CSS).
// Not preloaded: the world route serves every project, and only these pages use them.
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });
const sofia = Sofia_Sans_Condensed({ subsets: ["latin"], display: "swap", preload: false });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", preload: false });
const barlowSemi = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["700", "800"], display: "swap", preload: false });

/** class names for body text and headlines, per project slug (none → the portfolio's own fonts) */
export const brandFonts: Record<string, { body: string; display: string }> = {
  fybr8: { body: inter.className, display: sofia.className },
  "safar-zaika": { body: barlow.className, display: barlowSemi.className },
};
