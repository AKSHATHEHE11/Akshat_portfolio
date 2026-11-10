"use client";
// One canvas, two screens. The field canvas lives in a detached holder that is moved (appendChild —
// the WebGL context survives) into whichever host is on screen: the stage behind the hero/instrument/
// story/notes, or the signal-flow diagram. Neither on screen → the frameloop stops.
import dynamic from "next/dynamic";
import {
  Component,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useChaos, useCoarse, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/hooks";
import { on, useSystem } from "@/lib/system";
import type { Field } from "./field";
import type { Box, HostKind } from "./FieldCanvas";

const FieldCanvas = dynamic(() => import("./FieldCanvas"), { ssr: false });

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      gl?.getExtension("WEBGL_lose_context")?.loseContext(); // hand it back; the field makes its own
      webgl = !!gl;
    } catch {
      webgl = false;
    }
  }
  return webgl;
}
const never = () => () => {};
const onVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

/** A failed chunk or GL context leaves the art-directed posters up instead of taking the page down. */
class Guard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Ctx {
  field: Field;
  /** null while unknown (server, hydration); false: no WebGL (or it crashed) → posters */
  gl: boolean | null;
  /** the field is drawing somewhere (its first frame has landed) */
  live: boolean;
  /** the stage (hero → patch notes) is on screen: world keys are live, REC can shoot */
  stageOn: boolean;
  host: Record<HostKind, (el: HTMLElement | null) => void>;
  /** flow screen i (= pipeline stage i) */
  slot: (i: number) => (el: HTMLElement | null) => void;
  /** the instrument's control surface */
  panel: (el: HTMLElement | null) => void;
  /** dim the stage behind text: story beats (text on the left / right), patch notes. With `ifCurrent`,
   *  only when the scrim is one of those right now (so a section never clears another one's scrim). */
  scrim: (kind: Scrim, ifCurrent?: Scrim[]) => void;
}

export type Scrim = "none" | "story" | "story-r" | "notes";

const FieldContext = createContext<Ctx | null>(null);

export function useFieldHost() {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("useFieldHost outside <FieldProvider>");
  return ctx;
}

const SLOTS = 7;

export function FieldProvider({ field, accent, children }: { field: Field; accent: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const gl = useSyncExternalStore(never, hasWebGL, () => null);
  const shown = useSyncExternalStore(onVisibility, () => document.visibilityState === "visible", () => true);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  // which hosts are on screen, and where the canvas sits (it stays put while neither is visible)
  const [vis, setVis] = useState<Record<HostKind, boolean> & { placed: HostKind }>({ stage: false, flow: false, placed: "stage" });
  const [stale, setStale] = useState(false);

  const hosts = useRef<Record<HostKind, HTMLElement | null>>({ stage: null, flow: null });
  const panelEl = useRef<HTMLElement | null>(null);
  const panelOn = useRef(false);
  const slotEls = useRef<(HTMLElement | null)[]>(Array(SLOTS).fill(null));
  const boxes = useRef<(Box | null)[]>(Array(SLOTS).fill(null));
  const [holder] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.className = "nf-holder";
    return el;
  });

  const { placed } = vis;
  // the frameloop stops when neither host is on screen, and while the tab is hidden
  const running = vis[placed] && shown;

  const cb = useMemo(
    () => ({
      host: {
        stage: (el: HTMLElement | null) => void (hosts.current.stage = el),
        flow: (el: HTMLElement | null) => void (hosts.current.flow = el),
      },
      slot: Array.from({ length: SLOTS }, (_, i) => (el: HTMLElement | null) => void (slotEls.current[i] = el)),
      panel: (el: HTMLElement | null) => void (panelEl.current = el),
      scrim: (kind: Scrim, ifCurrent?: Scrim[]) => {
        const el = hosts.current.stage;
        if (!el) return;
        const cur = (el.dataset.scrim ?? "none") as Scrim;
        if (cur !== kind && (!ifCurrent || ifCurrent.includes(cur))) el.dataset.scrim = kind;
      },
    }),
    [],
  );

  // which hosts are on screen (and whether the control surface is)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const next: Partial<Record<HostKind, boolean>> = {};
        for (const e of entries) {
          if (e.target === panelEl.current) panelOn.current = e.isIntersecting;
          else if (e.target === hosts.current.stage) next.stage = e.isIntersecting;
          else if (e.target === hosts.current.flow) next.flow = e.isIntersecting;
        }
        if (!Object.keys(next).length) return;
        setVis((v) => {
          const n = { ...v, ...next };
          return { ...n, placed: n.flow ? "flow" : n.stage ? "stage" : v.placed };
        });
      },
      { rootMargin: "60px 0px" },
    );
    [hosts.current.stage, hosts.current.flow, panelEl.current].forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // move the canvas to the host that needs it
  useIsomorphicLayoutEffect(() => {
    const target = hosts.current[placed];
    if (holder && target && holder.parentElement !== target) target.appendChild(holder);
  }, [holder, placed]);
  useEffect(() => () => holder?.remove(), [holder]);

  // flow screens: measured relative to the flow host when it (or a screen) resizes — never per frame
  useEffect(() => {
    const host = hosts.current.flow;
    if (!host || placed !== "flow") return;
    const measure = () => {
      const h = host.getBoundingClientRect();
      slotEls.current.forEach((el, i) => {
        if (!el) return void (boxes.current[i] = null);
        const r = el.getBoundingClientRect();
        // inside the 1px bezel line
        boxes.current[i] = { x: r.left - h.left + 1, y: r.top - h.top + 1, w: r.width - 2, h: r.height - 2 };
      });
      field.live.invalidate();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    slotEls.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [placed, field]);

  // the field powers on like a CRT once it has a frame and the boot screen is gone (never waits forever)
  useEffect(() => {
    if (!ready || booted) return;
    const t = window.setTimeout(() => setStale(true), 8000);
    return () => {
      window.clearTimeout(t);
      setStale(false);
    };
  }, [ready, booted]);
  useEffect(() => {
    holder?.toggleAttribute("data-on", drawn && (booted || stale || reduced));
  }, [holder, drawn, booted, stale, reduced]);

  // a chaos burst anywhere on the page kicks the field
  useEffect(
    () =>
      on("chaos:burst", () => {
        field.live.kick = 1;
      }),
    [field],
  );

  const live = gl === true && !failed && drawn;
  const ctx = useMemo<Ctx>(
    () => ({ field, gl: gl === null ? null : gl && !failed, live, stageOn: vis.stage, host: cb.host, slot: (i) => cb.slot[i], panel: cb.panel, scrim: cb.scrim }),
    [field, gl, failed, live, vis.stage, cb],
  );

  const led = useMemo(() => {
    const n = parseInt(accent.slice(1, 7), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [number, number, number];
  }, [accent]);

  return (
    <FieldContext.Provider value={ctx}>
      {children}
      {holder && gl && !failed
        ? createPortal(
            <Guard onError={() => setFailed(true)}>
              <FieldCanvas
                field={field}
                mode={placed}
                running={running}
                reduced={reduced}
                coarse={coarse}
                chaos={chaos}
                slots={boxes}
                panel={panelOn}
                led={led}
                onReady={() => setDrawn(true)}
              />
            </Guard>,
            holder,
          )
        : null}
    </FieldContext.Provider>
  );
}
