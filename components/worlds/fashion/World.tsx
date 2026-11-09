"use client";
// Fybr8 — denim commerce as an editorial lookbook you can buy from.
// cover (identity + cloth) → spread (story) → lookbook (sideways) → store (#preview) →
// fitting-room notes (#process) → swatch book (decisions) → care label (tech) → price tags (outcome).
import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./fashion.css";
import type { WorldProps } from "../types";
import { CareLabel } from "./CareLabel";
import { Cover } from "./Cover";
import { Decisions } from "./Decisions";
import { Lookbook } from "./Lookbook";
import { PriceTags } from "./PriceTags";
import { Process } from "./Process";
import type { FashionScene } from "./scene";
import { BagButton } from "./store/BagButton";
import { BagDrawer } from "./store/BagDrawer";
import { StoreProvider } from "./store/context";
import { QuickView } from "./store/QuickView";
import { Store } from "./store/Store";
import { Story } from "./Story";

export default function FashionWorld({ project }: WorldProps<FashionScene>) {
  const { color, scene } = project;
  // Fonts landing, a filter, the fit-finder tab or a revealed decision change the page height under
  // the triggers below the store: Providers re-measures every ScrollTrigger when #main's height settles.

  // the world keeps its own palette whatever the site theme is: the site's semantic tokens are
  // re-pointed here too, so shared UI (Button, focus, selection) speaks Fybr8 inside the world
  const palette = {
    "--fy-bg": color.bg,
    "--fy-fg": color.fg,
    "--fy-accent": color.accent,
    "--fy-paper": "#f4f1ea",
    "--fy-muted": "#5e5b55",
    "--bg": color.bg,
    "--fg": color.fg,
    "--fg-muted": "#5e5b55",
    "--line": "rgb(20 22 28 / 0.14)",
    "--line-strong": color.fg,
    "--surface": "#f4f1ea",
    "--surface-2": "#e3dfd5",
    "--accent": color.accent,
    "--accent-ink": color.fg,
    backgroundColor: color.bg,
    color: color.fg,
  } as CSSProperties;

  return (
    <StoreProvider scene={scene}>
      <div className="relative overflow-x-clip pb-28" style={palette}>
        <Cover project={project} />
        <Story project={project} />
        <Lookbook scene={scene} gallery={project.gallery} />
        <Store title={project.title} />
        <Process steps={project.process} />
        <Decisions decisions={project.decisions} swatches={scene.swatchbook} />
        <CareLabel tech={project.technologies} label={scene.label} />
        <PriceTags metrics={project.metrics} title={project.title.toUpperCase()} />
        <span id="fy-end" aria-hidden className="block h-px" />
      </div>
      <Overlay style={palette}>
        <BagButton />
        <QuickView />
        <BagDrawer />
      </Overlay>
    </StoreProvider>
  );
}

/** Fixed UI lives on <body> so no transformed ancestor can re-anchor it; it keeps the world's palette. */
const never = () => () => {};
function Overlay({ style, children }: { style: CSSProperties; children: ReactNode }) {
  const host = useSyncExternalStore(never, () => document.body, () => null);
  return host ? createPortal(<div className="contents" style={style}>{children}</div>, host) : null;
}
