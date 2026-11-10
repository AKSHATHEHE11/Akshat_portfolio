// Shared, render-free state for the lab: mat geometry (document px), scroll, and the few facts
// toys tell each other (where the gravity well is, whether a bug hunt is running).
// Written by Playground (measure on resize, scroll from Lenis) and the toys; read inside tickers.
export const lab = {
  /** the mat's box in document px — measured on resize, never per frame */
  mat: { top: 0, left: 0, w: 0, h: 0 },
  scroll: 0,
  vw: 0,
  vh: 0,
  /** gravity well centre + radius in DOCUMENT px (bugs fall into it; subtract mat.left/top for mat-local) */
  well: null as null | { x: number; y: number; r: number },
  /** a bug hunt is running: clicks on the mat are swats, not stamps */
  hunting: false,
};

/** The part of the mat on screen and not under the fixed nav, in mat-local px. (The mat starts right
 *  under the nav, so the nav is mat.top tall: the first visible mat row is `scroll`.) */
export function visibleMat() {
  const { mat, scroll, vh } = lab;
  const top = Math.max(0, scroll);
  const bottom = Math.min(mat.h, scroll + vh - mat.top);
  return { x: 0, y: top, w: mat.w, h: Math.max(0, bottom - top) };
}

/** Viewport point → mat-local point. */
export function toMat(x: number, y: number) {
  return { x: x - lab.mat.left, y: y + lab.scroll - lab.mat.top };
}

/* Trig for markup that renders on the server AND in the browser (protractor, stamp prints, the well's
   sheet). Math.sin/cos/exp may differ in the last bit between Node and Chrome, and a rounded value on a
   boundary then breaks hydration; + − × ÷ are exactly rounded everywhere, so these are identical on
   both. Taylor series to x¹¹ on [−π/2, π/2]: error < 6e-8. */
export function sin(x: number) {
  x -= Math.PI * 2 * Math.floor(x / (Math.PI * 2) + 0.5);
  if (x > Math.PI / 2) x = Math.PI - x;
  else if (x < -Math.PI / 2) x = -Math.PI - x;
  const q = x * x;
  return x * (1 - (q / 6) * (1 - (q / 20) * (1 - (q / 42) * (1 - (q / 72) * (1 - q / 110)))));
}
export const cos = (x: number) => sin(x + Math.PI / 2);

/** Update an element's text without replacing its Text node (keeps layout untouched). */
export function setText(el: Element | null, value: string) {
  if (!el) return;
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) {
    if ((node as Text).data !== value) (node as Text).data = value;
  } else el.textContent = value;
}
