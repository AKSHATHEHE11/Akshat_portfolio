"use client";
import "./playground.css";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { RotateCcw } from "lucide-react";
import { useRise } from "@/components/home/worlds/useRise";
import { Button } from "@/components/ui/Button";
import { ignoreShortcut } from "@/components/work/keys";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit, useSystem } from "@/lib/system";
import { seeded } from "@/lib/utils";
import BugHunt from "./bugs/BugHunt";
import Settings from "./form/Settings";
import Keycap from "./keycap/Keycap";
import { lab } from "./lab";
import { Legend } from "./Legend";
import { Mat, measureMat } from "./Mat";
import Stamp from "./stamp/Stamp";
import Tray from "./tray/Tray";
import Well from "./well/Well";
import Windows from "./windows/Windows";
import { Zone } from "./Zone";

/**
 * /playground — THE LAB. One cutting mat the size of the page with seven toys on it: a physics
 * tray, four paper windows, a 3D keycap, Bug Hunt, a rubber stamp, a gravity well and a settings
 * form with opinions. Each toy mounts its heavy part when it is about a screen away and runs only
 * while on screen. R resets the bench (everything remounts and drops back in, which also hands the
 * page its house accent back).
 */
export default function Playground() {
  const root = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const [mat, setMat] = useState<HTMLDivElement | null>(null);
  const [gen, setGen] = useState(0);
  const reduced = useReducedMotion();
  const ready = useSystem((s) => s.ready);
  const booted = useSystem((s) => s.booted);
  const cold = useRef(false);
  useRise(head);

  useLenis((l) => {
    lab.scroll = l.scroll;
  });

  // mat geometry for the toys' frame loops: measured on resize, never per frame
  useEffect(() => {
    if (!mat) return;
    const run = () => {
      measureMat(mat);
      lab.scroll = window.scrollY;
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(mat);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [mat]);

  function reset() {
    setGen((g) => g + 1);
    lab.hunting = false;
    play("whoosh");
    emit("toast", { text: "BENCH RESET" });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e) || e.key.toLowerCase() !== "r") return;
      e.preventDefault();
      reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Toys drop onto the mat after a cold boot here, and again after every reset. Arriving from
  // another page the page transition is the entrance, so they are simply there.
  useEffect(() => {
    if (ready && !booted) cold.current = true;
  }, [ready, booted]);
  useGSAP(
    () => {
      if (reduced || !booted || (!cold.current && gen === 0)) return;
      root.current?.querySelectorAll<HTMLElement>("[data-pg-in]").forEach((el, i) => {
        gsap.from(el, {
          y: 90,
          rotation: (seeded(i + gen * 13) - 0.5) * 10,
          autoAlpha: 0,
          duration: 1.1,
          delay: (i % 4) * 0.07,
          ease: "expo.out",
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: el, start: "top 96%", once: true },
        });
      });
    },
    { scope: root, dependencies: [reduced, booted, gen], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="pg-root">
      <div ref={setMat} className="pg-mat">
        <Mat />
        <div className="pg-bench">
          <header ref={head} className="pg-head" data-pg-solid>
            <h1 data-chaos-type className="pg-title text-display-m">
              <span className="block overflow-clip pb-[0.06em]">
                <span data-rise className="display block">
                  The lab
                </span>
              </span>
              <span className="-mt-[0.04em] block overflow-clip pr-[0.15em] pb-[0.14em]">
                <span data-rise className="serif-accent block leading-[0.9]">
                  <span className="calm-only">mostly unbroken.</span>
                  <span className="chaos-only">very broken.</span>
                </span>
              </span>
            </h1>
            <div className="pg-head-keys">
              <Legend />
              <Button variant="key" size="sm" magnetic={false} icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={reset} aria-keyshortcuts="R">
                Reset bench
              </Button>
            </div>
          </header>

          <Zone area="tray" rail="Tray">
            {({ near, active }) => <Tray key={gen} near={near} active={active} />}
          </Zone>
          <Zone area="key">{({ near, active }) => <Keycap near={near} active={active} gen={gen} />}</Zone>
          <Zone area="stamp">{() => <Stamp key={gen} />}</Zone>
          <Zone area="win" rail="Windows">
            {({ near, active }) => <Windows key={gen} near={near} active={active} bounds={mat} />}
          </Zone>
          <Zone area="hunt" rail="Bug hunt">
            {() => <BugHunt key={gen} />}
          </Zone>
          <Zone area="well" rail="Well">
            {({ active }) => <Well key={gen} active={active} />}
          </Zone>
          <Zone area="form" rail="Settings">
            {() => <Settings key={gen} />}
          </Zone>
        </div>
      </div>
    </div>
  );
}
