"use client";
import { useEffect, useEffectEvent, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { useLenis } from "lenis/react";
import { experiments } from "@/data/experiments";
import { journey } from "@/data/experience";
import { profile } from "@/data/profile";
import { stack, type PartGroup } from "@/data/skills";
import { PROOF } from "../build/layout";
import { useDialog } from "@/components/system/sheet/useDialog";
import { Button } from "@/components/ui/Button";
import { Corners, Led } from "@/components/ui/marks";
import { useReducedMotion } from "@/lib/hooks";
import { BEZIER, SPRING } from "@/lib/motion";
import { play } from "@/lib/sound";
import { cn, pad } from "@/lib/utils";
import { OBJECTS, type Body, type RoomObject } from "./objects";
import { MotionUser } from "@/components/providers/MotionUser";

const MONO = "font-mono text-micro uppercase tracking-[0.14em]";

/** The résumé's skills in this object's groups, each with where it was used (no levels, no years). */
function Skills({ groups }: { groups: PartGroup["id"][] }) {
  return (
    <div className="grid gap-8">
      {stack
        .filter((g) => groups.includes(g.id))
        .map((g) => (
          <section key={g.id} aria-label={g.label}>
            {groups.length > 1 && <h3 className={cn(MONO, "text-fg-muted")}>{g.label}</h3>}
            <p className="serif-accent mt-1 text-[1.6rem] leading-tight">{g.summary}</p>
            <ul className="mt-4 border-t border-line">
              {g.parts.map((s) => (
                <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-right font-mono text-[0.75rem] uppercase tracking-[0.08em] text-fg-muted">
                    {s.used ? s.used.map((u) => PROOF[u].tag).join(" · ") : "On the list"}
                  </span>
                  {s.used && s.note && <span className="col-span-2 text-[0.9375rem] leading-snug text-fg-muted">{s.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

/** The sketchbook: design work has its own page. */
function Design() {
  return (
    <>
      <p className="serif-accent text-[1.6rem] leading-tight">The design side has a room of its own.</p>
      <p className="mt-3 text-[0.9375rem] leading-snug text-fg-muted">Video edits, posters, 3D designs and concert visuals live on the design page.</p>
      <Button href="/design" variant="ghost" size="sm" className="mt-6" icon={<ArrowUpRight size={14} strokeWidth={2} />}>
        Open the design page
      </Button>
    </>
  );
}

const LED: Record<string, "go" | "signal" | "accent"> = { stable: "go", unstable: "accent", volatile: "signal" };

function Experiments() {
  return (
    <>
      <ul className="border-t border-line">
        {experiments.map((e) => (
          <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-line py-3">
            <span className="font-mono text-[0.75rem] text-fg-muted">{e.id}</span>
            <span>
              <span className="block font-medium">{e.title}</span>
              <span className="block text-[0.9375rem] leading-snug text-fg-muted">{e.verb}.</span>
            </span>
            <span className={cn(MONO, "flex items-center gap-2 text-fg-muted")}>
              <Led tone={LED[e.status] ?? "go"} pulse={e.status === "volatile"} />
              {e.status}
            </span>
          </li>
        ))}
      </ul>
      <Button href="/experiments" variant="ink" size="sm" className="mt-6">
        Open the lab
      </Button>
    </>
  );
}

function Interests() {
  return (
    <ol className="border-t border-line">
      {profile.interests.map((it, i) => (
        <li key={it} className="flex items-baseline gap-4 border-b border-line py-3.5">
          <span className="font-mono text-[0.75rem] text-fg-muted">{pad(i + 1)}</span>
          <span className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Journey({ onScan }: { onScan: () => void }) {
  const past = journey.filter((j) => j.kind !== "future");
  const last = past[past.length - 1];
  const next = journey.find((j) => j.kind === "future");
  return (
    <>
      <p className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">
        {past.length} stops, {past[0]?.year}–{last?.year}.
      </p>
      {last && (
        <div className="mt-5 border-t border-line pt-4">
          <p className={cn(MONO, "text-fg-muted")}>Latest · {last.year}</p>
          <p className="mt-2 font-medium">{last.title}</p>
          <p className="mt-1 text-[0.9375rem] leading-snug text-fg-muted">{last.body}</p>
        </div>
      )}
      {next && (
        <div className="mt-4 border-t border-dashed border-line-strong/40 pt-4">
          <p className={cn(MONO, "text-fg-muted")}>Next · {next.year}</p>
          <p className="serif-accent mt-1 text-[1.6rem] leading-tight">{next.title}</p>
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-6" icon={<ArrowDown size={14} strokeWidth={2} />} onClick={onScan}>
        Scan the timeline
      </Button>
    </>
  );
}

function Content({ body, onGo }: { body: Body; onGo: (id: string) => void }) {
  switch (body.kind) {
    case "skills":
      return (
        <>
          <Skills groups={body.groups} />
          <Button variant="ghost" size="sm" className="mt-6" icon={<ArrowDown size={14} strokeWidth={2} />} onClick={() => onGo("#build")}>
            Trace it in the build system
          </Button>
        </>
      );
    case "experiments":
      return <Experiments />;
    case "interests":
      return <Interests />;
    case "journey":
      return <Journey onScan={() => onGo("#journey")} />;
    case "design":
      return <Design />;
  }
}

/**
 * The detail panel for the picked object. ≥1024px it slides over the left column, beside the desk,
 * and stays non-modal (click another object to swap). Below that it is a modal bottom sheet.
 */
export function Panel({
  obj,
  wide,
  onClose,
  onPick,
}: {
  obj: RoomObject | null;
  wide: boolean;
  onClose: () => void;
  onPick: (id: RoomObject["id"]) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const open = obj !== null;
  useDialog(ref, open && !wide, onClose);

  // non-modal (wide): take focus once when the panel opens; Esc closes from anywhere on the page
  const closeEvent = useEffectEvent(onClose);
  useEffect(() => {
    if (!open || !wide) return;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      closeEvent();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, wide]);

  // stepping to another object starts it at the top, not halfway down the last one's list
  const id = obj?.id;
  useEffect(() => {
    if (id) ref.current?.scrollTo({ top: 0 });
  }, [id]);

  const i = obj ? OBJECTS.findIndex((o) => o.id === obj.id) : 0;
  const prev = OBJECTS[(i - 1 + OBJECTS.length) % OBJECTS.length];
  const next = OBJECTS[(i + 1) % OBJECTS.length];
  const step = (o: RoomObject) => {
    play("click");
    onPick(o.id);
  };
  const go = (hash: string) => {
    onClose();
    // the sheet holds Lenis stopped while it is open: scroll on the next frame, once it has let go
    requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(hash, { offset: -16, force: true });
      else document.querySelector(hash)?.scrollIntoView();
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") step(prev);
    else if (e.key === "ArrowRight") step(next);
    else return;
    e.preventDefault();
  };

  const from = reduced ? { opacity: 0 } : wide ? { opacity: 0, x: -36 } : { y: "100%" };

  return (
    <MotionUser>
    <AnimatePresence>
      {obj && (
        <motion.div
          key="ab-panel"
          className={wide ? "absolute inset-0 z-[3]" : "fixed inset-0 z-[70] flex items-end"}
          data-swipe="local"
        >
          {!wide && (
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-ink/45"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <motion.section
            ref={ref}
            id="ab-panel"
            role="dialog"
            aria-modal={wide ? undefined : true}
            aria-labelledby="ab-panel-title"
            tabIndex={-1}
            data-arrows="local"
            data-lenis-prevent=""
            onKeyDown={onKey}
            className={cn(
              "relative flex w-full flex-col overflow-y-auto overscroll-contain bg-surface text-fg outline-none",
              wide ? "h-full border border-line-strong shadow-float" : "max-h-[86svh] rounded-t-[12px] shadow-float",
            )}
            initial={from}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ ...from, transition: { duration: 0.28, ease: BEZIER.machine } }}
            transition={reduced ? { duration: 0.2 } : SPRING.soft}
          >
            {wide && <Corners className="text-fg/30" inset={8} size={10} weight={1} />}
            {!wide && <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-fg/20" />}

            <header className={cn(MONO, "sticky top-0 z-[1] flex items-center justify-between gap-4 bg-surface px-6 pt-4 pb-3 text-fg-muted md:px-8")}>
              <span>
                <span className="text-fg">{obj.n}</span> / {pad(OBJECTS.length)} · {obj.name}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-cursor="hover"
                className="-mr-3 grid size-11 place-items-center rounded-full text-fg transition-colors hover:bg-fg/8"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={obj.id}
                className="px-6 pb-6 md:px-8"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -10, transition: { duration: 0.16 } }}
                transition={{ duration: 0.45, ease: BEZIER.out }}
              >
                <h2
                  id="ab-panel-title"
                  className="font-display text-[clamp(2.6rem,1.6rem+3vw,4rem)] font-[820] uppercase leading-[0.86] tracking-[-0.04em] [font-variation-settings:'wdth'_78]"
                >
                  {obj.topic}
                </h2>
                <div className="mt-7">
                  <Content body={obj.body} onGo={go} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* the safe-area padding lives here: on the scroller it would show content under this bar */}
            <footer
              className={cn(
                "sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-2 md:px-6",
                wide ? "pb-2" : "pb-safe",
              )}
            >
              <button type="button" onClick={() => step(prev)} data-cursor="hover" className="ab-step">
                <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                <span className="sr-only">Previous: </span>
                {prev.topic}
              </button>
              <button type="button" onClick={() => step(next)} data-cursor="hover" className="ab-step">
                <span className="sr-only">Next: </span>
                {next.topic}
                <ArrowRight size={14} strokeWidth={2} aria-hidden />
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
    </MotionUser>
  );
}
