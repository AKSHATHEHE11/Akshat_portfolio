"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useCoarse, useIsomorphicLayoutEffect, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useNavigate } from "@/lib/transitions";
import type { ProjectSummary } from "@/lib/types";
import { clamp, seeded } from "@/lib/utils";
import { Axis, TerminalFoot, TerminalHead, type Station } from "./Chrome";
import { Header } from "./Header";
import { ignoreShortcut } from "./keys";
import { ModeConsole } from "./ModeConsole";
import { MODES, readMode, saveMode, type Mode } from "./modes";
import { RailFooter } from "./RailFooter";
import { WorkItem, type Entry } from "./WorkItem";
import "./work.css";

if (typeof window !== "undefined") gsap.registerPlugin(Flip, Draggable, InertiaPlugin);

// Status reads as a permission string: shipped work is read-only, unfinished work stays private.
const PERM: Record<ProjectSummary["status"], string> = {
  live: "drwxr-xr-x",
  shipped: "dr-xr-xr-x",
  prototype: "drwxr-x---",
  "in progress": "drwx------",
};

type FlipJob = { state: Flip.FlipState; kind: "mode" | "active" };

/** A summary plus the two listing columns the server derives from the full project (tags, file size),
 *  so the full project data never ships to the browser. */
export type IndexProject = ProjectSummary & { tags: string[]; size: string };

/** Static per-project data: tags, ls columns, timeline slots (grouped by year, alternating sides). */
function build(projects: IndexProject[]) {
  const order = projects.map((p, i) => ({ p, i })).sort((a, b) => a.p.year - b.p.year || a.i - b.i);
  const slot = new Map<string, { at: number; side: 0 | 1 }>();
  const stations: Station[] = [];
  let x = 0;
  order.forEach(({ p }, k) => {
    const last = stations.at(-1);
    if (!last || last.year !== p.year) {
      if (last) x += 0.8;
      stations.push({ year: p.year, at: x });
    }
    slot.set(p.slug, { at: x, side: (k % 2) as 0 | 1 });
    x += 1;
  });

  const entries: Entry[] = projects.map((p, i) => {
    const { at, side } = slot.get(p.slug) ?? { at: i, side: 0 };
    return {
      p,
      tags: p.tags,
      perm: PERM[p.status],
      size: p.size,
      hay: [p.title, p.slug, p.category, p.status, p.year, p.environment, ...p.tags].join(" ").toLowerCase(),
      side,
      vars: {
        "--p-bg": p.color.bg,
        "--p-fg": p.color.fg,
        "--p-ac": p.color.accent,
        "--tx": at,
        "--i": i,
        "--tilt": `${((seeded(i * 31 + 7) - 0.5) * 1.8).toFixed(2)}deg`,
      } as CSSProperties,
    };
  });
  return { entries, stations, span: Math.max(0, x - 1) };
}

/** Chaos scatter: a jittered grid (3 cols desktop, 2 mobile) so windows overlap without piling up. */
function scatter(i: number, n: number, seed: number, cols: number) {
  const rows = Math.max(1, Math.ceil(n / cols));
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = (cols === 1 ? 0.5 : c / (cols - 1)) + (r % 2 ? 0.08 : -0.04);
  const y = rows === 1 ? 0.5 : r / (rows - 1);
  return [
    clamp(x + (seeded(seed * 7919 + i * 131 + cols) - 0.5) * 0.3),
    clamp(y + (seeded(seed * 6007 + i * 977 + cols * 13) - 0.5) * 0.34),
  ];
}
const tilt = (i: number, seed: number) => (seeded(seed * 3301 + i * 211) - 0.5) * 26;

