"use client";
// The control surface. One DOM, two layouts: on a desk every group sits on one wide panel; on a phone
// the three groups (tone · texture · memory) become swipeable pages under the display, so the panel
// stays short enough to keep the field in view while you play.
import { useEffect, useRef, useState } from "react";
import { ignoreShortcut } from "@/components/work/keys";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Actions, flash, Memory, Presets, record } from "./Bank";
import { Fader, Knob, Toggle } from "./controls";
import { useFieldHost } from "./FieldHost";
import { Lcd } from "./Lcd";
import { PARAMS, SWITCHES } from "./patch";

const PAGES = ["Tone", "Texture", "Memory"];

export function Panel({ model, serial }: { model: string; serial: string }) {
  const { field, panel, stageOn } = useFieldHost();
  const reduced = useReducedMotion();
  const pager = useRef<HTMLDivElement>(null);
  const pages = useRef<(HTMLDivElement | null)[]>([]);
  const [page, setPage] = useState(0);
  const init = field.factory[0].patch;

  // what REC kept on earlier visits
  useEffect(() => field.loadMemory(), [field]);

  // the instrument's keys, live while the field is on screen: 1–8 presets, N taste, F LFO, R rec
  useEffect(() => {
    if (!stageOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e) || e.shiftKey) return;
      const k = e.key.toLowerCase();
      const n = Number(k);
      if (n >= 1 && n <= field.factory.length) {
        play("press");
        field.preset(n - 1, !reduced);
      } else if (k === "n") {
        play("press");
        field.taste(!reduced);
      } else if (k === "f") {
        if (reduced) field.say("LFO rests · reduced motion is on");
        else {
          play(field.getUi().lfo ? "toggle-off" : "toggle-on");
          field.toggleLfo();
        }
      } else if (k === "r") record(field);
      else return;
      e.preventDefault();
      flash(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stageOn, field, reduced]);

  // which page is in the pager window (phones only — on a desk the pager is display: contents)
  useEffect(() => {
    const root = pager.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setPage(pages.current.indexOf(e.target as HTMLDivElement));
      },
      { root, threshold: 0.6 },
    );
    pages.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const root = pager.current;
    const el = pages.current[i];
    if (!root || !el) return;
    play("click");
    root.scrollTo({ left: el.offsetLeft - root.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  };

  const group = (i: number) => ({
    ref: (el: HTMLDivElement | null) => void (pages.current[i] = el),
    role: "group",
    "aria-label": PAGES[i],
  });

  return (
    <div ref={panel} className="nf-panel">
      {/* corner screws: positions and turns live in lab.css (.nf-screw:nth-child) */}
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden className="nf-screw" />
      ))}
      <header className="nf-panel-head" aria-hidden>
        <b>{model}</b>
        <span>Field instrument</span>
        <span className="nf-panel-serial">{serial}</span>
      </header>

      <div className="nf-deck">
        <div className="nf-g-lcd">
          <Lcd />
        </div>

        <div className="nf-tabs" aria-label="Control pages">
          {PAGES.map((p, i) => (
            <button key={p} type="button" aria-current={page === i || undefined} className={cn("nf-tab", page === i && "is-on")} onClick={() => go(i)}>
              {p}
            </button>
          ))}
        </div>

        <div ref={pager} className="nf-pages no-scrollbar" data-swipe="local">
          <div {...group(0)} className="nf-page nf-g-tone">
            {PARAMS.filter((p) => p.kind === "knob").map((p) => (
              <Knob key={p.key} field={field} spec={p} initial={init[p.key]} />
            ))}
          </div>
          <div {...group(1)} className="nf-page nf-g-tex">
            {PARAMS.filter((p) => p.kind === "fader").map((p) => (
              <Fader key={p.key} field={field} spec={p} initial={init[p.key]} />
            ))}
            <span aria-hidden className="nf-tex-rule" />
            {SWITCHES.map((s) => (
              <Toggle key={s.key} field={field} sw={s} initial={init[s.key]} />
            ))}
          </div>
          <div {...group(2)} className="nf-page nf-g-mem">
            <Presets />
            <Memory />
          </div>
        </div>

        <div className="nf-g-act">
          <Actions />
        </div>
      </div>
    </div>
  );
}
