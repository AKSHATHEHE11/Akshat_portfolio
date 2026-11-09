// Shared guard for page-level keyboard shortcuts (work index 1–5 and "/", world shell ←/→/Esc).

const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
// Widgets that use arrow keys themselves. [data-arrows="local"] lets any feature opt out.
const ARROW_WIDGETS =
  "[role='slider'], [role='tablist'], [role='radiogroup'], [role='listbox'], [role='menu'], [role='menubar'], [role='grid'], [role='tree'], [role='spinbutton'], [data-arrows='local']";

/** True when a page shortcut must NOT fire: typing, modified keys, a modal is open, or (for arrows) focus is in an arrow-key widget. */
export function ignoreShortcut(e: KeyboardEvent, opts: { arrows?: boolean } = {}) {
  if (e.defaultPrevented || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return true;
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest(TYPING)) return true;
  if (opts.arrows && (e.shiftKey || t?.closest(ARROW_WIDGETS))) return true;
  return !!document.querySelector("dialog[open], [aria-modal='true']");
}
