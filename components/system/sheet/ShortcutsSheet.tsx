"use client";
import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { site } from "@/data/site";
import { Button } from "@/components/ui/Button";
import { Corners, Kbd } from "@/components/ui/marks";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { SPRING } from "@/lib/motion";
import { seeded } from "@/lib/utils";
import { useDialog } from "./useDialog";

// Group data/site.ts shortcuts by what they do, derived from the data itself.
const GO = new Set(["H", ...site.nav.map((n) => n.key.toUpperCase())]);
const WORLD = new Set(["←", "→", "Esc"]);
type Shortcut = (typeof site.shortcuts)[number];
const has = (s: Shortcut, set: Set<string>) => s.keys.some((k) => set.has(k));
const GROUPS = [
  { title: "Go to", items: site.shortcuts.filter((s) => has(s, GO)) },
  { title: "System", items: site.shortcuts.filter((s) => !has(s, GO) && !has(s, WORLD)) },
  { title: "Inside a world", items: site.shortcuts.filter((s) => has(s, WORLD)) },
].filter((g) => g.items.length);

// Printed card details — deterministic so SSR and client agree.
const BARCODE = Array.from({ length: 44 }, (_, i) => 1 + Math.floor(seeded(i * 13 + 7) * 3));

const micro = "font-mono text-[0.625rem] uppercase tracking-[0.18em]";

/**
 * The keyboard reference card: a printed label-maker card dropped onto the screen. Always paper and
 * ink (it is an object, not UI chrome), so it scopes the light tokens locally.
 */
export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  useDialog(ref, open, onClose);

  const rest = reduced ? 0 : chaos ? -3.5 : -0.8;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4"
          data-lenis-prevent=""
        >
          <motion.div
            aria-hidden
            className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.section
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sys-sheet-title"
            tabIndex={-1}
            className="relative w-full max-w-[44rem] rounded-[4px] bg-paper text-ink shadow-float outline-none [--fg-muted:#66635b] [--fg:#111111] [--line:rgb(17_17_17/0.16)] [--surface:#f8f7f3]"
            initial={{ opacity: 0, y: 70, rotate: reduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0, rotate: rest }}
            exit={{ opacity: 0, y: 50, rotate: reduced ? 0 : 4, transition: { duration: 0.25 } }}
            transition={SPRING.soft}
          >
            <Corners className="text-ink/25" inset={8} size={10} weight={1} />

            <header className={`${micro} flex items-center justify-between gap-4 border-b border-dashed border-ink/25 px-6 py-3 text-ink/60`}>
              <span>{site.version}</span>
              <span>Ref. card · keyboard</span>
            </header>

            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 px-6 pt-7">
              <h2 id="sys-sheet-title" className="display text-[clamp(2.6rem,8vw,4.5rem)]">
                Shortcuts
              </h2>
              <p className="serif-accent pb-1.5 text-[1.375rem] leading-none text-ink/60">keep near keyboard</p>
            </div>

            <div className="grid gap-x-12 gap-y-7 px-6 py-7 sm:grid-cols-2">
              {GROUPS.map((g, gi) => (
                <section key={g.title} aria-label={g.title} className={gi === 0 ? "sm:row-span-2" : undefined}>
                  <h3 className={`${micro} mb-3 border-b border-ink/15 pb-2 text-ink/55`}>{g.title}</h3>
                  <ul className="space-y-2.5">
                    {g.items.map((s) => (
                      <li key={s.label} className="flex items-center gap-3 text-[0.9375rem] leading-tight">
                        <span>{s.label}</span>
                        <span aria-hidden className="h-px flex-1 translate-y-1 border-b border-dotted border-ink/35" />
                        <span className="flex shrink-0 gap-1">
                          {s.keys.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-ink/25 px-6 py-5">
              <div>
                <span aria-hidden className="flex h-7 items-stretch gap-[2px]">
                  {BARCODE.map((w, i) => (
                    <span key={i} className="bg-ink" style={{ width: w }} />
                  ))}
                </span>
                <p className={`${micro} mt-2 text-ink/55`}>Undocumented features: 2</p>
              </div>
              <Button variant="key" size="sm" icon={null} magnetic={false} onClick={onClose}>
                Close <span className="text-ink/45">Esc</span>
              </Button>
            </footer>

            {/* chaos: somebody got hold of the rubber stamp */}
            <span
              aria-hidden
              className="chaos-only pointer-events-none absolute top-16 right-7 rotate-[-14deg] rounded-[4px] border-2 border-signal px-2.5 py-1 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.2em] text-signal mix-blend-multiply"
            >
              Chaos: on
            </span>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
