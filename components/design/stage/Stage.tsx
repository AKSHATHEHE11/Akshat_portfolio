"use client";
import "./stage.css";
import Image, { getImageProps } from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactElement } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Work } from "@/data/design";
import { useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad, seeded } from "@/lib/utils";

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** What a work shows when it isn't moving: the still itself, or the video's poster. */
const still = (w: Work) => (w.media.kind === "image" ? w.media.src : w.media.poster);

/**
 * CONCERT VISUALS — Akshat's loops on an LED wall, the way the crowd sees them: a black stage, the
 * wall's light spilling into the haze, two slow beams off the truss, hands up in front. One <video>
 * on the wall; picking another loop swaps its source. It plays only while the stage is on screen,
 * and with reduced motion it waits on its poster for a press of play.
 * Mount it full width, not inside a .frame: the stage runs edge to edge, and the caption and the
 * loops under it sit in their own frame, lined up with the page's.
 */
export default function Stage({ works }: { works: Work[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<FullscreenVideo>(null);
  const reduced = useReducedMotion();
  const onScreen = useOnScreen(stage);
  const [id, setId] = useState(works[0]?.id);
  // the visitor's own play/pause; until they choose, loops play unless motion is reduced
  const [choice, setChoice] = useState<boolean | null>(null);
  const cur = works.find((w) => w.id === id) ?? works[0];
  const src = cur?.media.kind === "video" ? cur.media.src : undefined;
  const want = choice ?? !reduced;

  // runs again on a new source too: loading one leaves the element paused
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // a blocked autoplay (iOS Low Power Mode) falls back to the play button
    if (want && onScreen) v.play().catch((e: DOMException) => e.name === "NotAllowedError" && setChoice(false));
    else v.pause();
  }, [want, onScreen, src]);

  if (!cur) return null;
  const m = cur.media;
  // the haze only needs the colours: a video's poster is loading anyway, anything else gets a small
  // copy instead of the full-size original
  const haze = m.kind === "video" ? m.poster : getImageProps({ src: still(cur), width: 64, height: 36, alt: "" }).props.src;

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    // from what the video is doing, not what we last asked of it: the full-screen player has its own controls
    const on = v.paused;
    play(on ? "toggle-on" : "toggle-off");
    setChoice(on);
    // started inside the click itself: iOS only lets a gesture start playback
    if (on) v.play().catch(() => {});
    else v.pause();
  };

  const fullscreen = (e: MouseEvent<HTMLButtonElement>) => {
    const v = video.current;
    if (!v) return;
    const btn = e.currentTarget;
    setChoice(true);
    v.play().catch(() => {});
    // Back from full screen: keep what the visitor left it doing there (paused or playing), and give
    // focus back to this button (Chrome drops it to the page).
    const back = () => {
      if (document.fullscreenElement) return;
      document.removeEventListener("fullscreenchange", back);
      setChoice(!v.paused);
      btn.focus({ preventScroll: true });
    };
    // iPhone Safari has no element fullscreen, only the native player
    const native = () => {
      v.addEventListener("webkitendfullscreen", back, { once: true });
      v.webkitEnterFullscreen?.();
    };
    if (document.fullscreenEnabled && v.requestFullscreen) {
      document.addEventListener("fullscreenchange", back);
      v.requestFullscreen().catch(() => {
        document.removeEventListener("fullscreenchange", back);
        native();
      });
    } else native();
  };

  const pick = (w: Work) => {
    if (w.id === cur.id) return;
    play("click");
    setId(w.id);
    setChoice(null);
  };

  return (
    <div className="st" data-live={onScreen || undefined}>
      <div ref={stage} className="st-stage">
        <div aria-hidden className="st-spill" style={{ backgroundImage: `url("${haze}")` }} />
        {RIG}
        <div className="st-wall">
          {m.kind === "video" ? (
            <>
              <video ref={video} className="st-media" src={m.src} poster={m.poster} muted loop playsInline preload="none" />
              <button
                type="button"
                className="st-toggle"
                data-paused={!want || undefined}
                aria-label={`${want ? "Pause" : "Play"} ${cur.title}`}
                data-cursor="view"
                data-cursor-label={want ? "PAUSE" : "PLAY"}
                onClick={toggle}
              >
                <span className="st-glyph">
                  {want ? <Pause aria-hidden size={26} strokeWidth={1.75} /> : <Play aria-hidden size={26} strokeWidth={1.75} />}
                </span>
              </button>
            </>
          ) : (
            <Image
              className="st-media"
              src={still(cur)}
              alt={m.kind === "image" ? (cur.alt ?? cur.title) : ""}
              fill
              sizes="(max-width: 767px) 100vw, 60vw"
            />
          )}
          {m.kind === "youtube" ? (
            <div className="st-yt">
              <Button href={`https://www.youtube.com/watch?v=${m.id}`} variant="ghost">
                Watch on YouTube
              </Button>
            </div>
          ) : null}
        </div>
        {CROWD}
      </div>

      <div className="frame">
        <div className="st-bar">
          <p className="st-cap">
            <span className="st-cap-title">{cur.title}</span>
            {cur.meta ? <span className="st-cap-meta">{cur.meta}</span> : null}
          </p>
          {m.kind === "video" ? (
            <Button variant="ghost" size="sm" icon={<Maximize2 aria-hidden size={14} strokeWidth={1.75} />} onClick={fullscreen}>
              Full screen
            </Button>
          ) : null}
        </div>

        {works.length > 1 ? (
          <ul className="st-list no-scrollbar" aria-label="Loops">
            {works.map((w, i) => {
              const on = w.id === cur.id;
              return (
                <li key={w.id}>
                  <button type="button" className="st-pick" aria-pressed={on} data-cursor="hover" onClick={() => pick(w)}>
                    <Image className="st-thumb" src={still(w)} alt="" width={w.media.width} height={w.media.height} sizes="8rem" />
                    <span className="label">
                      {pad(i + 1)}
                      {on ? " · On screen" : ""}
                    </span>
                    <span className="st-pick-title">{w.title}</span>
                    {w.meta ? <span className="st-pick-meta">{w.meta}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

// The rig: a truss over the wall and the beams hanging off it — x along the stage (%), resting
// angle, sweep time and phase. One at each end: the rig hangs behind the wall, so a beam over the
// middle would only light the back of it. Built once here, so picking a loop never re-renders it
// (nor the crowd).
const BEAMS = [
  { x: 11, a: 26, t: 13, d: -3 },
  { x: 89, a: -26, t: 11, d: -2 },
];
const RIG = (
  <>
    <div aria-hidden className="st-truss" />
    {BEAMS.map((b) => (
      <span
        key={b.x}
        aria-hidden
        className="st-beam"
        style={{ "--x": `${b.x}%`, "--a": `${b.a}deg`, "--t": `${b.t}s`, "--d": `${b.d}s` } as CSSProperties}
      />
    ))}
  </>
);

// The crowd, drawn once from a fixed seed so the server and the client agree: a dense far crowd
// along one eye line just over the bottom of the wall, bigger heads nearer rising above it, some
// hands up and a phone or two filming; fewer hands in front of the middle of the wall, where they'd
// hide the work. Both fade to black toward the camera, the far crowd from a haze-lit grey, so mostly
// the outline against the light reads, as in a photo. The viewBox is 8:1 and sliced from the bottom
// centre: a narrow stage crops the edges instead of shrinking the people.
const CROWD = (() => {
  let seed = 7;
  const rnd = () => seeded(seed++);
  const n = (v: number) => Math.round(v * 10) / 10;
  // ellipses run clockwise, like the rectangles, so shapes in one path add up instead of cutting holes
  const oval = (x: number, y: number, rx: number, ry: number) =>
    `M${n(x - rx)} ${n(y)}a${n(rx)} ${n(ry)} 0 1 1 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 1 ${n(-2 * rx)} 0z`;
  const EYE = 112;
  const people = [
    // the far crowd, spread evenly so the eye line has no gaps
    ...Array.from({ length: 150 }, (_, i) => ({ x: (i + rnd()) * 16, z: rnd() * 0.3 })),
    // and the people nearer, scattered
    ...Array.from({ length: 34 }, () => ({ x: rnd() * 2400, z: 0.3 + rnd() * 0.7 })),
  ];
  const groups = [
    { id: "st-far", top: "#1a1a1a", d: "", parts: [] as ReactElement[] },
    { id: "st-near", top: "#050505", d: "", parts: [] as ReactElement[] },
  ];
  people.forEach(({ x, z }, i) => {
    const r = 8 + 26 * z ** 1.7;
    const y = EYE - 12 * z + (rnd() - 0.5) * 0.6 * r;
    const g = groups[z < 0.3 ? 0 : 1];
    // head, neck, shoulders, body
    g.d += oval(x, y, (0.72 + rnd() * 0.14) * r, r) + oval(x, y + 0.95 * r, 0.42 * r, 0.6 * r);
    g.d += oval(x, y + 2.15 * r, (2.1 + rnd() * 0.5) * r, 1.15 * r) + `M${n(x - 1.9 * r)} ${n(y + 2.15 * r)}H${n(x + 1.9 * r)}V300H${n(x - 1.9 * r)}z`;
    if (rnd() > (0.07 + 0.25 * z) * (Math.abs(x - 1200) < 420 ? 0.3 : 1)) return;
    // a raised arm: shoulder → elbow, bent outward → hand, thinner at the wrist
    const side = rnd() < 0.5 ? -1 : 1;
    const sx = x + side * 1.5 * r;
    const sy = y + 1.9 * r;
    const hx = sx + side * (rnd() * 1.6 - 0.4) * r;
    const hy = y - (2.4 + rnd() * 2.8) * r;
    const ex = (sx + hx) / 2 + side * (0.25 + rnd() * 0.75) * r;
    const ey = (sy + hy) / 2 + 0.25 * r;
    g.parts.push(
      <path key={`u${i}`} d={`M${n(sx)} ${n(sy)}L${n(ex)} ${n(ey)}`} strokeWidth={n(0.64 * r)} />,
      <path key={`f${i}`} d={`M${n(ex)} ${n(ey)}L${n(hx)} ${n(hy)}`} strokeWidth={n(0.5 * r)} />,
    );
    const hand = rnd();
    if (hand < 0.2 && z > 0.3) {
      // a phone, filming, its screen lit
      const w = 0.78 * r;
      const h = 1.4 * r;
      g.parts.push(
        <g key={`p${i}`} stroke="none" transform={`rotate(${n(side * rnd() * 14)} ${n(hx)} ${n(hy)})`}>
          <rect x={n(hx - w / 2)} y={n(hy - 0.85 * h)} width={n(w)} height={n(h)} rx={n(0.12 * r)} />
          <rect x={n(hx - w / 2 + 0.09 * r)} y={n(hy - 0.85 * h + 0.11 * r)} width={n(w - 0.18 * r)} height={n(h - 0.22 * r)} rx={n(0.05 * r)} className="st-phone" />
        </g>,
      );
    } else if (hand < 0.45) {
      g.d += oval(hx, hy - 0.15 * r, 0.34 * r, 0.44 * r); // a fist
    } else {
      // an open hand: palm, four fingers fanned up (the outer one short), thumb out to the inside
      g.d += oval(hx, hy - 0.2 * r, 0.36 * r, 0.46 * r);
      let f = `M${n(hx - side * 0.28 * r)} ${n(hy - 0.1 * r)}l${n(-side * 0.32 * r)} ${n(-0.3 * r)}`;
      for (let k = -1.5; k <= 1.5; k++) f += `M${n(hx + k * 0.16 * r)} ${n(hy - 0.5 * r)}l${n(k * 0.08 * r)} ${n((k === 1.5 * side ? -0.32 : -0.48) * r)}`;
      g.parts.push(<path key={`h${i}`} d={f} strokeWidth={n(0.2 * r)} />);
    }
  });
  return (
    <svg aria-hidden className="st-crowd" viewBox="0 0 2400 300" preserveAspectRatio="xMidYMax slice">
      <defs>
        {groups.map((g) => (
          <linearGradient key={g.id} id={g.id} gradientUnits="userSpaceOnUse" x1="0" y1={EYE - 40} x2="0" y2={EYE + 100}>
            <stop offset="0" stopColor={g.top} />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
        ))}
      </defs>
      {groups.map((g) => (
        <g key={g.id} fill={`url(#${g.id})`} stroke={`url(#${g.id})`} strokeLinecap="round">
          <path d={g.d} stroke="none" />
          {g.parts}
        </g>
      ))}
    </svg>
  );
})();
