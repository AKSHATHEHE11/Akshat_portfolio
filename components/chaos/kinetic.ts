// Kinetic type for [data-chaos-type]: letters split into chars and spring away from the cursor.
//
// Not SplitText on purpose: SplitText.revert() rewrites innerHTML, which swaps out DOM nodes React
// still owns — and chaos toggles on and off many times per visit. This splitter never removes a node
// it did not create: each text node stays where it is (emptied), its char spans sit right before it,
// and revert() takes out only what it inserted. React can keep updating or unmounting the heading.

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "SVG", "CANVAS", "CODE", "PRE", "NOSCRIPT"]);

const RADIUS = 130; // cursor influence (px)
const PUSH = 14; // max displacement (px)
const TILT = 9; // max rotation (deg)
const K = 0.1; // spring stiffness, per 60fps frame
const D = 0.26; // damping
/** Letters inside another component's line mask (reveal clips) mostly slide sideways instead. */
const MASKED = 0.25;

/** Does anything between this text and the target clip vertically? */
function inMask(text: Text, el: HTMLElement) {
  for (let p = text.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY; // "" when detached (the dev self-check)
    if (o && o !== "visible") return true;
    if (p === el) break;
  }
  return false;
}

export interface Char {
  el: HTMLElement;
  /** home centre relative to the target's box */
  hx: number;
  hy: number;
  /** vertical + tilt scale: 1, or MASKED inside a line mask (an overflow clip would slice the letter) */
  m: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  vr: number;
  /** last written (already multiplied by the global intensity) */
  wx: number;
  wy: number;
  wr: number;
  twitch: number;
}

interface Piece {
  text: Text;
  original: string;
  nodes: ChildNode[];
}

export interface TypeTarget {
  el: HTMLElement;
  pieces: Piece[];
  chars: Char[];
  /** box size at the last measure; -1 forces a re-measure */
  w: number;
  h: number;
  /** heading we gave an aria-label (so revert must remove it) */
  labelled: HTMLElement | null;
  /** content changed under us at this time → re-split once it has been quiet for a moment */
  stale: number;
}

export interface Field {
  x: number;
  y: number;
  hover: boolean;
  now: number;
  /** frames elapsed (1 = 16.7ms) */
  dt: number;
  /** global chaos intensity 0..1 */
  amp: number;
}

/** Split el's text into word + char spans, in place. Null when there is nothing (or too much) to split. */
export function splitType(el: HTMLElement, budget: number): TypeTarget | null {
  const texts: Text[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    if (!n.data.trim()) continue;
    let p = n.parentElement;
    while (p && p !== el && !SKIP.has(p.tagName.toUpperCase()) && !p.hasAttribute("data-chaos-type")) p = p.parentElement;
    if (p === el) texts.push(n);
  }
  let count = 0;
  for (const t of texts) count += t.data.replace(/\s+/g, "").length;
  if (!count || count > budget) return null;

  // Screen readers: label the heading once and hide the char soup (unless it holds links/buttons,
  // whose names would vanish with it).
  const heading = el.closest<HTMLElement>("h1,h2,h3,h4,h5,h6");
  let labelled: HTMLElement | null = null;
  let hide = false;
  if (heading && !heading.querySelector("a,button")) {
    if (!heading.hasAttribute("aria-label")) {
      heading.setAttribute("aria-label", (heading.textContent ?? "").replace(/\s+/g, " ").trim());
      heading.setAttribute("data-cx-label", "");
      labelled = heading;
    }
    hide = heading.hasAttribute("data-cx-label");
  }

  const t: TypeTarget = { el, pieces: [], chars: [], w: -1, h: -1, labelled, stale: 0 };
  for (const text of texts) {
    const nodes: ChildNode[] = [];
    const m = inMask(text, el) ? MASKED : 1;
    for (const token of text.data.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s/.test(token)) {
        nodes.push(document.createTextNode(token));
        continue;
      }
      // words stay unbreakable; chars are inline-blocks so they can take a transform
      const word = document.createElement("span");
      word.style.cssText = "display:inline-block;white-space:nowrap";
      if (hide) word.setAttribute("aria-hidden", "true");
      for (const ch of Array.from(token)) {
        const c = document.createElement("span");
        c.style.display = "inline-block";
        c.textContent = ch;
        word.append(c);
        t.chars.push({ el: c, hx: 0, hy: 0, m, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, wx: 0, wy: 0, wr: 0, twitch: 0 });
      }
      nodes.push(word);
    }
    t.pieces.push({ text, original: text.data, nodes });
    text.before(...nodes);
    text.data = "";
  }
  return t;
}