export default function WorkIndex({ projects }: { projects: IndexProject[] }) {
  const { entries, stations, span } = useMemo(() => build(projects), [projects]);
  const [mode, setMode] = useState<Mode>("list");
  const [active, setActive] = useState<string | null>(projects[0]?.slug ?? null);
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState(1);

  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaosOn = useChaos();
  const ready = useSystemReady();
  const navigate = useNavigate();
  const lenis = useLenis();

  const consoleRef = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<FlipJob | null>(null);
  const intent = useRef(0);
  const chosen = useRef(false);
  const lastChaos = useRef<boolean | null>(null);
  // latest mode/active for stable callbacks (timers + window listeners)
  const live = useRef({ mode, active });
  useIsomorphicLayoutEffect(() => {
    live.current = { mode, active };
  });

  const view = useMemo(
    () =>
      entries.map((e, i) => {
        const [cx, cy] = scatter(i, entries.length, seed, 3);
        const [mcx, mcy] = scatter(i, entries.length, seed, 2);
        return { ...e, vars: { ...e.vars, "--cx": cx, "--cy": cy, "--mcx": mcx, "--mcy": mcy } as CSSProperties };
      }),
    [entries, seed],
  );

  const q = query.trim().toLowerCase();
  const matches = (e: Entry) => mode !== "system" || !q || e.hay.includes(q);
  const shown = entries.filter(matches).length;

  /* ── Flip: record where every atom is, change state, fly them from there ── */
  const capture = useCallback(
    (kind: FlipJob["kind"]) => {
      const el = board.current;
      if (el && !reduced) pending.current = { state: Flip.getState(el.querySelectorAll("[data-flip]")), kind };
    },
    [reduced],
  );

  const changeMode = useCallback(
    (next: Mode, persist = true) => {
      if (persist) {
        chosen.current = true;
        saveMode(next);
      }
      if (next === live.current.mode) return;
      capture("mode");
      live.current.mode = next;
      setMode(next);
      setQuery("");
      play("press");
      const c = consoleRef.current;
      if (c && c.getBoundingClientRect().top < 0) lenis?.scrollTo(c, { offset: -96, duration: 1.1, immediate: reduced });
    },
    [capture, lenis, reduced],
  );

  const activate = useCallback(
    (slug: string) => {
      if (live.current.mode !== "list" || live.current.active === slug) return;
      capture("active");
      live.current.active = slug;
      setActive(slug);
    },
    [capture],
  );

  const onIntent = useCallback(
    (slug: string | null) => {
      window.clearTimeout(intent.current);
      if (slug) intent.current = window.setTimeout(() => activate(slug), 110);
    },
    [activate],
  );

  const onFocusIn = useCallback(
    (slug: string) => {
      if (document.activeElement?.matches(":focus-visible")) activate(slug);
    },
    [activate],
  );

  // First paint: the visitor's own choice, else CHAOS when global chaos is on (read from <html>,
  // which the preflight script sets before paint), else LIST.
  useIsomorphicLayoutEffect(() => {
    const stored = readMode();
    chosen.current = stored !== null;
    const initial = stored ?? (document.documentElement.dataset.chaos === "on" ? "chaos" : "list");
    live.current.mode = initial;
    setMode(initial);
    return () => window.clearTimeout(intent.current);
  }, []);

  // Never chose? Then the view follows the chaos switch, animated.
  useEffect(() => {
    if (!ready) return;
    const prev = lastChaos.current;
    lastChaos.current = chaosOn;
    if (prev !== null && prev !== chaosOn && !chosen.current) changeMode(chaosOn ? "chaos" : "list", false);
  }, [chaosOn, ready, changeMode]);

  // Keys 1–5 switch view; "/" jumps to the terminal filter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e)) return;
      const n = Number(e.key);
      if (e.key.length === 1 && n >= 1 && n <= MODES.length) {
        e.preventDefault();
        changeMode(MODES[n - 1].id);
      } else if (e.key === "/") {
        e.preventDefault();
        changeMode("system");
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeMode]);

  /* ── CHAOS: seeded tilt + throwable windows. Declared before the Flip hook so Flip measures
        the tilted end state. revertOnUpdate: leaving chaos clears tilt, drag offsets, z-order. ── */
  useGSAP(
    () => {
      const ol = list.current;
      if (mode !== "chaos" || !ol) return;
      const lis = Array.from(ol.children) as HTMLElement[];
      lis.forEach((li, i) => {
        const r = tilt(i, seed);
        li.dataset.rot = String(r);
        gsap.set(li, { rotation: r });
      });
      // Touch: drag by the title bar like a real window, so the body still scrolls the page and taps.
      const drags = lis.map((li) => Draggable.create(li, {
        type: "x,y",
        trigger: coarse ? li.querySelectorAll("[data-grip]") : li,
        bounds: ol,
        inertia: !reduced,
        edgeResistance: 0.72,
        dragClickables: true,
        zIndexBoost: true,
        onPress(this: Draggable) {
          const li = this.target as HTMLElement;
          li.dataset.dragging = "";
          play("press");
          gsap.to(li, { scale: 1.035, rotation: Number(li.dataset.rot) * 0.3, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        },
        onRelease(this: Draggable) {
          const li = this.target as HTMLElement;
          delete li.dataset.dragging;
          const rest = { scale: 1, rotation: Number(li.dataset.rot) };
          if (reduced) gsap.set(li, rest);
          else gsap.to(li, { ...rest, duration: 0.8, ease: "elastic.out(1, 0.55)", overwrite: "auto" });
        },
        onThrowComplete() {
          play("drop");
        },
      })[0]);
      return () => {
        drags.forEach((d) => d.kill());
        gsap.killTweensOf(lis);
        gsap.set(lis, { clearProps: "transform,zIndex" });
      };
    },
    { dependencies: [mode, seed, reduced, coarse], scope: list, revertOnUpdate: true },
  );

  /* ── TIMELINE: mouse drag-to-scroll with momentum. A detached proxy carries the motion
        (Draggable's own "scroll" type re-parents children, which React must own). ── */
  useGSAP(
    () => {
      const sc = scroller.current;
      if (mode !== "timeline" || coarse || !sc) return;
      const proxy = document.createElement("div");
      const [drag] = Draggable.create(proxy, {
        type: "x",
        trigger: sc,
        inertia: !reduced,
        edgeResistance: 0.85,
        dragClickables: true,
        allowContextMenu: true,
        onPress() {
          gsap.killTweensOf(sc);
          gsap.set(proxy, { x: -sc.scrollLeft });
          drag.applyBounds({ minX: -(sc.scrollWidth - sc.clientWidth), maxX: 0 });
          drag.update();
        },
        onDrag() {
          sc.scrollLeft = -drag.x;
        },
        onThrowUpdate() {
          sc.scrollLeft = -drag.x;
        },
      });
      return () => drag.kill();
    },
    { dependencies: [mode, coarse, reduced], revertOnUpdate: true },
  );

  /* ── Flip runner: after React has laid out the new state, fly atoms from the recorded one ── */
  useGSAP(
    () => {
      const job = pending.current;
      const el = board.current;
      if (!job || !el) return;
      pending.current = null;
      const sc = scroller.current;
      const isMode = job.kind === "mode";
      if (isMode && mode === "timeline" && sc) sc.dataset.flipping = "";
      Flip.from(job.state, {
        targets: el.querySelectorAll("[data-flip]"),
        duration: isMode ? 0.9 : 0.6,
        ease: isMode ? "machine" : "expo.out",
        scale: true,
        stagger: isMode ? 0.008 : 0,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.5, clearProps: "opacity" }),
        onComplete: () => {
          if (sc) delete sc.dataset.flipping;
        },
      });
      const fresh = el.querySelectorAll(isMode ? "[data-fade]" : "[data-active] [data-more]");
      gsap.fromTo(
        fresh,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          delay: isMode ? 0.42 : 0.2,
          stagger: 0.004,
          ease: "expo.out",
          overwrite: true,
          clearProps: "opacity,transform",
        },
      );
    },
    { dependencies: [mode, active, seed], scope: board },
  );

  const shuffle = () => {
    capture("mode");
    setSeed((v) => v + 1);
    play("glitch");
  };

  const nudge = (dir: 1 | -1) => {
    const sc = scroller.current;
    if (!sc) return;
    const to = clamp(sc.scrollLeft + dir * sc.clientWidth * 0.6, 0, sc.scrollWidth - sc.clientWidth);
    play("click");
    if (reduced) sc.scrollLeft = to;
    else gsap.to(sc, { scrollLeft: to, duration: 0.9, ease: "expo.out", overwrite: true });
  };

  const onQuery = (v: string) => {
    setQuery(v);
    play("type");
  };

  // Enter in the terminal = cd into the first match.
  const onEnter = () => {
    const first = entries.find(matches);
    if (!first) return play("error");
    const chip = board.current?.querySelector(`[data-slug="${first.p.slug}"] [data-chip]`);
    const r = chip?.getBoundingClientRect();
    navigate(`/work/${first.p.slug}`, "world-enter", r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
  };

  // Keyboard hints only exist for fine pointers; on touch an empty tools row would leave a hole in the console.
  const tools =
    mode === "chaos" ? (
      <>
        <span>{coarse ? "Drag a title bar" : "Drag · throw · click to enter"}</span>
        <Button variant="key" size="sm" magnetic={false} icon={<Shuffle size={14} strokeWidth={1.75} />} onClick={shuffle}>
          Shuffle
        </Button>
      </>
    ) : mode === "timeline" ? (
      <>
        <span>{coarse ? "Swipe the line" : "Drag the line"}</span>
        <span className="flex gap-2">
          <Button variant="key" size="sm" magnetic={false} icon={null} aria-label="Earlier projects" onClick={() => nudge(-1)}>
            <ArrowLeft size={14} strokeWidth={1.75} />
          </Button>
          <Button variant="key" size="sm" magnetic={false} icon={null} aria-label="Later projects" onClick={() => nudge(1)}>
            <ArrowRight size={14} strokeWidth={1.75} />
          </Button>
        </span>
      </>
    ) : coarse ? null : mode === "system" ? (
      <span className="hidden items-center gap-2 fine:inline-flex">
        Press <Kbd>/</Kbd> to grep · <Kbd>↵</Kbd> to cd
      </span>
    ) : (
      <span className="hidden items-center gap-1.5 fine:inline-flex">
        <Kbd>1</Kbd>–<Kbd>5</Kbd> switch view
      </span>
    );

  const label = MODES.find((m) => m.id === mode)?.label ?? "";

  // The intro itself is CSS keyed on <html data-booted> (set before first paint, so a reload never
  // flashes). data-intro only says "the client is alive" — then the page may hide behind the boot screen.
  return (
    <div className="frame wk-root" data-intro={ready || undefined}>
      <Header count={projects.length} />

      <div ref={consoleRef}>
        <ModeConsole mode={mode} onChange={changeMode} tools={tools} />
      </div>

      <div ref={board} className="wk-board" data-mode={mode}>
        {mode === "system" && (
          <TerminalHead query={query} shown={shown} total={entries.length} inputRef={input} onQuery={onQuery} onEnter={onEnter} />
        )}
        <div
          ref={scroller}
          className="wk-scroller"
          data-cursor={mode === "timeline" ? "drag" : undefined}
          data-cursor-label={mode === "timeline" ? "DRAG" : undefined}
        >
          <div className="wk-track" style={{ "--span": span } as CSSProperties}>
            {mode === "timeline" && <Axis stations={stations} />}
            <ol ref={list} className="wk-items" aria-label={`Projects, ${label.toLowerCase()} view`}>
              {view.map((e) => (
                <WorkItem
                  key={e.p.slug}
                  e={e}
                  mode={mode}
                  active={e.p.slug === active}
                  hidden={!matches(e)}
                  onIntent={onIntent}
                  onFocusIn={onFocusIn}
                />
              ))}
            </ol>
          </div>
        </div>
        {mode === "system" && <TerminalFoot query={query} shown={shown} />}
      </div>

      <RailFooter />
    </div>
  );
}
