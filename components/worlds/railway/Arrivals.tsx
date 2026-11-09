"use client";
import { useEffect, useRef, useState } from "react";
import { useOnScreen } from "@/lib/hooks";
import type { Metric } from "@/lib/types";
import { pad } from "@/lib/utils";
import { SplitFlap } from "./SplitFlap";
import type { Station } from "./scene";

/** Outcome: the arrivals board. Values roll in on split-flaps when the board comes into view. */
export default function Arrivals({ metrics, route }: { metrics: Metric[]; route: Station[] }) {
  const root = useRef<HTMLElement>(null);
  const [go, setGo] = useState(false);
  const visible = useOnScreen(root);
  const [clock, setClock] = useState("--:--:--");
  const width = Math.max(...metrics.map((m) => m.value.length));
  const ticker = route
    .filter((s) => s.menu?.length)
    .map((s) => `${s.code} · ${s.menu!.map((d) => d.name).join(" · ")}`);

  // arrive once, the first time the board is on screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setGo(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // station clock (client only, so SSR and hydration agree); stops while the board is off-screen
  useEffect(() => {
    if (!go || !visible) return;
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [go, visible]);

  return (
    <section ref={root} className="rw-arr" aria-labelledby="rw-arr-h">
      <div className="frame">
        <div className="rw-board">
          <header className="rw-board-head">
            <h2 id="rw-arr-h">
              <span data-chaos-type>Arrivals</span>
              <span lang="hi" className="rw-hi">
                आगमन
              </span>
            </h2>
            <span className="rw-board-clock" aria-hidden>
              {clock}
            </span>
          </header>
          <div className="rw-board-table">
            <div className="rw-board-cols" aria-hidden>
              <span>What arrived</span>
              <span>Count</span>
              <span>Remarks</span>
            </div>
            <ul className="rw-board-rows">
              {metrics.map((m) => (
                <li key={m.label} className="rw-board-row">
                  <span className="rw-board-label">{m.label}</span>
                  <SplitFlap text={m.value.padStart(width)} size={width} intro={go} step={70} className="rw-board-val" />
                  <span className="rw-board-note">{m.note ?? "On time"}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rw-board-ticker" aria-hidden>
            <div className="animate-marquee">
              {[...ticker, ...ticker].map((x, i) => (
                <span key={i}>{x}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