/** Undo splitType. Safe on half-detached targets (React may already have removed parts of it). */
export function revertType(t: TypeTarget) {
  for (const p of t.pieces) {
    for (const n of p.nodes) n.remove();
    // if React rewrote the text node meanwhile, its new value wins
    if (p.text.data === "") p.text.data = p.original;
  }
  if (t.labelled) {
    t.labelled.removeAttribute("aria-label");
    t.labelled.removeAttribute("data-cx-label");
  }
  t.pieces = [];
  t.chars = [];
  t.labelled = null;
}

/** Cache each char's home centre relative to the target box (reads only). */
export function measureType(t: TypeTarget, box: DOMRect) {
  t.w = box.width;
  t.h = box.height;
  for (const c of t.chars) {
    const b = c.el.getBoundingClientRect();
    c.hx = b.left + b.width / 2 - box.left - c.wx;
    c.hy = b.top + b.height / 2 - box.top - c.wy;
  }
}

/** One frame: repel from the cursor, spring home, occasionally twitch. */
export function stepType(t: TypeTarget, box: DOMRect, f: Field) {
  for (const c of t.chars) {
    let tx = 0;
    let ty = 0;
    let tr = 0;
    if (f.hover) {
      const dx = box.left + c.hx - f.x;
      const dy = box.top + c.hy - f.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < RADIUS * RADIUS) {
        const d = Math.sqrt(d2) || 1;
        const k = (1 - d / RADIUS) ** 2;
        tx = (dx / d) * PUSH * k;
        ty = (dy / d) * PUSH * k * c.m;
        tr = (dx / d) * TILT * k * c.m;
      }
    }
    // the slow jitter: every few seconds a letter flinches on its own
    if (f.now > c.twitch) {
      if (c.twitch) {
        c.vx += (Math.random() - 0.5) * 2.4;
        c.vy += (Math.random() - 0.5) * 1.6 * c.m;
        c.vr += (Math.random() - 0.5) * 6 * c.m;
      }
      c.twitch = f.now + 1400 + Math.random() * 5200;
    }
    c.vx += ((tx - c.x) * K - c.vx * D) * f.dt;
    c.vy += ((ty - c.y) * K - c.vy * D) * f.dt;
    c.vr += ((tr - c.r) * K - c.vr * D) * f.dt;
    c.x += c.vx * f.dt;
    c.y += c.vy * f.dt;
    c.r += c.vr * f.dt;
    write(c, f.amp);
  }
}

/** Off-screen: drop any displacement at once (no point simulating what nobody sees). */
export function restType(t: TypeTarget) {
  for (const c of t.chars) {
    if (!c.wx && !c.wy && !c.wr) continue;
    c.x = c.y = c.r = c.vx = c.vy = c.vr = 0;
    write(c, 1);
  }
}

/** Shockwave from a burst: letters near (x, y) get flung, then spring back. */
export function kickType(t: TypeTarget, box: DOMRect, x: number, y: number) {
  for (const c of t.chars) {
    const dx = box.left + c.hx - x;
    const dy = box.top + c.hy - y;
    const d = Math.hypot(dx, dy);
    if (d > 280) continue;
    const k = 1 - d / 280;
    const n = d || 1;
    c.vx += (dx / n) * k * 6;
    c.vy += (dy / n) * k * 6 * c.m;
    c.vr += (dx / n) * k * 12 * c.m;
  }
}

function write(c: Char, amp: number) {
  const x = c.x * amp;
  const y = c.y * amp;
  const r = c.r * amp;
  if (Math.abs(x - c.wx) < 0.04 && Math.abs(y - c.wy) < 0.04 && Math.abs(r - c.wr) < 0.06) return;
  const zero = Math.abs(x) < 0.04 && Math.abs(y) < 0.04 && Math.abs(r) < 0.06;
  c.wx = zero ? 0 : x;
  c.wy = zero ? 0 : y;
  c.wr = zero ? 0 : r;
  c.el.style.transform = zero ? "" : `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
}

/** Dev-only check, run when the engine starts: split → revert must leave the DOM exactly as it was. */
export function selfCheck() {
  const h = document.createElement("h2");
  h.innerHTML = "Selected <em>Works</em>&nbsp;and <code>x</code> more";
  const before = h.outerHTML;
  const text = h.textContent;
  const t = splitType(h, 99);
  const splitOk = !!t && t.chars.length === 20 && h.textContent === text && h.getAttribute("aria-label") === "Selected Works and x more";
  if (t) revertType(t);
  if (!splitOk || h.outerHTML !== before) {
    console.error("[chaos] kinetic split/revert round-trip failed", { before, after: h.outerHTML, splitOk });
  }
}
