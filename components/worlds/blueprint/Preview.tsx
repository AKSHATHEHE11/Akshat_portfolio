"use client";
// Sheet A-101: the student app, drawn as a phone elevation with its real, working screen inside.
// The drawing annotates whatever screen is open (callouts re-draft per screen); the sheet index on
// the left drives the device too.
import { useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import SidApp, { TABS } from "./app/SidApp";
import { revLetter, useShownAtHydration, ViewTitle } from "./kit";
import type { AppTab, BlueprintScene } from "./scene";

export function Preview({ project }: { project: Project<BlueprintScene> }) {
  const { scene } = project;
  const [tab, setTab] = useState<AppTab>("today");
  const ref = useRef<HTMLElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const shown = useShownAtHydration();

  // the elevation is plotted top to bottom when it arrives (on phones it sits below the index)
  useGSAP(
    () => {
      if (reduced) return;
      if (!shown(ref.current, 0.7))
        gsap.from("[data-index] li", {
          autoAlpha: 0,
          x: -10,
          duration: 0.5,
          stagger: 0.05,
          clearProps: "all",
          scrollTrigger: { trigger: ref.current, start: "top 70%", once: true },
        });
      if (!shown(plot.current, 0.8))
        gsap
          .timeline({ scrollTrigger: { trigger: plot.current, start: "top 80%", once: true } })
          .from(plot.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.3, ease: "power2.inOut", clearProps: "clipPath" })
          .from("[data-dimline]", { scaleX: 0, scaleY: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, clearProps: "transform" }, 0.7);
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  const notes = scene.callouts[tab];

  return (
    <section ref={ref} id="preview" aria-labelledby="bp-app" className="bp-sheet bp-preview frame">
      <div className="bp-preview-side">
        <ViewTitle n={3} sheet="A-101" id="bp-app" scale="1 : 1">
          Student app
        </ViewTitle>
        <p className="bp-instr">It runs. Mark a class missed, open a slot in the week, flip the ID, pay a fee.</p>
        <ol className="bp-index" aria-label="Screens" data-index>
          {TABS.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={tab === t.id ? "true" : undefined}
                onClick={() => {
                  if (tab !== t.id) play("click");
                  setTab(t.id);
                }}
                onPointerEnter={() => play("tick")}
                data-cursor="hover"
              >
                <span className="bp-index-n">A-101.{i + 1}</span>
                <span className="bp-index-t">{t.label}</span>
                <span className="bp-index-c">{scene.callouts[t.id].length} notes</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="bp-device-wrap">
        <div ref={plot} className="bp-device">
          <span className="bp-device-btn bp-device-btn-a" aria-hidden />
          <span className="bp-device-btn bp-device-btn-b" aria-hidden />
          <span className="bp-device-btn bp-device-btn-c" aria-hidden />
          <span className="bp-dimline bp-dimline-w" data-dimline aria-hidden>
            <b>71.6</b>
          </span>
          <span className="bp-dimline bp-dimline-h" data-dimline aria-hidden>
            <b>147.6</b>
          </span>
          <SidApp scene={scene} tab={tab} onTab={setTab} />
          {notes.map((c, i) => (
            <span key={`${tab}-${c.text}`} className="bp-mark" style={{ "--at": c.at, "--i": i } as CSSProperties} aria-hidden>
              {revLetter(i)}
            </span>
          ))}
        </div>
        <ol key={tab} className="bp-callouts" aria-label={`Notes on the ${TABS.find((t) => t.id === tab)?.label} screen`}>
          {notes.map((c, i) => (
            <li key={c.text} style={{ "--at": c.at, "--i": i } as CSSProperties}>
              <span className="bp-callout-tag" aria-hidden>
                {revLetter(i)}
              </span>
              <span className="bp-callout-text">{c.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
