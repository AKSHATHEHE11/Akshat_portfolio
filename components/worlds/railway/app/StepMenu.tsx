"use client";
import type { Ref } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { fmt, haltOf, type Reach, type Trip } from "../rail";
import type { Dish, Station } from "../scene";

export default function StepMenu({
  station,
  reach,
  cart,
  onAdd,
  onDec,
  onBack,
  focusRef,
}: {
  station: Station;
  reach: Reach;
  cart: Record<string, number>;
  onAdd: (d: Dish) => void;
  onDec: (d: Dish) => void;
  onBack: () => void;
  focusRef: Ref<HTMLHeadingElement>;
}) {
  const halt = haltOf(station);
  return (
    <div className="rw-step">
      <button type="button" className="rw-back hit" onClick={onBack} data-cursor="hover">
        <ChevronLeft size={16} aria-hidden /> Halts
      </button>
      <h3 ref={focusRef} tabIndex={-1} className="rw-step-h">
        {station.en}
        <span lang="hi" className="rw-hi">
          {station.hi}
        </span>
      </h3>
      <p className="rw-step-p">
        Arrives {fmt(reach.eta)} · PF {station.pf} · {halt ? `${halt} min halt` : "terminus"} ·{" "}
        <b>{reach.ok ? `order by ${fmt(reach.orderBy)}` : reach.why.toLowerCase()}</b>
      </p>
      <ul className="rw-menu">
        {(station.menu ?? []).map((d) => {
          const q = cart[d.id] ?? 0;
          return (
            <li key={d.id} className="rw-dish" data-in={q ? "1" : undefined}>
              <span className="rw-veg" role="img" aria-label={d.veg ? "Vegetarian" : "Non-vegetarian"} />
              <div>
                <p className="rw-dish-name">
                  {d.name}
                  <span lang="hi" className="rw-hi">
                    {d.hi}
                  </span>
                  {d.tag && <em>{d.tag}</em>}
                </p>
                <p className="rw-dish-desc">{d.desc}</p>
                <p className="rw-dish-kitchen">{d.kitchen}</p>
              </div>
              <div className="rw-dish-side">
                <span className="rw-dish-price">₹{d.price}</span>
                {q ? (
                  <span className="rw-qty">
                    <button type="button" className="hit" onClick={() => onDec(d)} aria-label={`One less ${d.name}`} data-cursor="hover">
                      <Minus size={14} strokeWidth={2.6} aria-hidden />
                    </button>
                    <output aria-live="polite" aria-label={`${q} ${d.name}`}>
                      {q}
                    </output>
                    <button type="button" className="hit" onClick={() => onAdd(d)} aria-label={`One more ${d.name}`} data-cursor="hover">
                      <Plus size={14} strokeWidth={2.6} aria-hidden />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="rw-add hit" onClick={() => onAdd(d)} aria-label={`Add ${d.name}`} data-cursor="hover">
                    Add <Plus size={14} strokeWidth={2.6} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Cart({
  station,
  trip,
  lines,
  fee,
  closed,
  onPlace,
}: {
  station: Station;
  trip: Trip;
  lines: { dish: Dish; qty: number }[];
  fee: number;
  /** reason the station can no longer take orders */
  closed: string | null;
  onPlace: () => void;
}) {
  const sub = lines.reduce((a, l) => a + l.dish.price * l.qty, 0);
  const total = sub + (lines.length ? fee : 0);
  return (
    <div className="rw-card rw-card-light rw-cart">
      <p className="rw-card-k">
        Tiffin for {trip.coach} · {trip.seat}
      </p>
      {lines.length ? (
        <ul>
          {lines.map((l) => (
            <li key={l.dish.id}>
              <span>
                {l.qty} × {l.dish.name}
              </span>
              <span>₹{l.dish.price * l.qty}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rw-cart-empty">Nothing yet. Everything on the left can reach the {station.en} platform in time.</p>
      )}
      {lines.length > 0 && (
        <dl>
          <div>
            <dt>Platform delivery</dt>
            <dd>₹{fee}</dd>
          </div>
          <div className="rw-cart-total">
            <dt>Total</dt>
            <dd>₹{total}</dd>
          </div>
        </dl>
      )}
      <button type="button" className="rw-btn" disabled={!lines.length || !!closed} onClick={onPlace} data-cursor="hover">
        {closed ? "Kitchens closed" : lines.length ? `Place order · ₹${total}` : "Add something first"}
      </button>
      <p className="rw-card-note">{closed ?? `Pay ${station.partner ?? "the partner"} on the platform — UPI or cash.`}</p>
    </div>
  );
}
