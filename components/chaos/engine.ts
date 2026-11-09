// Chaos engine: every chaos effect runs from ONE loop on the GSAP ticker (the same clock Lenis and
// ScrollTrigger use), reading all layout first and writing after, and does nothing while the tab is
// hidden. No React renders per frame — React only mounts the interactive fragments and keycaps.
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { emit, on, system } from "@/lib/system";
import { seeded } from "@/lib/utils";
import { site } from "@/data/site";
import type { Side } from "./slots";
import { kickType, measureType, restType, revertType, selfCheck, splitType, stepType, type Field, type TypeTarget } from "./kinetic";
import { createMover, restoreMover, stepEscape, stepMover, type Mover } from "./movers";
import { createPainter } from "./painter";
import { createSurge } from "./surge";

/** most chars we will split across a page (keeps the per-frame spring loop cheap) */
const CHAR_BUDGET = 1600;
const SURGE_MS = 450;
/** fragments enter one after another, by this share of the intensity ramp */
const STAGGER = 0.09;
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/_";
const TAU = Math.PI * 2;
/** what a fragment must not sit on: anything you read or press */
const CONTENT =
  "h1,h2,h3,h4,h5,h6,p,a,button,li,input,textarea,select,label,blockquote,figcaption,dt,dd,[data-cursor],[data-chaos-type]";
/** a fragment re-checks what is under it after this long (ms) even if nothing seems to have changed… */
const TUCK_AGE = 1500;
/** …or once its drift has carried it this far (px) from where it was last checked */
const TUCK_DRIFT = 14;

/** Is there content anywhere in the stack at (x, y)? (Bare section backgrounds and overlays are not.) */
function blocked(x: number, y: number) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === document.body || el === document.documentElement) break;
    if (el.closest("[data-chaos-layer]")) continue;
    if (el.closest(CONTENT)) return true;
    for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE && n.nodeValue?.trim()) return true;
  }
  return false;
}

/**
 * Objects on screen — canvases (the hero console renders pointer-events:none, invisible to hit
 * testing), video, images — minus full-bleed backdrops, which content sits on anyway.
 */
function mediaBoxes(vw: number, vh: number) {
  const out: DOMRect[] = [];
  document.querySelectorAll("main canvas, main video, main img").forEach((el) => {
    const r = el.getBoundingClientRect();
    const a = r.width * r.height;
    if (a > 2000 && a < vw * vh * 0.5 && r.bottom > 0 && r.top < vh) out.push(r);
  });
  return out;
}

/** Fixed chrome (nav, HUD, rail, world bar — the brief's view-transition names), minus the cursor. */
const CHROME = '[style*="view-transition-name"]:not([style*="site-cursor"])';
let chromeCache = { at: -1e9, boxes: [] as DOMRect[] };

/**
 * Chrome is often pointer-events:none, which elementsFromPoint can't see — so its text and marks are
 * collected as boxes (refreshed at most once a second; it is fixed, so scrolling doesn't move it).
 */
function chromeBoxes() {
  const now = performance.now();
  if (now - chromeCache.at < 1000) return chromeCache.boxes;
  const boxes: DOMRect[] = [];
  document.querySelectorAll<HTMLElement>(CHROME).forEach((root) => {
    if (root.closest("[data-chaos-layer]")) return;
    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const text = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue?.trim());
      if (!text && el.children.length) return; // a wrapper, not a mark
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.width * r.height < 40000) boxes.push(r);
    });
  });
  chromeCache = { at: now, boxes };
  return boxes;
}

/**
 * Where a fragment whose box is (l, t, w, h) may sit: 0 its slot is free · 1 content is there, so it
 * tucks into its edge and only a strip peeks in · 2 even that strip would land on something
 * (HUD corners, edge-to-edge type), so it leaves until there is room again. Nothing peeks out from
 * under the nav, and nothing peeks over a world's control bar (`bar`): those go straight to 2.
 *
 * Hit tests cost 0.2–1.7ms each on these pages (measured), so the cheap box lists are tried on every
 * point before any hit test, and the first hit ends the search.
 */
