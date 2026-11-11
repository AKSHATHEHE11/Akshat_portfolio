// Imperative cursor engine: one gsap.ticker loop + event delegation. Zero React renders per frame.
// Mounted by components/system/Cursor.tsx (fine pointers only).
//
// State = closest [data-cursor] ancestor of whatever is under the pointer (untagged links/buttons → hover):
//   default · hover (ring wraps small controls, matching their radius) · open / view / drag (accent
//   disc + label) · text (I-beam sized to the type under it) · hide · native (typing surfaces keep the
//   OS caret). The ring lags (gsap.quickTo), the dot is immediate, both stretch along the velocity and
//   shrink while pressed. Fast scrolls turn the ring into a capsule scroll indicator. Chaos swaps in a
//   cycling glyph with a ghost trail. Reduced motion: no stretch, trail, ripple or spin.
import type Lenis from "lenis";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { clamp } from "@/lib/utils";

export type CursorKind = "default" | "hover" | "open" | "view" | "drag" | "text" | "hide" | "native";
type DiscKind = "open" | "view" | "drag";
type Styled = HTMLElement | SVGElement;
type Prop = "transform" | "opacity" | "width" | "height" | "borderRadius";

export interface CursorEngine {
  setMode(mode: { chaos: boolean; reduced: boolean }): void;
  /** Re-read what is under the pointer (route change, scroll, host removed). */
  probe(): void;
  destroy(): void;
}

/** Typing surfaces keep the native caret — keep in sync with the html.has-cursor rules in cursor.css. */
const NATIVE =
  "textarea, select, iframe, [contenteditable]:not([contenteditable='false']), input:not([type='checkbox'], " +
  "[type='radio'], [type='range'], [type='button'], [type='submit'], [type='reset'], [type='color'], [type='file'], [type='image'])";
const KINDS = new Set(["hover", "open", "view", "drag", "text", "hide"]);
/** The native pointer is hidden site-wide, so clickables nobody tagged still get the hover ring. */
const CLICKABLE = "a[href], button:not(:disabled), [role='button'], summary";
const LABEL: Record<DiscKind, string> = { open: "OPEN", view: "VIEW", drag: "DRAG" };
const GLYPHS = ["✦", "◇", "■", "●", "✕"];
const RING = 32; // idle ring diameter (cursor.css)
const PAD = 6; // gap between a wrapped control and the ring
const WRAP = { w: 380, h: 140 }; // larger hover targets get an expanded ring instead of a wrap
const HIST = 32; // trail history, in frames
const OFF = "translate3d(-200px,-200px,0) scale(0)";
const DEG = 180 / Math.PI;

const isDisc = (k: CursorKind): k is DiscKind => k === "open" || k === "view" || k === "drag";
const r2 = (n: number) => Math.round(n * 100) / 100;

/** border-top-left-radius in px — handles 9999px pills and 50% circles. */
function radiusOf(el: Element, w: number, h: number) {
  const v = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(v) || 0;
  return Math.min(v.endsWith("%") ? (n / 100) * Math.min(w, h) : n, Math.min(w, h) / 2);
}

