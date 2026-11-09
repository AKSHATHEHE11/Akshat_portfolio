// The five ways to browse the work index. Order = keyboard shortcut (1–5).
export const MODES = [
  { id: "grid", label: "Grid", short: "Grid" },
  { id: "list", label: "List", short: "List" },
  { id: "chaos", label: "Chaos", short: "Chaos" },
  { id: "timeline", label: "Timeline", short: "Time" },
  { id: "system", label: "System", short: "Sys" },
] as const;

export type Mode = (typeof MODES)[number]["id"];

const KEY = "akshat:work-mode";

/** The visitor's own choice this session (null = never chose). */
export function readMode(): Mode | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return MODES.some((m) => m.id === v) ? (v as Mode) : null;
  } catch {
    return null;
  }
}

export function saveMode(mode: Mode) {
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}
