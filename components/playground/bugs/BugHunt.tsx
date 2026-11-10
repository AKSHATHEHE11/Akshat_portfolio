"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ignoreShortcut } from "@/components/work/keys";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { pad } from "@/lib/utils";
import { lab, setText } from "../lab";
import { createSwarm, type Swarm } from "./swarm";

const GAME_MS = 20_000;
const BEST_KEY = "akshat:bughunt-best";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Bug Hunt: a cream handheld with a CRT. START sends bugs crawling over the visible mat for twenty
 * seconds; squash them (click, tap, or Tab to one and press Enter). Best score lives in
 * localStorage. The bug layer sits right after the device in the DOM, so the next Tab after START
 * lands on a bug. Chaos: squashing one breeds two, and strays crawl in even without a game.
 */
export default function BugHunt() {
  const layer = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const swarm = useRef<Swarm | null>(null);
  const coarse = useCoarse();
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "run" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [record, setRecord] = useState(false);
  const scoreRef = useRef(0);
  const chaosRef = useRef(chaos);

  useEffect(() => setBest(readBest()), []);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const s = createSwarm(el, {
      coarse,
      onSquash: (kind, x, y) => {
        play("drop");
        if (kind === "game") setScore((scoreRef.current += 1));
        // chaos: squash one, two crawl out
        if (chaosRef.current && s.count() < (coarse ? 12 : 26)) {
          s.spawn(kind, { x, y });
          s.spawn(kind, { x, y });
        }
      },
    });
    swarm.current = s;
    return () => {
      s.destroy();
      swarm.current = null;
      lab.hunting = false;
    };
  }, [coarse]);

  useEffect(() => {
    chaosRef.current = chaos;
    swarm.current?.setChaos(chaos);
  }, [chaos]);

  // chaos without a game: strays wander in and slowly multiply
  useEffect(() => {
    const s = swarm.current;
    if (!s) return;
    if (!chaos || reduced) {
      s.scatter("stray");
      return;
    }
    const cap = coarse ? 4 : 8;
    const id = window.setInterval(() => {
      if (s.count("stray") < cap) s.spawn("stray");
    }, 2600);
    return () => window.clearInterval(id);
  }, [chaos, reduced, coarse]);

  // the game loop: countdown + spawning, 10 times a second
  const timeUp = useEffectEvent(() => end());
  useEffect(() => {
    const s = swarm.current;
    if (phase !== "run" || !s) return;
    const t0 = performance.now();
    let nextSpawn = 0;
    const cap = coarse ? 7 : 14;
    for (let i = 0; i < (coarse ? 3 : 5); i++) s.spawn("game");
    const id = window.setInterval(() => {
      const now = performance.now() - t0;
      const left = Math.max(0, GAME_MS - now);
      setText(clock.current, (left / 1000).toFixed(1));
      if (now > nextSpawn) {
        nextSpawn = now + (chaosRef.current ? 380 : 640);
        if (s.count("game") < cap) s.spawn("game");
      }
      if (left > 0) return;
      window.clearInterval(id);
      timeUp();
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, coarse]);

  function begin() {
    if (phase === "run") {
      end();
      return;
    }
    scoreRef.current = 0;
    setScore(0);
    setRecord(false);
    setText(clock.current, (GAME_MS / 1000).toFixed(1));
    lab.hunting = true;
    setPhase("run");
    play("boot");
  }

  function end() {
    lab.hunting = false;
    swarm.current?.scatter("game");
    setPhase("over");
    const n = scoreRef.current;
    const prev = readBest();
    if (n > prev) {
      try {
        localStorage.setItem(BEST_KEY, String(n));
      } catch {
        /* private mode: the best lives as long as the tab */
      }
      setBest(n);
      setRecord(true);
      play("ready");
      emit("toast", { text: `NEW BEST: ${pad(n)} BUGS` });
    } else {
      play("success");
      emit("toast", { text: `BUG HUNT: ${pad(n)} SQUASHED` });
    }
  }

  // page key: B starts (or stops) a hunt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e) || e.key.toLowerCase() !== "b") return;
      e.preventDefault();
      begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const line = phase === "run" ? "> SQUASH THEM_" : phase === "over" ? (record ? "> NEW BEST_" : "> AGAIN?_") : "> PRESS START_";
  return (
    <>
      <div className="pg-hunt" data-pg-in>
        <div className="pg-hunt-screen" data-phase={phase}>
          <p className="crt pg-hunt-row">
            <span>BUG HUNT</span>
            <span>BEST {pad(best)}</span>
          </p>
          <p className="crt pg-hunt-big" aria-live="polite" aria-atomic>
            <span>
              <span ref={clock}>{(GAME_MS / 1000).toFixed(1)}</span>s
            </span>
            <span>
              <span className="sr-only">Squashed </span>
              {pad(score)}
            </span>
          </p>
          <p className="crt pg-hunt-row">{line}</p>
        </div>
        <div className="pg-hunt-deck">
          <button type="button" className="pg-bigkey" onClick={begin} aria-keyshortcuts="B">
            <span>{phase === "run" ? "Stop" : phase === "over" ? "Again" : "Start"}</span>
          </button>
          <span aria-hidden className="pg-hunt-grille" />
        </div>
      </div>
      {/* positioned against the mat, not this zone */}
      <div ref={layer} className="pg-bugs" />
    </>
  );
}
