"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/marks";
import { BEZIER } from "@/lib/motion";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { closeDevVision } from "./actions";

// Families are read live from the specimens; these are the roles/axes the tokens were set up with.
const FONTS = [
  { cls: "font-display", role: "Display · UI", axes: "wght 100–900 · wdth 62–125" },
  { cls: "font-serif italic", role: "Accent", axes: "roman + italic" },
  { cls: "font-mono", role: "System", axes: "400 · 500 · 600" },
  { cls: "font-crt text-signal", role: "CRT only", axes: "400" },
];
const SWATCHES = ["--bg", "--fg", "--fg-muted", "--surface", "--line", "--accent", "--signal"];

const micro = "font-mono text-[0.625rem] uppercase tracking-[0.14em]";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-dashed border-signal/30 px-4 py-3.5">
      <h3 className={cn(micro, "mb-2.5 text-bone/50")}>{title}</h3>
      {children}
    </section>
  );
}

/** The floating BLUEPRINT sheet: live type, colour tokens and system state. */
export function BlueprintPanel() {
  const chaos = useSystem((s) => s.chaos);
  const theme = useSystem((s) => s.theme);
  const sound = useSystem((s) => s.sound);
  const world = useSystem((s) => s.world);
  const reduced = useSystem((s) => s.reducedMotion);
  const coarse = useSystem((s) => s.coarse);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }));
  const fontNames = useRef<(HTMLSpanElement | null)[]>([]);
  const fontSamples = useRef<(HTMLSpanElement | null)[]>([]);
  const values = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Read what the browser actually resolved (theme- and world-dependent), straight into the text.
  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    SWATCHES.forEach((v, i) => {
      const el = values.current[i];
      if (el) el.textContent = root.getPropertyValue(v).trim() || "unset";
    });
    fontSamples.current.forEach((el, i) => {
      const name = fontNames.current[i];
      if (el && name) name.textContent = getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    });
  }, [theme, world, chaos]);

  const state: [string, string, boolean?][] = [
    ["Chaos", chaos ? "on" : "off", chaos],
    ["Theme", theme],
    ["Sound", sound ? "on" : "off", sound],
    ["World", world ?? "none", !!world],
    ["Motion", reduced ? "reduced" : "full"],
    ["Pointer", coarse ? "coarse" : "fine"],
    ["Viewport", `${vp.w}×${vp.h}`],
    ["DPR", `${Math.round(vp.dpr * 100) / 100}`],
  ];

  return (
    <motion.aside
      aria-labelledby="sys-blueprint-title"
      data-lenis-prevent=""
      className="fixed top-[calc(var(--nav-h)+1rem)] right-(--margin) z-[70] max-h-[calc(100svh-var(--nav-h)-2rem)] w-[21rem] overflow-y-auto overscroll-contain rounded-[8px] border border-signal/45 bg-ink/92 text-bone shadow-float backdrop-blur-md max-md:inset-x-3 max-md:top-auto max-md:bottom-3 max-md:max-h-[52svh] max-md:w-auto"
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: BEZIER.out }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-dashed border-signal/40 px-4 pt-4 pb-3.5">
        <div>
          <h2 id="sys-blueprint-title" className="display text-[2rem] text-signal">
            Blueprint
          </h2>
          <p className="serif-accent mt-1 text-[1.15rem] leading-tight text-bone/75">You found the blueprint.</p>
        </div>
        <Button variant="key" size="sm" icon={null} magnetic={false} onClick={closeDevVision} aria-label="Close dev vision">
          <span aria-hidden className="relative block size-2.5">
            <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
            <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
          </span>
        </Button>
      </header>

      <Section title="Type">
        <ul className="space-y-2">
          {FONTS.map((f, i) => (
            <li key={f.cls} className="flex items-center gap-3">
              <span
                ref={(el) => {
                  fontSamples.current[i] = el;
                }}
                className={cn(f.cls, "w-10 shrink-0 text-[1.75rem] leading-none")}
              >
                Aa
              </span>
              <span className="min-w-0">
                <span
                  ref={(el) => {
                    fontNames.current[i] = el;
                  }}
                  className="block truncate text-[0.875rem] leading-tight"
                />
                <span className={cn(micro, "block text-bone/45")}>
                  {f.role} · {f.axes}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Colour">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {SWATCHES.map((v, i) => (
            <li key={v} className="flex min-w-0 items-center gap-2">
              <span className="size-5 shrink-0 rounded-[3px] border border-bone/20" style={{ background: `var(${v})` }} />
              <span className="min-w-0">
                <span className="block font-mono text-[0.6875rem] leading-tight">{v}</span>
                <span
                  ref={(el) => {
                    values.current[i] = el;
                  }}
                  className="block truncate font-mono text-[0.625rem] leading-tight text-bone/45"
                />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="State">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {state.map(([k, v, lit]) => (
            <div key={k} className={cn(micro, "flex justify-between gap-2 border-b border-bone/10 pb-1")}>
              <dt className="text-bone/45">{k}</dt>
              <dd className={lit ? "text-accent" : undefined}>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <p className={cn(micro, "flex items-center gap-2 px-4 py-3 text-bone/50")}>
        <Kbd>Shift</Kbd>+<Kbd>D</Kbd> or <Kbd>Esc</Kbd> to fold it away
      </p>
    </motion.aside>
  );
}
