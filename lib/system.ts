// Global "operating system" state: chaos, sound, theme, boot, secret mode, input capabilities.
// A tiny external store (no library): read it in React with useSystem(selector), anywhere else
// with system.get(). Every change is mirrored onto <html data-*> so CSS can react without JS:
//   data-theme="light|dark"  data-chaos="on|off"  data-sound="on|off"  data-secret="on|off"
//   data-booted="1|0"         data-world="<slug>|"
import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export interface SystemState {
  /** client has initialised (storage + media queries read). False during SSR/first paint. */
  ready: boolean;
  /** boot sequence finished or skipped this session */
  booted: boolean;
  chaos: boolean;
  sound: boolean;
  theme: Theme;
  /** easter-egg "dev vision" mode (triple-click the logo) */
  secret: boolean;
  /** prefers-reduced-motion: reduce */
  reducedMotion: boolean;
  /** touch / coarse pointer: no custom cursor, tap instead of hover */
  coarse: boolean;
  /** slug of the project world currently open, else null */
  world: string | null;
}

const KEY = {
  theme: "akshat:theme",
  sound: "akshat:sound",
  booted: "akshat:booted",
  chaos: "akshat:chaos",
} as const;

const initial: SystemState = {
  ready: false,
  booted: false,
  chaos: false,
  sound: false,
  theme: "light",
  secret: false,
  reducedMotion: false,
  coarse: false,
  world: null,
};

let state: SystemState = initial;
const listeners = new Set<() => void>();

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* storage can throw in private mode — state still works in memory */
  }
}

function mirror(s: SystemState) {
  if (typeof document === "undefined") return;
  const d = document.documentElement.dataset;
  d.theme = s.theme;
  d.chaos = s.chaos ? "on" : "off";
  d.sound = s.sound ? "on" : "off";
  d.secret = s.secret ? "on" : "off";
  d.booted = s.booted ? "1" : "0";
  d.world = s.world ?? "";
  safe(() => {
    localStorage.setItem(KEY.theme, s.theme);
    localStorage.setItem(KEY.sound, s.sound ? "on" : "off");
    sessionStorage.setItem(KEY.chaos, s.chaos ? "on" : "off");
    if (s.booted) sessionStorage.setItem(KEY.booted, "1");
  });
}

function set(patch: Partial<SystemState>) {
  const next = { ...state, ...patch };
  const changed = (Object.keys(patch) as (keyof SystemState)[]).some((k) => state[k] !== next[k]);
  if (!changed) return;
  state = next;
  if (state.ready) mirror(state);
  listeners.forEach((l) => l());
}

export const system = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set,

  /** Called once by <Providers>. Reads persisted prefs + media queries. Idempotent. */
  init() {
    if (state.ready || typeof window === "undefined") return;
    const read = (store: Storage, k: string) => {
      try {
        return store.getItem(k);
      } catch {
        return null;
      }
    };
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)");
    const storedTheme = read(localStorage, KEY.theme);
    const theme: Theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : document.documentElement.dataset.theme === "dark"
          ? "dark"
          : "light";
    rm.addEventListener("change", (e) => set({ reducedMotion: e.matches }));
    coarse.addEventListener("change", (e) => set({ coarse: e.matches }));
    set({
      ready: true,
      theme,
      sound: read(localStorage, KEY.sound) === "on",
      chaos: read(sessionStorage, KEY.chaos) === "on",
      booted: read(sessionStorage, KEY.booted) === "1",
      reducedMotion: rm.matches,
      coarse: coarse.matches,
    });
    mirror(state);
  },

  toggleChaos(force?: boolean) {
    set({ chaos: force ?? !state.chaos });
  },
  toggleSound(force?: boolean) {
    set({ sound: force ?? !state.sound });
  },
  toggleTheme(force?: Theme) {
    set({ theme: force ?? (state.theme === "dark" ? "light" : "dark") });
  },
  toggleSecret(force?: boolean) {
    set({ secret: force ?? !state.secret });
  },
  setWorld(slug: string | null) {
    set({ world: slug });
  },
  markBooted() {
    set({ booted: true });
  },
  /** Replays the boot sequence (used by RESTART EXPERIENCE). */
  replayBoot() {
    safe(() => sessionStorage.removeItem(KEY.booted));
    set({ booted: false });
    emit("boot:replay");
  },
};

/**
 * Subscribe a component to part of the system state.
 * The selector MUST return a primitive or a stable reference (never build a new object/array here).
 */
export function useSystem<T>(selector: (s: SystemState) => T): T {
  return useSyncExternalStore(
    system.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

/* ── tiny event bus for one-off cross-feature signals ───────────────────────
   Known events (add new ones to this list in docs/BRIEF.md when you introduce them):
   "boot:replay"     boot sequence should play again
   "chaos:burst"     detail {x,y} — something wants a burst of chaos at a point
   "restart"         ending → page should rewind to the top
   "toast"           detail {text} — show a transient system message (HUD renders it)
   "console:key"     detail {key} — a key on the hero console was pressed
   "menu:close"      the menu panel should close (silently), e.g. so the Lights ink can be seen
*/
const bus = typeof window !== "undefined" ? new EventTarget() : null;

export function emit<T = unknown>(type: string, detail?: T) {
  bus?.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on<T = unknown>(type: string, handler: (detail: T) => void) {
  if (!bus) return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<T>).detail);
  bus.addEventListener(type, fn);
  return () => bus.removeEventListener(type, fn);
}
