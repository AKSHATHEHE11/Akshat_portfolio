"use client";
// The bag: lines with quantities, a free-shipping tape, totals, and the three-tap checkout
// (add → checkout → pay). It times the visitor against the store's real median.
import { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BEZIER, SPRING } from "@/lib/motion";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { pad } from "@/lib/utils";
import { Garment } from "../Garment";
import { mix } from "../kit";
import { useStore } from "./context";
import { useDialog } from "./useDialog";

export function BagDrawer() {
  const { state } = useStore();
  return <AnimatePresence>{state.bagOpen ? <Drawer key="bag" /> : null}</AnimatePresence>;
}

function Drawer() {
  const { state, dispatch, product, money, count, subtotal, scene, go } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    play("close");
    dispatch({ type: "bag", open: false });
  }, [dispatch]);
  useDialog(true, close, ref);

  const { freeShippingOver, shippingFee } = scene.store;
  const shipping = subtotal === 0 || subtotal >= freeShippingOver ? 0 : shippingFee;
  const total = subtotal + shipping;
  const toFree = Math.max(0, freeShippingOver - subtotal);
  const { checkout } = scene;

  const place = () => {
    const number = `${checkout.orderPrefix}-${pad(1000 + Math.floor(Math.random() * 9000), 4)}`;
    dispatch({ type: "place", number, at: Date.now() });
    play("success");
    emit("toast", { text: `ORDER ${number} PLACED — NOTHING SHIPS, IT'S A PORTFOLIO` });
  };

  return (
    <div data-swipe="local" className="fixed inset-0 z-[70]">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#14161c]/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fy-bag-title"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.6, ease: BEZIER.out }}
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-(--fy-paper) text-(--fy-fg) shadow-[-30px_0_60px_-30px_rgb(0_0_0/0.5)] sm:w-[440px]"
      >
        <header className="flex items-center justify-between border-b border-(--fy-fg)/15 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <h2 id="fy-bag-title" className="font-serif text-[2.2rem] italic leading-none">
            {state.step === "placed" ? "Placed." : state.step === "pay" ? "Checkout" : "Bag"}
            {state.step === "bag" ? <span className="ml-2 align-top font-mono text-[0.75rem] not-italic tabular-nums">{pad(count)}</span> : null}
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={close}
            aria-label="Close bag"
            data-cursor="hover"
            className="grid size-11 place-items-center rounded-full border border-(--fy-fg)/20 transition-colors hover:bg-(--fy-fg) hover:text-(--fy-paper)"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {state.step === "placed" && state.placed ? (
            <div className="flex h-full flex-col justify-center gap-5 pb-10">
              <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em]">Order {state.placed.number}</p>
              <p className="font-serif text-[clamp(2.4rem,2rem+2vw,3.4rem)] italic leading-[0.95]">
                You checked out in {state.placed.seconds} s.
              </p>
              <p className="text-[1rem] leading-relaxed">
                The store’s median is {checkout.medianSeconds} s.{" "}
                {state.placed.seconds <= checkout.medianSeconds ? "Faster than most — the three taps held up." : "Slower than most, but you were also reading a portfolio."}
              </p>
              <p className="text-[0.875rem] text-(--fy-muted)">
                {checkout.delivery} · {checkout.address}. Nothing will actually arrive; nobody was charged.
              </p>
            </div>
          ) : state.step === "pay" ? (
            <div className="space-y-3">
              {[
                { k: "Deliver to", v: checkout.address },
                { k: "Pay with", v: checkout.payment },
                { k: "Delivery", v: `${checkout.delivery} · ${shipping ? money(shipping) : "free"}` },
              ].map((row) => (
                <div key={row.k} className="flex items-start gap-3 rounded-[4px] border border-(--fy-fg)/15 p-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-(--fy-fg) text-(--fy-paper)">
                    <Check size={12} strokeWidth={3} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--fy-muted)">{row.k}</span>
                    <span className="block text-[0.9375rem]">{row.v}</span>
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[0.8125rem] text-(--fy-muted)">Saved from your last order. One tap left.</p>
            </div>
          ) : state.bag.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-center gap-5 pb-10">
              <p className="font-serif text-[2.4rem] italic leading-[0.95]">Nothing in here yet.</p>
              <p className="max-w-[30ch] text-[0.9375rem] text-(--fy-muted)">Pick a size on any piece — it’ll land here.</p>
              <Button
                variant="ghost"
                onClick={() => {
                  close();
                  go("preview");
                }}
              >
                Back to the store
              </Button>
            </div>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {state.bag.map((line) => {
                  const p = product(line.id);
                  if (!p) return null;
                  const col = p.colours[line.colour] ?? p.colours[0];
                  return (
                    <motion.li
                      key={line.key}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={SPRING.soft}
                      className="overflow-hidden border-b border-(--fy-fg)/12"
                    >
                      <div className="flex gap-4 py-4">
                        <div className="relative h-24 w-20 shrink-0 rounded-[3px]" style={{ background: mix(col.hex, "#e9e6df", 0.82) }}>
                          <Garment kind={p.kind} colour={col.hex} leg={p.leg} pocket={p.pocket} still className="absolute inset-[8%] size-[84%]" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-[0.9375rem] font-semibold">{p.name}</span>
                            <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums">{money(p.price * line.qty)}</span>
                          </div>
                          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-(--fy-muted)">
                            {col.name} · {line.size}
                          </span>
                          <div className="mt-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                play("click");
                                dispatch({ type: "qty", key: line.key, delta: -1 });
                              }}
                              aria-label={line.qty === 1 ? `Remove ${p.name}` : `One less ${p.name}`}
                              data-cursor="hover"
                              className="grid size-8 place-items-center rounded-[4px] border border-(--fy-fg)/20 hover:border-(--fy-fg) coarse:size-11"
                            >
                              {line.qty === 1 ? <X size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
                            </button>
                            <span className="w-8 text-center font-mono text-[0.875rem] tabular-nums" aria-label={`Quantity ${line.qty}`}>
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              disabled={line.qty >= 9}
                              onClick={() => {
                                play("click");
                                dispatch({ type: "qty", key: line.key, delta: 1 });
                              }}
                              aria-label={`One more ${p.name}`}
                              data-cursor="hover"
                              className="grid size-8 place-items-center rounded-[4px] border border-(--fy-fg)/20 hover:border-(--fy-fg) disabled:opacity-40 coarse:size-11"
                            >
                              <Plus size={13} aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {state.step !== "placed" && state.bag.length > 0 ? (
          <footer className="border-t border-(--fy-fg)/15 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            {state.step === "bag" ? (
              <div className="mb-4">
                <div className="flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
                  <span>{toFree ? `${money(toFree)} to free shipping` : "Free shipping unlocked"}</span>
                  <span className="text-(--fy-muted)">{money(freeShippingOver)}</span>
                </div>
                <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-[2px] bg-(--fy-fg)/10" aria-hidden>
                  <span
                    className="absolute inset-y-0 left-0 bg-(--fy-accent) transition-[width] duration-700 ease-out-expo"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingOver) * 100)}%` }}
                  />
                  <span className="absolute inset-0" style={{ backgroundImage: "linear-gradient(90deg, rgb(20 22 28 / .5) 1px, transparent 1px)", backgroundSize: "10% 100%" }} />
                </div>
              </div>
            ) : null}
            <dl className="space-y-1 text-[0.9375rem]">
              <div className="flex justify-between">
                <dt className="text-(--fy-muted)">Subtotal</dt>
                <dd className="font-mono tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-(--fy-muted)">Shipping</dt>
                <dd className="font-mono tabular-nums">{shipping ? money(shipping) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-(--fy-fg)/15 pt-2 text-[1.0625rem] font-semibold">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">{money(total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              {state.step === "bag" ? (
                <Button variant="ink" size="lg" magnetic={false} className="w-full" onClick={() => dispatch({ type: "step", step: "pay" })}>
                  Checkout — {money(total)}
                </Button>
              ) : (
                <>
                  <Button variant="accent" size="lg" magnetic={false} className="w-full" onClick={place}>
                    Pay {money(total)}
                  </Button>
                  <button type="button" onClick={() => dispatch({ type: "step", step: "bag" })} data-cursor="hover" className="py-1 text-[0.8125rem] underline underline-offset-4 coarse:min-h-11">
                    Back to bag
                  </button>
                </>
              )}
            </div>
          </footer>
        ) : null}

        {state.step === "placed" ? (
          <footer className="border-t border-(--fy-fg)/15 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <Button
              variant="ink"
              size="lg"
              magnetic={false}
              className="w-full"
              onClick={() => {
                dispatch({ type: "reset" });
                go("preview");
              }}
            >
              Keep shopping
            </Button>
          </footer>
        ) : null}
      </motion.div>
    </div>
  );
}
