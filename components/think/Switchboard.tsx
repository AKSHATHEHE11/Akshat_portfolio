"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { principles } from "@/data/think";
import { useChaos, useIsomorphicLayoutEffect, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn, pad } from "@/lib/utils";
import { DEMOS } from "./demos";
import { Lever } from "./Lever";

const SCREWS = ["left-3.5 top-3.5", "right-3.5 top-3.5", "bottom-3.5 left-3.5", "bottom-3.5 right-3.5"];
const all = (v: boolean) => principles.map(() => v);

/**
 * HOUSE RULES — the principles as a switchboard. Each channel is a heavy lever beside a screen that
 * shows the same little interface with the rule off (the problem) and on (the rule applied). Throwing
 * a lever on prints the rule and demonstrates it. Chaos: the levers throw themselves.
 */
export function Switchboard() {
  const board = useRef<HTMLDivElement>(null);
  const [mine, setMine] = useState(() => all(false));
  const [ghost, setGhost] = useState<boolean[] | null>(null); // chaos-thrown positions
  // the board last moved on its own (chaos): its live regions stay quiet until you throw a lever
  const [auto, setAuto] = useState(false);
  const [jolt, setJolt] = useState({ i: -1, n: 0 });
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const visible = useOnScreen(board, "0px");
  const mineRef = useRef(mine);
  const ghostRef = useRef(ghost);
  useIsomorphicLayoutEffect(() => {
    mineRef.current = mine;
    ghostRef.current = ghost;
  });

  const on = chaos && ghost ? ghost : mine;
  const count = on.filter(Boolean).length;
  const full = count === on.length;
  const live = auto ? "off" : "polite";

  const set = (i: number, v: boolean) => {
    const flip = (list: boolean[]) => list.map((x, k) => (k === i ? v : x));
    setMine(flip);
    setGhost((g) => g && flip(g));
    setAuto(false);
  };

  // every rule on: the board's lamps go lime, once per time you get there
  const wasFull = useRef(false);
  useEffect(() => {
    const arrived = full && !wasFull.current && !chaos;
    wasFull.current = full;
    if (!arrived) return;
    const id = window.setTimeout(() => play("success"), 380);
    return () => window.clearTimeout(id);
  }, [full, chaos]);

  // Chaos: the levers throw themselves while the board is in view. Your own settings come back after.
  useEffect(() => {
    if (!chaos || reduced || !visible) return;
    let id = 0;
    const step = () => {
      const i = Math.floor(Math.random() * principles.length);
      const next = (ghostRef.current ?? mineRef.current).map((x, k) => (k === i ? !x : x));
      setGhost(next);
      setAuto(true);
      play(next[i] ? "toggle-on" : "toggle-off");
      id = window.setTimeout(step, 850 + Math.random() * 1300);
    };
    id = window.setTimeout(step, 500);
    return () => window.clearTimeout(id);
  }, [chaos, reduced, visible]);
  // chaos off: your own settings come back without being read out, then the board speaks again
  useEffect(() => {
    if (chaos) return () => setGhost(null);
    const id = window.setTimeout(() => setAuto(false), 120);
    return () => window.clearTimeout(id);
  }, [chaos]);

  return (
    <section id="rules" data-rail="Rules" aria-labelledby="tk-rules" className="frame scroll-mt-24 py-[clamp(5rem,13svh,9rem)]">
      <h2 id="tk-rules" data-chaos-type className="tk-h2">
        House <em>rules.</em>
      </h2>

      <div ref={board} className="tk-board mt-[clamp(2rem,5svh,3.5rem)]" data-all={full ? "1" : "0"} data-wave={jolt.n ? (jolt.n % 2) + 1 : undefined}>
        {SCREWS.map((pos, i) => (
          <span key={pos} aria-hidden className={cn("tk-screw", pos)} style={{ "--r": `${[38, 112, 74, 160][i]}deg` } as CSSProperties} />
        ))}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[clamp(1.4rem,3vw,2.75rem)] pb-4 pt-6">
          <p className="font-mono text-micro uppercase tracking-[0.14em] text-fg-muted">Throw a lever to switch a rule on</p>
          <p className="flex items-center gap-3 font-mono text-micro uppercase tracking-[0.14em]">
            <span aria-live={live} className="tabular-nums">
              {full ? "All rules on" : `${count} / ${on.length} on`}
            </span>
            <span aria-hidden className="flex gap-1.5">
              {on.map((v, i) => (
                <span key={i} className="tk-led tk-hled" data-on={v ? "1" : "0"} style={{ "--i": i } as CSSProperties} />
              ))}
            </span>
          </p>
        </div>

        <ol className="border-t border-line">
          {principles.map((p, i) => {
            const Demo = DEMOS[p.id];
            const v = on[i];
            return (
              <li key={p.id} className="tk-ch" data-jolt={jolt.i === i ? (jolt.n % 2) + 1 : undefined}>
                <Lever on={v} onChange={(x) => set(i, x)} labelledBy={`tk-rule-${p.id}`} describedBy={`tk-rule-${p.id}-copy`} className="tk-ch-lever" />

                <div className="tk-ch-text">
                  <p className="flex items-center gap-2 font-mono text-micro uppercase tracking-[0.14em] text-fg-muted">
                    <span className="tabular-nums">Ch {pad(i + 1)}</span>
                    <span aria-hidden className="tk-led" data-on={v ? "1" : "0"} />
                    <span className={v ? "text-[#b23a0a]" : undefined}>{v ? "On" : "Off"}</span>
                  </p>
                  <h3
                    id={`tk-rule-${p.id}`}
                    className="mt-3 font-display text-[clamp(1.55rem,1.05rem+1.7vw,2.7rem)] font-[860] uppercase leading-[0.9] tracking-[-0.035em] [font-variation-settings:'wdth'_92]"
                  >
                    {p.title}
                  </h3>
                  <div id={`tk-rule-${p.id}-copy`} aria-live={live} className="mt-4 max-w-[34ch]">
                    {v ? (
                      <p key="rule" className="tk-copy-in text-lede leading-[1.35]">
                        {p.body}
                      </p>
                    ) : (
                      <p key="symptom" className="font-serif text-[clamp(1.25rem,1rem+0.6vw,1.6rem)] italic leading-[1.15] text-fg-muted">
                        “{p.symptom}”
                      </p>
                    )}
                  </div>
                </div>

                <div className="tk-ch-screen">
                  <div className="tk-screen" data-on={v ? "1" : "0"}>
                    <div className="tk-display">
                      <Demo on={v} quiet={auto} onSurprise={() => setJolt((j) => ({ i, n: j.n + 1 }))} />
                    </div>
                    <span aria-hidden className="tk-flash" />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