function tuckLevel(side: Side, l: number, t: number, w: number, h: number, peek: number, vw: number, vh: number, boxes: DOMRect[], bar: boolean) {
  const inBox = (x: number, y: number) => boxes.some((r) => x > r.left - 6 && x < r.right + 6 && y > r.top - 6 && y < r.bottom + 6);
  const free = (pts: number[][]) => {
    const on = pts.filter(([x, y]) => x >= 0 && y >= 0 && x < vw && y < vh);
    return !on.some(([x, y]) => inBox(x, y)) && !on.some(([x, y]) => blocked(x, y));
  };
  const mid = t + h / 2;
  // centre first (most often what is in the way), then the corners, then the quarters of a wide chip
  const slot = [[l + w / 2, mid], [l + 8, t + 6], [l + w - 8, t + 6], [l + 8, t + h - 6], [l + w - 8, t + h - 6]];
  if (w > 160) slot.push([l + w / 4, mid], [l + (w * 3) / 4, mid]);
  if (free(slot)) return 0;
  if (side === "top" || (side === "bottom" && bar)) return 2;
  const s = peek - 3; // inner edge of the strip, where it would meet content
  const strip =
    side === "left"
      ? [[s, t + 6], [s, t + h / 2], [s, t + h - 6]]
      : side === "right"
        ? [[vw - s, t + 6], [vw - s, t + h / 2], [vw - s, t + h - 6]]
        : [[l + 8, vh - s], [l + w / 2, vh - s], [l + w - 8, vh - s]];
  return free(strip) ? 1 : 2;
}

/**
 * How much of a tucked fragment still shows. A project chip tucked at the bottom shows only its index
 * line (a title sliced by the screen edge reads as a rendering bug); from the sides, its end with the arrow.
 */
const peekOf = (el: HTMLElement, side: Side) => (el.tagName !== "A" ? 18 : side === "bottom" ? 21 : 30);

/**
 * React marks every node it owns with a "__reactFiber$…" expando. Server HTML still waiting to hydrate
 * (a suspended boundary on a reload with chaos already on) has none yet — splitting or styling it would
 * trip a hydration mismatch, so it waits for the next scan.
 */
const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));

/** Reduced motion: no loop, no animation — the stickers simply step aside when content is under them. */
export function stillTuck(layer: HTMLElement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const els = Array.from(layer.querySelectorAll<HTMLElement>("[data-cx-frag]"));
  for (const el of els) el.style.transform = "";
  const boxes = chromeBoxes().concat(mediaBoxes(vw, vh));
  const bar = !!system.get().world;
  const moves = els.map((el) => {
    if (el.contains(document.activeElement)) return ""; // focused: stays in view
    const side = (el.dataset.cxFrag as Side | undefined) ?? "left";
    const r = el.getBoundingClientRect();
    const peek = peekOf(el, side);
    const level = tuckLevel(side, r.left, r.top, r.width, r.height, peek, vw, vh, boxes, bar);
    if (!level) return "";
    const gone = level === 2;
    if (side === "left") return `translateX(${-(gone ? r.right + 16 : r.right - peek)}px)`;
    if (side === "right") return `translateX(${gone ? vw - r.left + 16 : vw - r.left - peek}px)`;
    if (side === "bottom") return `translateY(${gone ? vh - r.top + 16 : vh - r.top - peek}px)`;
    return `translateY(${-(r.bottom + 16)}px)`;
  });
  els.forEach((el, i) => (el.style.transform = moves[i]));
}

interface Frag {
  el: HTMLElement;
  side: Side;
  i: number;
  project: boolean;
  /** px still showing when tucked (peekOf) */
  peek: number;
  /** its CSS tilt (--rot, deg): a tab tucked at the bottom is levelled against it */
  rot: number;
  /** untransformed layout box inside the fixed layer (= viewport px) */
  ox: number;
  oy: number;
  w: number;
  h: number;
  clock: number;
  f1: number;
  f2: number;
  f3: number;
  p: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  hold: boolean;
  /** 0 at its slot · 1 slid into its edge, a strip peeking · 2 gone past the edge (see tuckLevel) */
  tuck: number;
  tuckTo: number;
  /** what the last tuck check saw: time, scroll, drift offset, page epoch (see readTuck) */
  chkAt: number;
  chkScroll: number;
  chkX: number;
  chkY: number;
  chkEpoch: number;
  shown: boolean;
  live: boolean;
  off: () => void;
}