export function createCursor(blend: HTMLElement, solid: HTMLElement, getLenis: () => Lenis | undefined): CursorEngine {
  const part = (root: HTMLElement, k: string) => root.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
  const dot = part(blend, "dot");
  const ring = part(blend, "ring");
  const beam = part(blend, "beam");
  const ripple = part(blend, "ripple");
  const disc = part(solid, "disc");
  const dial = solid.querySelector<SVGElement>('[data-c="dial"]')!;
  const label = part(solid, "label");
  const glyph = part(solid, "glyph");
  const ghosts = Array.from(solid.querySelectorAll<HTMLElement>('[data-c="ghost"]'));
  const html = document.documentElement;

  let kind: CursorKind = "default";
  let host: HTMLElement | null = null;
  let wrap = false;
  let radius = 0;
  let size = 88; // disc diameter
  let beamH = 24;
  let chaos = false;
  let reduced = false;
  let touch = false;
  let shown = false;
  let labelText = ""; // what the disc label says now
  let down = false;
  let scrolling = false;
  let calmAt = 0;
  let probeAt = 0;
  let wasBusy = false;
  let sdy = 0; // scroll-indicator dot offset
  // The wrapped control's rect: re-read every frame until it has held still for 10 frames, again whenever
  // something could move it (pointer — magnetic controls follow it —, press, scroll, resize, a new host),
  // and otherwise only every 20th frame (a still pointer resting on a control forced a layout per frame).
  let box: DOMRect | null = null;
  let still = 0;
  let lastX = NaN;
  let lastY = NaN;
  let tilt = 0;
  let turn = 0; // dial angle
  let spin = 0; // chaos glyph angle
  let gi = 0;
  let swapAt = 0;
  let head = 0;
  let blendAlpha = "";

  // Ring geometry is tweened by quickTo; everything else the loop reads lives in `look`.
  const pos = { x: pointer.x, y: pointer.y, w: RING, h: RING, r: RING / 2 };
  const look = { alpha: 0, ring: 1, dot: 1, beam: 0, disc: 0, glyph: 0, press: 1, sx: 1, sy: 1 };
  const goal = { x: NaN, y: NaN, w: NaN, h: NaN, r: NaN };
  const hist = Array.from({ length: HIST }, () => ({ x: pointer.x, y: pointer.y, g: 0 }));
  const ghostG = ghosts.map(() => -1);
  const q = {
    x: gsap.quickTo(pos, "x", { duration: 0.42, ease: "power3.out" }),
    y: gsap.quickTo(pos, "y", { duration: 0.42, ease: "power3.out" }),
    w: gsap.quickTo(pos, "w", { duration: 0.36, ease: "power3.out" }),
    h: gsap.quickTo(pos, "h", { duration: 0.36, ease: "power3.out" }),
    r: gsap.quickTo(pos, "r", { duration: 0.36, ease: "power3.out" }),
  };
  let lag = "";

  // Style writes go through a cache so an idle cursor touches nothing.
  const written = new WeakMap<Styled, Partial<Record<Prop, string>>>();
  function put(el: Styled, prop: Prop, v: string) {
    let m = written.get(el);
    if (!m) written.set(el, (m = {}));
    if (m[prop] === v) return;
    m[prop] = v;
    el.style[prop] = v;
  }

  /** Follow speed: lazy when free, tight while wrapping a moving (magnetic) control. */
  function setLag() {
    const move = reduced ? 0.12 : wrap ? 0.2 : 0.42;
    const morph = reduced ? 0.12 : 0.36;
    const key = `${move}/${morph}`;
    if (key === lag) return;
    lag = key;
    q.x.tween.duration(move);
    q.y.tween.duration(move);
    q.w.tween.duration(morph);
    q.h.tween.duration(morph);
    q.r.tween.duration(morph);
  }

  function aim(x: number, y: number, w: number, h: number, r: number) {
    if (x !== goal.x) q.x((goal.x = x));
    if (y !== goal.y) q.y((goal.y = y));
    if (w !== goal.w) q.w((goal.w = w));
    if (h !== goal.h) q.h((goal.h = h));
    if (r !== goal.r) q.r((goal.r = r));
  }

  /** Cross-fade the parts for the current kind / mode. */
  function applyLook() {
    const d = isDisc(kind);
    gsap.to(look, {
      ring: chaos || d || kind === "text" ? 0 : 1,
      dot: chaos || d || kind === "text" ? 0 : kind === "hover" ? 0.35 : 1,
      beam: kind === "text" ? 1 : 0,
      glyph: !chaos || d || kind === "text" ? 0 : kind === "hover" ? 1.8 : 1,
      duration: reduced ? 0.12 : 0.4,
      ease: "expo.out",
      overwrite: "auto",
    });
    gsap.to(look, {
      disc: d ? 1 : 0,
      duration: reduced ? 0.12 : d ? 0.55 : 0.22,
      ease: d && !reduced ? "back.out(1.7)" : "power3.in",
      overwrite: "auto",
    });
    const [sx, sy] = kind === "drag" ? (down ? [1.3, 0.74] : [1.14, 0.88]) : [1, 1];
    gsap.to(look, {
      sx,
      sy,
      duration: reduced ? 0.12 : 0.6,
      ease: reduced ? "none" : "elastic.out(1, 0.5)",
      overwrite: "auto",
    });
  }

  function setKind(next: CursorKind, nextHost: HTMLElement | null, under: Element | null) {
    // a host can change its label in place (READ → CLOSE after a click), so compare that too
    const text = isDisc(next) ? nextHost?.dataset.cursorLabel?.trim() || LABEL[next] : "";
    if (next === kind && nextHost === host && text === labelText) return;
    kind = next;
    host = nextHost;
    labelText = text;
    wrap = false;
    box = null;
    still = 0;
    if (next === "hover" && nextHost) {
      const b = nextHost.getBoundingClientRect();
      // a box-less host (display: contents) has nothing to wrap
      wrap = b.width > 0 && b.height > 0 && b.width <= WRAP.w && b.height <= WRAP.h;
      radius = radiusOf(nextHost, b.width, b.height);
    } else if (isDisc(next)) {
      disc.dataset.kind = next;
      size = Math.round(Math.max(84, text.length * 7.6 + (next === "drag" ? 52 : 44)));
      put(disc, "width", `${size}px`);
      put(disc, "height", `${size}px`);
      gsap.killTweensOf(label);
      if (reduced) label.textContent = text;
      else gsap.to(label, { duration: 0.5, ease: "none", scrambleText: { text, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/", speed: 0.9 } });
    } else if (next === "text") {
      const fs = parseFloat(getComputedStyle(under ?? nextHost ?? html).fontSize) || 16;
      beamH = Math.round(clamp(fs * 1.15, 16, 84));
      put(beam, "height", `${beamH}px`);
    }
    setLag();
    applyLook();
  }

  function resolve(target: EventTarget | null) {
    const el = target instanceof Element ? target : null;
    if (!el) return setKind("default", null, null);
    if (el.closest(NATIVE)) return setKind("native", null, el);
    const h = el.closest<HTMLElement>("[data-cursor]");
    const k = h?.dataset.cursor ?? "";
    if (h && KINDS.has(k)) return setKind(k as CursorKind, h, el);
    const c = el.closest<HTMLElement>(CLICKABLE);
    setKind(c ? "hover" : "default", c, el);
  }

  function probe() {
    probeAt = performance.now();
    resolve(pointer.inside ? document.elementFromPoint(pointer.x, pointer.y) : null);
  }

  function burst(x: number, y: number) {
    gsap.killTweensOf(ripple);
    gsap.fromTo(ripple, { x: x - 20, y: y - 20, scale: 0.35, opacity: 0.8 }, { scale: 1.9, opacity: 0, duration: 0.6, ease: "expo.out" });
  }

  const onOver = (e: PointerEvent) => {
    touch = e.pointerType === "touch";
    if (!touch) resolve(e.target);
  };
  const onDown = (e: PointerEvent) => {
    touch = e.pointerType === "touch";
  };
  // a click often changes its host's label or kind in place: look again once React has re-rendered
  const onClick = () => {
    if (!touch) requestAnimationFrame(probe);
  };
  const onResize = () => (still = 0);

  const tick = () => {
    const now = performance.now();
    const dr = gsap.ticker.deltaRatio(60);
    const px = pointer.x;
    const py = pointer.y;
    const lenis = getLenis();

    // presence: pointer in the window, not a touch, not a hidden/native target
    const show = pointer.inside && !touch && kind !== "hide" && kind !== "native";
    if (show !== shown) {
      shown = show;
      // the native pointer stays until ours has a position (a still mouse after load would see nothing)
      if (show) html.classList.add("has-cursor");
      gsap.to(look, { alpha: show ? 1 : 0, duration: show ? 0.25 : 0.35, ease: "power2.out", overwrite: "auto" });
    }

    // press: shrink, ripple, squeeze the drag disc
    if (pointer.down !== down) {
      down = pointer.down;
      still = 0;
      gsap.to(
        look,
        down
          ? { press: 0.8, duration: 0.14, ease: "power2.out", overwrite: "auto" }
          : { press: 1, duration: reduced ? 0.14 : 0.6, ease: reduced ? "power2.out" : "elastic.out(1, 0.4)", overwrite: "auto" },
      );
      if (down && shown && !reduced) burst(px, py);
      disc.toggleAttribute("data-down", down);
      if (kind === "drag") applyLook();
    }

    // scroll: content slides under a still pointer → re-probe; a fast scroll → capsule indicator
    const v = lenis?.velocity ?? 0;
    const busy = Boolean(lenis?.isScrolling);
    if (busy || px !== lastX || py !== lastY) still = 0;
    lastX = px;
    lastY = py;
    if ((busy && now - probeAt > 120) || (wasBusy && !busy) || (host && !host.isConnected)) probe();
    wasBusy = busy;
    if (reduced || chaos || kind !== "default") scrolling = false;
    else if (Math.abs(v) > 14) {
      scrolling = true;
      calmAt = 0;
    } else if (scrolling && Math.abs(v) < 2) {
      if (!calmAt) calmAt = now;
      else if (now - calmAt > 220) scrolling = false;
    }
    sdy += ((scrolling ? clamp(v * 0.3, -8, 8) : 0) - sdy) * Math.min(1, 0.22 * dr);

    // ring target for this kind
    let tx = px;
    let ty = py;
    let tw = RING;
    let th = RING;
    let tr = RING / 2;
    let b: DOMRect | null = null;
    if (kind === "hover" && host && wrap && !chaos) {
      if (!box || still < 10 || still % 20 === 0) {
        const n = host.getBoundingClientRect();
        still = box && n.x === box.x && n.y === box.y && n.width === box.width && n.height === box.height ? still + 1 : 0;
        box = n;
      } else still++;
      b = box;
    }
    // the wrapped control vanished under a still pointer (display: none) — don't fly to its 0,0 rect
    if (b && !b.width && !b.height) probe();
    if (b && (b.width || b.height)) {
      tx = b.left + b.width / 2;
      ty = b.top + b.height / 2;
      tw = b.width + PAD * 2;
      th = b.height + PAD * 2;
      tr = Math.min(radius + PAD, tw / 2, th / 2);
    } else if (kind === "hover") {
      tw = th = 64;
      tr = 32;
    } else if (isDisc(kind)) {
      tw = th = size;
      tr = size / 2;
    } else if (kind === "text") {
      tw = th = 6;
      tr = 3;
    } else if (scrolling) {
      tw = 18;
      th = 32;
      tr = 9;
    }
    aim(tx, ty, tw, th, tr);

    // velocity stretch (free-floating default cursor only)
    const free = !reduced && !chaos && kind === "default" && !scrolling;
    const s = free ? Math.min(pointer.speed / 70, 1) * 0.42 : 0;
    const a = s > 0.01 ? r2(Math.atan2(pointer.vy, pointer.vx) * DEG) : 0;
    const p = look.press;

    put(ring, "transform", `translate3d(${r2(pos.x - pos.w / 2)}px,${r2(pos.y - pos.h / 2)}px,0) rotate(${a}deg) scale(${r2((1 + s) * p)},${r2((1 - s * 0.55) * p)})`);
    put(ring, "width", `${r2(pos.w)}px`);
    put(ring, "height", `${r2(pos.h)}px`);
    put(ring, "borderRadius", `${r2(pos.r)}px`);
    put(ring, "opacity", `${r2(look.ring * look.alpha)}`); // its own opacity overrides the layer's --cur-a
    const ds = look.dot * p;
    put(dot, "transform", `translate3d(${r2(px - 3)}px,${r2(py - 3 + sdy)}px,0) rotate(${a}deg) scale(${r2(ds * (1 + s * 1.3))},${r2(ds * (1 - s * 0.5))})`);
    put(beam, "transform", look.beam > 0.005 ? `translate3d(${r2(px - 0.75)}px,${r2(py - beamH / 2)}px,0) scaleY(${r2(look.beam)})` : OFF);

    // disc: rides the lagged ring position, swings with horizontal speed, its dial rolls
    if (look.disc > 0.005) {
      tilt += ((reduced ? 0 : clamp(pointer.vx * 0.8, -10, 10)) - tilt) * Math.min(1, 0.14 * dr);
      const k = look.disc * p;
      put(disc, "transform", `translate3d(${r2(pos.x - size / 2)}px,${r2(pos.y - size / 2)}px,0) rotate(${r2(tilt)}deg) scale(${r2(k * look.sx)},${r2(k * look.sy)})`);
      if (!reduced) {
        turn = (turn + (0.15 + pointer.vx * 0.5) * dr) % 360;
        put(dial, "transform", `rotate(${r2(turn)}deg)`);
      }
    } else put(disc, "transform", OFF);

    // chaos glyph + ghost trail
    if (look.glyph > 0.005) {
      if (!reduced && now - swapAt > (pointer.speed > 1.5 ? 110 : 520)) {
        swapAt = now;
        gi = (gi + 1) % GLYPHS.length;
        glyph.textContent = GLYPHS[gi];
      }
      if (!reduced) spin = (spin + (1.2 + pointer.speed * 0.9) * dr) % 360;
      put(glyph, "transform", `translate3d(${r2(px - 12)}px,${r2(py - 12)}px,0) rotate(${r2(spin)}deg) scale(${r2(look.glyph * p)})`);
    } else put(glyph, "transform", OFF);
    head = (head + 1) % HIST;
    hist[head].x = px;
    hist[head].y = py;
    hist[head].g = gi;
    ghosts.forEach((el, i) => {
      const h = hist[(head - (i + 1) * 4 + HIST * 2) % HIST];
      const o = chaos && !reduced ? Math.min(look.glyph, 1) * (0.55 - i * 0.09) * Math.min(1, Math.hypot(h.x - px, h.y - py) / 10) : 0;
      put(el, "opacity", `${r2(o)}`);
      if (o <= 0) return;
      if (ghostG[i] !== h.g) {
        ghostG[i] = h.g;
        el.textContent = GLYPHS[h.g];
      }
      put(el, "transform", `translate3d(${r2(h.x - 12)}px,${r2(h.y - 12)}px,0) rotate(${r2(spin - (i + 1) * 24)}deg) scale(${r2(0.9 - i * 0.12)})`);
    });

    const alpha = `${r2(look.alpha)}`;
    if (alpha !== blendAlpha) {
      blendAlpha = alpha;
      blend.style.setProperty("--cur-a", alpha); // the blend layer is box-less (cursor.css): fade its parts
    }
    put(solid, "opacity", alpha);
  };

  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerdown", onDown, { passive: true, capture: true });
  document.addEventListener("click", onClick, { passive: true, capture: true });
  window.addEventListener("resize", onResize);
  gsap.ticker.add(tick);
  probe();

  return {
    setMode(m) {
      chaos = m.chaos;
      reduced = m.reduced;
      if (chaos) glyph.textContent = GLYPHS[gi];
      setLag();
      applyLook();
    },
    probe,
    destroy() {
      gsap.ticker.remove(tick);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf([pos, look, ripple, label]);
      html.classList.remove("has-cursor");
    },
  };
}
