import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/transitions/transitions.css";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/data/site";
import Providers from "@/components/providers/Providers";
import Boot from "@/components/system/Boot";
import Nav from "@/components/system/Nav";
import MusicIsland from "@/components/system/MusicIsland";
import Hud from "@/components/system/Hud";
import ScrollRail from "@/components/system/ScrollRail";
import Shortcuts from "@/components/system/Shortcuts";
import SecretMode from "@/components/system/SecretMode";
import Cursor from "@/components/system/Cursor";
import Grain from "@/components/system/Grain";
import ChaosLayer from "@/components/chaos/ChaosLayer";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.short}` },
  description: site.description,
  openGraph: { title: site.title, description: site.description, type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets fixed bars use env(safe-area-inset-*) around notches and the home indicator.
  // Pinch-zoom stays enabled on purpose (no maximumScale) — accessibility.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eee7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0b" },
  ],
};

// Runs before first paint: restores theme / chaos / boot state so nothing flashes.
const preflight = `(function(){try{var d=document.documentElement,t=localStorage.getItem('akshat:theme');if(t==='dark'||t==='light')d.dataset.theme=t;d.dataset.chaos=sessionStorage.getItem('akshat:chaos')==='on'?'on':'off';d.dataset.booted=sessionStorage.getItem('akshat:booted')==='1'?'1':'0';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-chaos="off" data-booted="0" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: preflight }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <Boot />
          <Nav />
          <MusicIsland />
          <ChaosLayer />
          <main id="main">{children}</main>
          <Hud />
          <ScrollRail />
          <Shortcuts />
          <SecretMode />
          <Cursor />
          <Grain />
        </Providers>
      </body>
    </html>
  );
}