export interface Engine {
  /** power surge + ramp everything in */
  enter(): void;
  /** boot sequence is playing: stay dark until it's done */
  hold(): void;
  /** settle everything with one ease, restore the page, then call done */
  exit(done: () => void): void;
  /** theme or world changed: re-read the ground colour */
  ground(): void;
  fragments(els: HTMLElement[]): void;
  rescan(): void;
  bang(x: number, y: number): void;
  destroy(): void;
}

export function createEngine(layer: HTMLElement, coarse: boolean): Engine {
  if (process.env.NODE_ENV !== "production") selfCheck();

  const painter = createPainter(coarse);
  const surge = createSurge();
  layer.before(painter.canvas); // under the fragments
  layer.after(...surge.nodes); // over everything of ours

  const types = new Map<HTMLElement, TypeTarget>();
  const movers = new Map<HTMLElement, Mover>();
  const typeBoxes: (DOMRect | null)[] = [];
  let frags: Frag[] = [];
  const st = { amp: 0 };
  let ampTween: gsap.core.Tween | null = null;
  let scanDue = true;
  let fragsDirty = true;
  let dead = false;
  let last = performance.now();
  let surgeAt = -1;
  let glitchAt = last + 3500;
  let glitchEl: Element | null = null;
  let glitchEnd = 0;
  let signalAt = last + 6000;
  let signalIdx = 3;
  /** check every fragment on the next frame (entering, re-registered) instead of one per frame */
  let checkAll = true;
  /** …and jump straight to the result instead of easing there */
  let snapTuck = true;
  /** round-robin cursor for the one-per-frame tuck check */
  let rr = 0;
  /** bumped when elements come or go (or the viewport resizes): what is under a fragment may have moved */
  let epoch = 0;
  /** some opt-ins were still dehydrated at the last scan: look again at this time */
  let retryAt = 0;
  let scannedAt = -1e9;
  /** exit finished and the page is restored: nothing to do until chaos comes back */
  let calmed = false;

  // ── watch the page: new/removed opt-ins, and React rewriting text we split ──
  const hasElement = (nodes: NodeList) => {
    for (const n of nodes) if (n.nodeType === Node.ELEMENT_NODE) return true;
    return false;
  };
  const mo = new MutationObserver((records) => {
    const now = performance.now();
    for (const r of records) {
      const el = r.target instanceof Element ? r.target : r.target.parentElement;
      if (!el || el.closest("[data-chaos-layer]")) continue;
      // Elements coming or going can bring opt-ins and move content under the fragments. Text-only
      // churn can't (the HUD rewrites its readouts every frame — that must not re-scan the page).
      if (r.type === "attributes" || hasElement(r.addedNodes) || hasElement(r.removedNodes)) {
        scanDue = true;
        epoch++;
      }
      const host = el.closest<HTMLElement>("[data-chaos-type]");
      const t = host ? types.get(host) : undefined;
      if (!t) continue;
      // put the heading back to pure React content right away (before paint), re-split when quiet
      if (!t.stale) revertType(t);
      t.stale = now;
    }
    mo.takeRecords();
  });
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-chaos-type", "data-chaos-drift", "data-chaos-escape"],
  });

  function charsInUse() {
    let n = 0;
    for (const t of types.values()) n += t.chars.length;
    return n;
  }

  function scan() {
    scanDue = false;
    const main = document.getElementById("main") ?? document.querySelector("main");
    const seen = new Set<HTMLElement>();
    main?.querySelectorAll<HTMLElement>("[data-chaos-type]").forEach((el) => {
      if (!el.parentElement?.closest("[data-chaos-type]")) seen.add(el);
    });
    for (const [el, t] of types) {
      if (seen.has(el) && el.isConnected) continue;
      revertType(t);
      types.delete(el);
    }
    let used = charsInUse();
    let waiting = false;
    for (const el of seen) {
      if (types.has(el)) continue;
      if (!hydrated(el)) {
        waiting = true;
        continue;
      }
      const t = splitType(el, CHAR_BUDGET - used);
      if (!t) continue;
      types.set(el, t);
      used += t.chars.length;
    }

    const live = new Set<HTMLElement>();
    document.querySelectorAll<HTMLElement>("[data-chaos-drift],[data-chaos-escape]").forEach((el) => {
      if (el.closest("[data-chaos-layer]")) return;
      live.add(el);
      if (movers.has(el)) return;
      if (hydrated(el)) movers.set(el, createMover(el));
      else waiting = true;
    });
    retryAt = waiting ? performance.now() + 250 : 0;
    for (const [el, m] of movers) {
      if (live.has(el)) continue;
      restoreMover(m);
      movers.delete(el);
    }
    mo.takeRecords();
  }

  function resplit(now: number) {
    let touched = false;
    for (const [el, t] of types) {
      if (!t.stale || now - t.stale < 160) continue;
      touched = true;
      const fresh = el.isConnected ? splitType(el, CHAR_BUDGET - charsInUse()) : null;
      if (fresh) types.set(el, fresh);
      else types.delete(el); // empty for now — the next mutation brings it back via scan()
    }
    if (touched) mo.takeRecords();
  }

  function pickHeading(vh: number) {
    const vis: Element[] = [];
    document.querySelectorAll("main h1, main h2, main h3, main [data-chaos-type]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < vh) vis.push(el);
    });
    return vis.length ? vis[Math.floor(Math.random() * vis.length)] : null;
  }

  // ── fragments ──
  function readFrags() {
    fragsDirty = false;
    for (const f of frags) {
      f.ox = f.el.offsetLeft;
      f.oy = f.el.offsetTop;
      f.w = f.el.offsetWidth;
      f.h = f.el.offsetHeight;
    }
  }

  /** Has anything that decides this fragment's tuck changed since it was last checked? */
  const due = (f: Frag, now: number, sy: number) =>
    now - f.chkAt > TUCK_AGE || Math.abs(sy - f.chkScroll) > 2 || f.chkEpoch !== epoch || Math.abs(f.x - f.chkX) + Math.abs(f.y - f.chkY) > TUCK_DRIFT;

  /**
   * Re-decide where fragments may sit (from the slot, ignoring the current tuck). Hit tests are the
   * most expensive thing the engine does, so a running page checks at most ONE due fragment per frame
   * (round-robin; while scrolling each is re-checked every ~8 frames) and skips fragments whose
   * scroll, drift and page are unchanged. Entering / re-registering checks them all once.
   */
  function readTuck(now: number, vw: number, vh: number) {
    const sy = window.scrollY;
    const bar = !!system.get().world;
    const n = frags.length;
    let boxes: DOMRect[] | null = null;
    for (let k = 0; k < n; k++) {
      const f = frags[(rr + k) % n];
      if (f.hold) {
        f.tuckTo = 0; // hovering the peeking strip pulls it back out
        continue;
      }
      if (!checkAll && !due(f, now, sy)) continue;
      boxes ??= chromeBoxes().concat(mediaBoxes(vw, vh));
      const upright = f.side === "left" || f.side === "right";
      const l = (upright ? f.ox : f.ox - f.w / 2) + f.x;
      const t = (upright ? f.oy - f.h / 2 : f.oy) + f.y;
      f.tuckTo = tuckLevel(f.side, l, t, f.w, f.h, f.peek, vw, vh, boxes, bar);
      if (snapTuck) f.tuck = f.tuckTo; // entering: fly straight to the peek, don't land then retreat
      f.chkAt = now;
      f.chkScroll = sy;
      f.chkX = f.x;
      f.chkY = f.y;
      f.chkEpoch = epoch;
      if (!checkAll) {
        rr = (rr + k + 1) % n;
        break;
      }
    }
    checkAll = snapTuck = false;
  }

  function stepFrags(dt: number, amp: number, hover: boolean, vw: number, vh: number) {
    const n = frags.length;
    for (const f of frags) {
      const pres = Math.min(1, Math.max(0, amp * (1 + n * STAGGER) - f.i * STAGGER));
      if (!f.hold) f.clock += dt / 60;
      const along = Math.sin(f.clock * f.f1 + f.p) * 22 + Math.sin(f.clock * f.f3 + f.p * 2) * 6;
      const across = Math.sin(f.clock * f.f2 + f.p * 1.3) * 6;
      const upright = f.side === "left" || f.side === "right";
      let tx = upright ? across : along;
      let ty = upright ? along : across;
      if (hover) {
        // signals shy away from the cursor, project chips lean in a little
        const cx = (upright ? f.ox + f.w / 2 : f.ox) + f.x;
        const cy = (upright ? f.oy : f.oy + f.h / 2) + f.y;
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 170) {
          const k = (1 - d / 170) ** 2 * (f.project ? -10 : 42);
          tx += (dx / d) * k;
          ty += (dy / d) * k;
        }
      }
      f.vx += ((tx - f.x) * 0.08 - f.vx * 0.22) * dt;
      f.vy += ((ty - f.y) * 0.08 - f.vy * 0.22) * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.s += ((f.hold ? 1.05 : 1) - f.s) * Math.min(1, 0.2 * dt);

      // presence 0 = parked just beyond its own screen edge; tuck 1 = only a strip still peeking in,
      // tuck 2 = gone past the edge
      const out = 1 - pres;
      f.tuck += (f.tuckTo - f.tuck) * Math.min(1, 0.1 * dt);
      const peek = f.peek;
      const t1 = Math.min(f.tuck, 1);
      const t2 = Math.max(f.tuck - 1, 0) * (peek + 16);
      const ex =
        f.side === "left"
          ? -(f.ox + f.w + 40) * out - ((f.ox + f.w - peek) * t1 + t2) * pres
          : f.side === "right"
            ? (vw - f.ox + 40) * out + ((vw - f.ox - peek) * t1 + t2) * pres
            : 0;
      const ey =
        f.side === "top"
          ? -(f.oy + f.h + 40) * Math.max(out, Math.min(f.tuck, 1))
          : f.side === "bottom"
            ? (vh - f.oy + 40) * out + ((vh - f.oy - peek) * t1 + t2) * pres
            : 0;
      // a tab tucked at the bottom sits level, so the strip that shows is one clean line
      const level = f.side === "bottom" ? t1 * pres : 0;
      const r = (Math.sin(f.clock * f.f2 + f.p) * 1.5 + out * (f.side === "left" || f.side === "bottom" ? -18 : 18)) * (1 - level) - f.rot * level;
      f.el.style.transform = `translate3d(${(f.x * pres + ex).toFixed(1)}px,${(f.y * pres + ey).toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${f.s.toFixed(3)})`;
      const shown = pres > 0.002;
      if (shown !== f.shown) {
        f.shown = shown;
        f.el.style.visibility = shown ? "visible" : "hidden";
      }
      const live = pres > 0.6;
      if (live !== f.live) {
        f.live = live;
        f.el.style.pointerEvents = live ? "" : "none";
      }
    }
  }

  function cycleSignal(now: number) {
    signalAt = now + 5500 + Math.random() * 3500;
    const els = layer.querySelectorAll<HTMLElement>("[data-cx-scramble]");
    if (!els.length) return;
    const el = els[Math.floor(Math.random() * els.length)];
    const showing = new Set(Array.from(els, (e) => e.textContent));
    let text = "";
    for (let k = 0; k < site.signals.length && (!text || showing.has(text)); k++) text = site.signals[signalIdx++ % site.signals.length];
    if (showing.has(text)) return;
    gsap.to(el, {
      duration: 0.8,
      ease: "none",
      scrambleText: { text, chars: SCRAMBLE, speed: 0.6 },
      onComplete: () => {
        fragsDirty = true;
      },
    });
  }

  // ── the loop ──
  function tick() {
    if (dead || calmed || document.hidden) return;
    const now = performance.now();
    const dt = Math.min(now - last, 50) / 16.667;
    last = now;
    if ((scanDue || (retryAt && now > retryAt)) && now - scannedAt > 100) {
      scannedAt = now;
      scan();
    }
    resplit(now);
    const amp = st.amp;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hover = !coarse && pointer.inside;

    // read
    typeBoxes.length = 0;
    for (const t of types.values()) {
      if (!t.chars.length) {
        typeBoxes.push(null);
        continue;
      }
      const b = t.el.getBoundingClientRect();
      const vis = b.width > 0 && b.bottom > -40 && b.top < vh + 40 && b.right > -40 && b.left < vw + 40;
      typeBoxes.push(vis ? b : null);
      if (vis && (Math.abs(b.width - t.w) > 0.5 || Math.abs(b.height - t.h) > 0.5)) measureType(t, b);
    }
    if (fragsDirty) readFrags();
    readTuck(now, vw, vh);
    if (hover && amp > 0.95) {
      for (const m of movers.values()) {
        if (!m.esc) continue;
        const r = m.el.getBoundingClientRect();
        if (r.width && stepEscape(m, r, now, vw, vh)) painter.burst(r.left + r.width / 2, r.top + r.height / 2, 6);
      }
    }
    let pick: Element | null = null;
    if (!glitchEl && amp > 0.95 && now > glitchAt) {
      glitchAt = now + 3000 + Math.random() * 3000;
      pick = pickHeading(vh);
    }

    // write
    const field: Field = { x: pointer.x, y: pointer.y, hover: hover && amp > 0.01, now, dt, amp };
    let i = 0;
    for (const t of types.values()) {
      const b = typeBoxes[i++];
      if (b) stepType(t, b, field);
      else restType(t);
    }
    const secs = now / 1000;
    for (const m of movers.values()) stepMover(m, secs, amp);
    stepFrags(dt, amp, hover, vw, vh);
    painter.frame(now, dt, amp, pointer.x, pointer.y, hover, pointer.speed);

    if (glitchEl && now > glitchEnd) {
      glitchEl.classList.remove("cx-glitch");
      glitchEl = null;
    }
    if (pick) {
      pick.classList.add("cx-glitch");
      glitchEl = pick;
      glitchEnd = now + 120;
    }
    if (surgeAt >= 0) {
      const p = (now - surgeAt) / SURGE_MS;
      if (p >= 1) {
        surge.end();
        surgeAt = -1;
      } else surge.frame(p);
    }
    if (amp > 0.95 && now > signalAt) cycleSignal(now);
  }

  // ── input ──
  const burst = (x: number, y: number) => {
    if (dead || st.amp < 0.05) return;
    painter.burst(x, y, coarse ? 14 : 28);
    for (const t of types.values()) {
      if (!t.chars.length) continue;
      const b = t.el.getBoundingClientRect();
      if (b.bottom > -300 && b.top < window.innerHeight + 300) kickType(t, b, x, y);
    }
  };
  const offBurst = on<{ x: number; y: number } | undefined>("chaos:burst", (d) => {
    if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) burst(d.x, d.y);
  });
  const onClick = (e: MouseEvent) => {
    let x = e.clientX;
    let y = e.clientY;
    if (!e.detail && e.target instanceof Element) {
      // keyboard "click": burst from the control itself
      const r = e.target.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    burst(x, y);
  };
  const invalidate = () => {
    for (const t of types.values()) t.w = -1;
  };
  const onResize = () => {
    painter.resize();
    invalidate();
    fragsDirty = true;
    epoch++;
  };
  const onVisible = () => {
    last = performance.now();
    painter.reset();
  };
  window.addEventListener("click", onClick, true);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisible);
  document.fonts?.addEventListener("loadingdone", invalidate);
  gsap.ticker.add(tick);

  function endSurge() {
    if (surgeAt < 0) return;
    surgeAt = -1;
    surge.end();
  }

  /** Put the page back exactly as it was. The engine stays usable (enter() re-splits). */
  function calm() {
    endSurge();
    for (const t of types.values()) revertType(t);
    types.clear();
    for (const m of movers.values()) restoreMover(m);
    movers.clear();
    glitchEl?.classList.remove("cx-glitch");
    glitchEl = null;
    painter.clear();
    calmed = true; // the loop idles until enter() / hold()
    mo.takeRecords();
  }

  return {
    enter() {
      ampTween?.kill();
      calmed = false;
      invalidate();
      scanDue = true;
      fragsDirty = true;
      checkAll = snapTuck = true;
      surge.start();
      surgeAt = performance.now();
      glitchAt = surgeAt + 2500;
      ampTween = gsap.to(st, { amp: 1, duration: 1.2, ease: "expo.out" });
    },
    hold() {
      ampTween?.kill();
      calmed = false;
      scanDue = true;
      st.amp = 0;
      endSurge();
    },
    exit(done) {
      endSurge();
      ampTween?.kill();
      ampTween = gsap.to(st, {
        amp: 0,
        duration: 0.7,
        ease: "power3.inOut",
        onComplete: () => {
          calm();
          done();
        },
      });
    },
    ground() {
      const cs = getComputedStyle(document.documentElement);
      const bg = (system.get().world && cs.getPropertyValue("--world-bg").trim()) || cs.getPropertyValue("--bg").trim() || "#f2eee7";
      painter.setGround(painter.luma(bg) < 0.45);
    },
    fragments(els) {
      // Re-registered when the set changes (a world opens, the layout goes compact). Chips that are
      // still there keep their motion — no jump; new ones on a running page start parked past their
      // edge and slide in once their spot has been checked.
      const prev = new Map(frags.map((f) => [f.el, f] as const));
      for (const f of frags) f.off();
      const running = st.amp >= 0.05;
      frags = els.map((el, i) => {
        const side = (el.dataset.cxFrag as Side | undefined) ?? "left";
        const rot = parseFloat(el.style.getPropertyValue("--rot")) || 0;
        const old = prev.get(el);
        const s = i * 13 + 5;
        const f: Frag =
          old && old.side === side
            ? { ...old, i, rot, chkAt: -1e9 }
            : {
                el,
                side,
                i,
                project: el.tagName === "A",
                peek: peekOf(el, side),
                rot,
                ox: 0,
                oy: 0,
                w: 0,
                h: 0,
                clock: seeded(s) * 50,
                f1: 0.25 + seeded(s + 1) * 0.25,
                f2: 0.4 + seeded(s + 2) * 0.3,
                f3: 0.7 + seeded(s + 3) * 0.4,
                p: seeded(s + 4) * TAU,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                s: 1,
                hold: false,
                tuck: running ? 2 : 0,
                tuckTo: running ? 2 : 0,
                chkAt: -1e9,
                chkScroll: 0,
                chkX: 0,
                chkY: 0,
                chkEpoch: -1,
                shown: false,
                live: true,
                off: () => {},
              };
        const hold = () => {
          f.hold = true;
          f.tuckTo = 0;
          play("tick");
        };
        const free = () => {
          f.hold = false;
        };
        el.addEventListener("pointerenter", hold);
        el.addEventListener("pointerleave", free);
        el.addEventListener("focusin", hold);
        el.addEventListener("focusout", free);
        f.off = () => {
          el.removeEventListener("pointerenter", hold);
          el.removeEventListener("pointerleave", free);
          el.removeEventListener("focusin", hold);
          el.removeEventListener("focusout", free);
        };
        return f;
      });
      // place them now (called from a layout effect) so nothing flashes at its CSS spot
      checkAll = true;
      snapTuck = !running;
      readFrags();
      stepFrags(0, st.amp, false, window.innerWidth, window.innerHeight);
    },
    rescan() {
      scanDue = true;
    },
    bang(x, y) {
      emit("chaos:burst", { x, y });
      play("glitch");
      glitchAt = 0;
    },
    destroy() {
      if (dead) return;
      dead = true;
      gsap.ticker.remove(tick);
      mo.disconnect();
      offBurst();
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      document.fonts?.removeEventListener("loadingdone", invalidate);
      ampTween?.kill();
      calm();
      gsap.killTweensOf(Array.from(layer.querySelectorAll("[data-cx-scramble]")));
      for (const f of frags) f.off();
      frags = [];
      painter.canvas.remove();
      for (const n of surge.nodes) n.remove();
    },
  };
}
