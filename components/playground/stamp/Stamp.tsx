"use client";
import { memo, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ignoreShortcut } from "@/components/work/keys";
import { useChaos, useCoarse } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";
import { lab } from "../lab";
import { printFor, type Print } from "./shapes";

interface Placed {
  n: number;
  x: number;
  y: number;
  p: Print;
  chaos: boolean;
}

const MAX = 80;
/** Anything that is not bare mat: a click there is not a stamp. */
export const SOLID = "[data-pg-in], [data-pg-solid], a, button, input, textarea, select, label, .pg-bug";

/**
 * Stamp: click bare mat and a numbered, seeded shape lands there (print 7 is always the same print).
 * The rubber stamp on the bench shows the next one, mirrored like real rubber; pressing it (or Enter)
 * prints it on a free spot of the visible mat. X / "Clear mat" wipes the prints. The print layer sits
 * right after the pad in the DOM but is positioned against the mat, under every toy.
 * Chaos: prints come out half again as big and misregistered.
 */
export default function Stamp() {
  const root = useRef<HTMLDivElement>(null);
  const chaos = useChaos();
  const coarse = useCoarse();
  const [prints, setPrints] = useState<Placed[]>([]);
  const [n, setN] = useState(1);
  const [clearing, setClearing] = useState(false);
  const [thunk, setThunk] = useState(0);
  const live = useRef({ n: 1, chaos, coarse, clearing: 0 });

  useEffect(() => {
    live.current.chaos = chaos;
    live.current.coarse = coarse;
  }, [chaos, coarse]);

  function stampAt(x: number, y: number) {
    const s = live.current;
    const num = s.n++;
    const p = printFor(num, s.chaos);
    if (s.coarse) p.size = Math.round(p.size * 0.8);
    setN(s.n);
    setClearing(false);
    window.clearTimeout(s.clearing);
    setPrints((list) => [...list.slice(-(MAX - 1)), { n: num, x, y, p, chaos: s.chaos }]);
    play("press");
  }

  function clear() {
    if (!prints.length) return;
    setClearing(true);
    play("close");
    window.clearTimeout(live.current.clearing);
    live.current.clearing = window.setTimeout(() => {
      setPrints([]);
      setClearing(false);
    }, 420);
  }

  /** The pad: find a patch of bare mat that is on screen right now (event-time layout reads only). */
  function stampSomewhere() {
    const mat = root.current?.closest<HTMLElement>(".pg-mat");
    if (!mat) return;
    const r = mat.getBoundingClientRect();
    const top = Math.max(r.top, 90);
    const bottom = Math.min(r.bottom, window.innerHeight) - 40;
    const left = Math.max(r.left, 0) + 50;
    const right = Math.min(r.right, window.innerWidth) - 50;
    setThunk((t) => t + 1);
    for (let i = 0; i < 24 && bottom > top; i++) {
      const vx = left + Math.random() * (right - left);
      const vy = top + Math.random() * (bottom - top);
      const hit = document.elementFromPoint(vx, vy);
      if (hit && mat.contains(hit) && !hit.closest(SOLID)) return stampAt(vx - r.left, vy - r.top);
    }
    const pr = root.current!.getBoundingClientRect();
    stampAt(Math.min(pr.right + 70, r.width - 60) - r.left, pr.top + pr.height * 0.4 - r.top);
  }

  // bare mat → a print (not during a bug hunt: then a click is a swat)
  useEffect(() => {
    const mat = root.current?.closest<HTMLElement>(".pg-mat");
    if (!mat) return;
    const onClick = (e: MouseEvent) => {
      if (lab.hunting || e.button !== 0 || !(e.target instanceof Element) || e.target.closest(SOLID)) return;
      if (window.getSelection()?.toString()) return;
      const r = mat.getBoundingClientRect();
      stampAt(e.clientX - r.left, e.clientY - r.top);
    };
    mat.addEventListener("click", onClick);
    return () => mat.removeEventListener("click", onClick);
    // stampAt only touches refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // X wipes the mat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e) || e.key.toLowerCase() !== "x") return;
      e.preventDefault();
      clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => window.clearTimeout(live.current.clearing), []);

  const next = printFor(n, chaos);
  return (
    <>
      <div ref={root} className="pg-stamp" data-pg-in>
        <button
          type="button"
          className="pg-stamper"
          data-thunk={thunk ? (thunk % 2 ? "a" : "b") : undefined}
          aria-label={`Rubber stamp, print ${n}: ${next.name}. Press to print it on a free spot of the mat.`}
          onClick={stampSomewhere}
        >
          <span aria-hidden className="pg-stamper-knob" />
          <span aria-hidden className="pg-stamper-neck" />
          <span aria-hidden className="pg-stamper-foot" data-tone={next.tone}>
            <Shape p={next} />
          </span>
        </button>
        <div className="pg-stamp-side">
          <p className="pg-stamp-meta">
            <span className="label">No. {pad(n, 4)}</span>
            <span className="label">{next.name}</span>
            <span className="label" aria-live="polite">
              On mat <b>{pad(prints.length, 2)}</b>
            </span>
          </p>
          <Button variant="key" size="sm" magnetic={false} icon={<Eraser size={14} strokeWidth={1.75} />} onClick={clear} aria-keyshortcuts="X">
            Clear mat
          </Button>
        </div>
      </div>
      <Prints prints={prints} clearing={clearing} />
    </>
  );
}

const Prints = memo(function Prints({ prints, clearing }: { prints: Placed[]; clearing: boolean }) {
  return (
    <div aria-hidden className="pg-stamps" data-clearing={clearing || undefined}>
      {prints.map(({ n, x, y, p, chaos }) => (
        <span
          key={n}
          className="pg-printed"
          data-tone={p.tone}
          style={{ width: p.size, height: p.size, transform: `translate3d(${Math.round(x - p.size / 2)}px,${Math.round(y - p.size / 2)}px,0) rotate(${p.rot}deg)` }}
        >
          {chaos ? <Shape p={p} className="pg-misreg" /> : null}
          <Shape p={p} />
        </span>
      ))}
    </div>
  );
});

function Shape({ p, className }: { p: Print; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {p.marks.map((m, i) =>
        m.w ? (
          <path key={i} d={m.d} fill="none" stroke="currentColor" strokeWidth={m.w} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path key={i} d={m.d} fill="currentColor" className="pg-fill" />
        ),
      )}
    </svg>
  );
}
