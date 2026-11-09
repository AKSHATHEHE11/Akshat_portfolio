"use client";
// The Fybr8 store's state: filters, chosen colours, quick view, bag, three-tap checkout.
// Shared by the cover rack, the lookbook credits and the store itself (they all sell the same clothes).
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type Dispatch, type ReactNode, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { emit, system } from "@/lib/system";
import { play } from "@/lib/sound";
import { money as fmt } from "../kit";
import type { Category, FashionScene, Product } from "../scene";
import { flyToBag } from "./fly";

export type Filter = "all" | Category;
export type Tab = "shop" | "fit";
export type Step = "bag" | "pay" | "placed";

export interface BagLine {
  key: string;
  id: string;
  colour: number;
  size: string;
  qty: number;
}

interface State {
  filter: Filter;
  tab: Tab;
  /** chosen colour per product — the grid, the quick view and the lookbook share it */
  colours: Record<string, number>;
  quick: { id: string; size: string | null } | null;
  bag: BagLine[];
  bagOpen: boolean;
  step: Step;
  /** first add-to-bag, for the visitor's own time-to-checkout */
  startedAt: number | null;
  placed: { number: string; seconds: number } | null;
  /** bumps every time a garment lands in the bag */
  landed: number;
}

type Action =
  | { type: "filter"; filter: Filter }
  | { type: "tab"; tab: Tab }
  | { type: "colour"; id: string; colour: number }
  | { type: "quick"; id: string | null; size?: string | null; colour?: number }
  | { type: "add"; id: string; colour: number; size: string; at: number }
  | { type: "qty"; key: string; delta: number }
  | { type: "bag"; open: boolean }
  | { type: "step"; step: Step }
  | { type: "place"; number: string; at: number }
  | { type: "reset" }
  | { type: "landed" };

const initial: State = {
  filter: "all",
  tab: "shop",
  colours: {},
  quick: null,
  bag: [],
  bagOpen: false,
  step: "bag",
  startedAt: null,
  placed: null,
  landed: 0,
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "filter":
      return { ...s, filter: a.filter };
    case "tab":
      return { ...s, tab: a.tab };
    case "colour":
      return { ...s, colours: { ...s.colours, [a.id]: a.colour } };
    case "quick":
      if (!a.id) return { ...s, quick: null };
      return {
        ...s,
        quick: { id: a.id, size: a.size ?? null },
        colours: a.colour === undefined ? s.colours : { ...s.colours, [a.id]: a.colour },
      };
    case "add": {
      const key = `${a.id}:${a.colour}:${a.size}`;
      const found = s.bag.some((l) => l.key === key);
      const bag = found
        ? s.bag.map((l) => (l.key === key ? { ...l, qty: Math.min(9, l.qty + 1) } : l))
        : [...s.bag, { key, id: a.id, colour: a.colour, size: a.size, qty: 1 }];
      return { ...s, bag, startedAt: s.startedAt ?? a.at, step: s.step === "placed" ? "bag" : s.step, placed: s.step === "placed" ? null : s.placed };
    }
    case "qty": {
      const bag = s.bag.map((l) => (l.key === a.key ? { ...l, qty: Math.min(9, l.qty + a.delta) } : l)).filter((l) => l.qty > 0);
      return { ...s, bag, startedAt: bag.length ? s.startedAt : null, step: bag.length ? s.step : "bag" };
    }
    case "bag":
      return { ...s, bagOpen: a.open, step: !a.open && s.step === "pay" ? "bag" : s.step };
    case "step":
      return { ...s, step: a.step };
    case "place":
      return {
        ...s,
        step: "placed",
        placed: { number: a.number, seconds: Math.max(1, Math.round((a.at - (s.startedAt ?? a.at)) / 1000)) },
      };
    case "reset":
      return { ...s, bag: [], step: "bag", placed: null, startedAt: null, bagOpen: false };
    case "landed":
      return { ...s, landed: s.landed + 1 };
  }
}

interface StoreApi {
  scene: FashionScene;
  state: State;
  dispatch: Dispatch<Action>;
  product: (id: string) => Product | undefined;
  colourOf: (id: string) => number;
  money: (n: number) => string;
  count: number;
  subtotal: number;
  bagRef: RefObject<HTMLButtonElement | null>;
  openQuick: (id: string, opts?: { colour?: number; size?: string | null }) => void;
  add: (p: Product, colour: number, size: string, source?: Element | null) => void;
  go: (target: "lookbook" | "preview" | "fit" | "process" | "outcome") => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}

export function StoreProvider({ scene, children }: { scene: FashionScene; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const bagRef = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();

  const byId = useMemo(() => new Map(scene.products.map((p) => [p.id, p])), [scene.products]);
  const product = useCallback((id: string) => byId.get(id), [byId]);
  const colourOf = useCallback((id: string) => state.colours[id] ?? 0, [state.colours]);
  const money = useCallback((n: number) => fmt(n, scene.store.currency, scene.store.locale), [scene.store.currency, scene.store.locale]);

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const l of state.bag) {
      c += l.qty;
      t += (byId.get(l.id)?.price ?? 0) * l.qty;
    }
    return { count: c, subtotal: t };
  }, [state.bag, byId]);

  const openQuick = useCallback((id: string, opts?: { colour?: number; size?: string | null }) => {
    play("open");
    dispatch({ type: "quick", id, colour: opts?.colour, size: opts?.size ?? null });
  }, []);

  const add = useCallback(
    (p: Product, colour: number, size: string, source?: Element | null) => {
      dispatch({ type: "add", id: p.id, colour, size, at: Date.now() });
      emit("toast", { text: `BAGGED — ${p.name.toUpperCase()} / ${p.colours[colour]?.name.toUpperCase()} / ${size}` });
      const land = () => {
        play("drop");
        dispatch({ type: "landed" });
      };
      if (!source || system.get().reducedMotion) return land();
      // let the bag button mount (it hides while the bag is empty) before measuring it
      requestAnimationFrame(() => {
        const target = bagRef.current;
        if (target) flyToBag(source, target, land);
        else land();
      });
    },
    [],
  );

  const go = useCallback<StoreApi["go"]>(
    (target) => {
      if (target === "fit") dispatch({ type: "tab", tab: "fit" });
      if (target === "preview") dispatch({ type: "tab", tab: "shop" });
      const id = target === "fit" ? "preview" : target;
      const el = document.getElementById(id);
      if (!el) return;
      // force: a closing dialog may still hold Lenis stopped for the length of its exit animation
      if (lenis) lenis.scrollTo(el, { offset: target === "fit" || target === "preview" ? -8 : 0, force: true });
      else el.scrollIntoView({ behavior: system.get().reducedMotion ? "auto" : "smooth" });
    },
    [lenis],
  );

  const api = useMemo<StoreApi>(
    () => ({ scene, state, dispatch, product, colourOf, money, count, subtotal, bagRef, openQuick, add, go }),
    [scene, state, product, colourOf, money, count, subtotal, openQuick, add, go],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
