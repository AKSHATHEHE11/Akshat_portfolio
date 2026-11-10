"use client";
// EXP-03 · Pattern Machine. Four knobs and a seed drive a generative poster (poster.ts). While it is
// switched on, knob changes ease in, palettes crossfade and now and then one module re-decides itself
// (constantly, in chaos). EXPORT renders the same poster at 1600×2000 and downloads it.
import { useEffect, useRef, useState } from "react";
import { Dices, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { gsap } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { clamp, pad } from "@/lib/utils";
import { cssVar, dprCap, type PieceProps } from "../shared";
import { Knob } from "./Knob";
import { PALETTES, drawPoster, layout, mix, rgb, type PosterState, type RGB } from "./poster";

type Colors = [RGB, RGB, RGB, RGB];
const START = { density: 0.42, rotation: 0.18, palette: 0, chaos: 0.12 };
const FIRST_SEED = 412;
const colorsOf = (i: number) => PALETTES[i].c.map(rgb) as Colors;
const paletteIndex = (v: number) => Math.round(v * (PALETTES.length - 1));

export default function PatternMachine({ active, chaos, reduced, coarse, title, year }: PieceProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(FIRST_SEED);
  const knobs = useRef({ ...START });
  const S = useRef({
    w: 0,
    h: 0,
    dpr: 1,
    seed: FIRST_SEED,
    rotation: START.rotation,
    chaos: START.chaos,
    hot: false,
    palette: 0,
    colors: colorsOf(0),
    from: colorsOf(0),
    blend: 1,
    turns: new Float32Array(0),
    goal: new Float32Array(0),
    cells: 0,
    nextFlip: 0,
    looping: false,
    fonts: { display: "sans-serif", mono: "monospace" },
  });

  const state = (): PosterState => {
    const s = S.current;
    return {
      seed: s.seed,
      density: knobs.current.density,
      rotation: s.rotation,
      chaos: s.chaos,
      colors: s.colors,
      palette: PALETTES[s.palette].name,
      turns: s.turns,
      title,
      year,
      fonts: s.fonts,
    };
  };

  const render = () => {
    const s = S.current;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !s.w) return;
    const { cols, rows } = layout(s.w, s.h, knobs.current.density);
    if (cols * rows !== s.cells) {
      s.cells = cols * rows;
      s.turns = new Float32Array(s.cells);
      s.goal = new Float32Array(s.cells);
    }
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    drawPoster(ctx, s.w, s.h, state());
  };
  /** knob/seed change: the loop eases toward it; without a loop, jump there and draw once */
  const changed = () => {
    const s = S.current;
    if (s.looping) return;
    s.rotation = knobs.current.rotation;
    s.chaos = clamp(knobs.current.chaos + (s.hot ? 0.35 : 0));
    s.colors = colorsOf(s.palette);
    s.blend = 1;
    render();
  };

  // poster box: the largest 4:5 that fits the stage (resize only)
  useEffect(() => {
    const st = stage.current;
    const c = canvas.current;
    if (!st || !c) return;
    const s = S.current;
    s.fonts = { display: cssVar("--font-archivo", "sans-serif"), mono: cssVar("--font-plex", "monospace") };
    const size = () => {
      const pw = Math.floor(Math.min(st.clientWidth * 0.92, st.clientHeight * 0.92 * 0.8));
      const ph = Math.round(pw * 1.25);
      s.dpr = dprCap(coarse);
      c.style.width = `${pw}px`;
      c.style.height = `${ph}px`;
      c.width = Math.max(1, Math.round(pw * s.dpr));
      c.height = Math.max(1, Math.round(ph * s.dpr));
      s.w = pw;
      s.h = ph;
      render();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(st);
    void document.fonts.ready.then(render);
    return () => ro.disconnect();
    // render reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coarse]);

  // global chaos runs the machine hotter
  useEffect(() => {
    S.current.hot = chaos;
    changed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaos]);

  // the loop: ease toward the knobs, crossfade palettes, let modules re-decide themselves
  useEffect(() => {
    if (!active || reduced) return;
    const s = S.current;
    s.looping = true;
    const tick = (time: number, deltaMs: number) => {
      const t = time * 1000;
      const dt = Math.min(deltaMs, 50) / 1000;
      const a = 1 - Math.exp(-dt * 8);
      let moving = false;
      const ease = (cur: number, target: number) => {
        if (Math.abs(target - cur) < 1e-3) return target;
        moving = true;
        return cur + (target - cur) * a;
      };
      s.rotation = ease(s.rotation, knobs.current.rotation);
      s.chaos = ease(s.chaos, clamp(knobs.current.chaos + (s.hot ? 0.35 : 0)));
      if (s.blend < 1) {
        s.blend = Math.min(1, s.blend + dt / 0.5);
        const to = colorsOf(s.palette);
        s.colors = s.from.map((c, i) => mix(c, to[i], s.blend)) as Colors;
        moving = true;
      }
      if (t > s.nextFlip && s.cells) {
        s.nextFlip = t + (s.hot ? 240 : 2300) * (0.6 + Math.random() * 0.8);
        s.goal[Math.floor(Math.random() * s.cells)] += Math.random() < 0.5 ? 1 : -1;
      }
      for (let i = 0; i < s.cells; i++) {
        const d = s.goal[i] - s.turns[i];
        if (d === 0) continue;
        s.turns[i] = Math.abs(d) < 0.003 ? s.goal[i] : s.turns[i] + d * Math.min(1, a * 1.3);
        moving = true;
      }
      if (moving) render();
    };
    gsap.ticker.add(tick);
    return () => {
      s.looping = false;
      gsap.ticker.remove(tick);
    };
    // render reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);

  const setKnob = (k: keyof typeof START) => (v: number) => {
    const s = S.current;
    knobs.current[k] = v;
    if (k === "palette") {
      const i = paletteIndex(v);
      if (i === s.palette) return;
      s.from = s.colors;
      s.palette = i;
      s.blend = 0;
    }
    if (k === "density") render();
    changed();
  };

  const reroll = () => {
    const next = Math.floor(Math.random() * 9999) + 1;
    S.current.seed = next;
    S.current.cells = 0; // fresh modules, no leftover turns
    setSeed(next);
    play("glitch");
    render();
  };

  const exportPng = () => {
    const W = 1600;
    const H = 2000;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const s = S.current;
    // the settled poster: knob targets, not whatever the easing is passing through
    drawPoster(ctx, W, H, {
      ...state(),
      rotation: knobs.current.rotation,
      chaos: clamp(knobs.current.chaos + (s.hot ? 0.35 : 0)),
      colors: colorsOf(s.palette),
    });
    c.toBlob((blob) => {
      if (!blob) return emit("toast", { text: "EXPORT FAILED — TRY AGAIN" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pattern-machine-${pad(s.seed, 4)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      play("success");
      emit("toast", { text: `POSTER No.${pad(s.seed, 4)} SAVED` });
    }, "image/png");
  };

  return (
    <div className="xp-pm">
      <div ref={stage} className="xp-pm-stage">
        <canvas ref={canvas} role="img" aria-label={`Generated poster number ${seed}`} className="xp-pm-poster" />
      </div>
      <div className="xp-pm-panel">
        <div className="xp-pm-knobs">
          <Knob label="Density" value={START.density} format={(v) => `${layout(400, 500, v).cols} col`} onChange={setKnob("density")} />
          <Knob label="Rotation" value={START.rotation} format={(v) => `${Math.round(v * 180)}°`} onChange={setKnob("rotation")} />
          <Knob
            label="Palette"
            value={START.palette}
            steps={PALETTES.length}
            format={(v) => PALETTES[paletteIndex(v)].name}
            onChange={setKnob("palette")}
          />
          <Knob label="Chaos" value={START.chaos} format={(v) => v.toFixed(2)} onChange={setKnob("chaos")} />
        </div>
        <div className="xp-pm-row">
          <p className="label">
            <span className="text-[rgb(242_238_231/0.55)]">Seed </span>
            <span className="tabular-nums text-[#f2eee7]">{pad(seed, 4)}</span>
          </p>
          <Button variant="key" size="sm" magnetic={false} icon={<Dices size={14} strokeWidth={1.75} />} onClick={reroll}>
            Reroll
          </Button>
        </div>
        <Button variant="accent" size="sm" magnetic={false} icon={<Download size={14} strokeWidth={1.75} />} onClick={exportPng} className="w-full">
          Export PNG
        </Button>
      </div>
    </div>
  );
}
