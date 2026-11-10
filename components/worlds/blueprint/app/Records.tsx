"use client";
// Records: grades (CGPA, and what each subject's end-sem needs for the grade you're after) and
// fees (select, pay, get a receipt — not while offline).
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, CreditCard, Landmark, Smartphone, Undo2, X } from "lucide-react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { internalOf, mean, needFor, rupees } from "../logic";
import type { Fee } from "../scene";
import type { AppCtx } from "./SidApp";

type View = "grades" | "fees";
const VIEWS: View[] = ["grades", "fees"];

/** Arrow keys walk a role="radiogroup" of buttons and pick as they go, like native radios (roving tabindex). */
function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
  const all = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']:not(:disabled)")];
  const i = all.indexOf(document.activeElement as HTMLButtonElement);
  if (!d || i < 0) return;
  e.preventDefault();
  const to = all[(i + d + all.length) % all.length];
  to.focus();
  to.click();
}

export function Records({ ctx, fees, setFees }: { ctx: AppCtx; fees: Fee[]; setFees: (f: Fee[]) => void }) {
  const [view, setView] = useState<View>("grades");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = (VIEWS.indexOf(view) + 1) % 2;
    setView(VIEWS[i]);
    tabs.current[i]?.focus();
  };
  return (
    <div className="sid-screen">
      <header className="sid-head">
        <div>
          <h3 className="sid-h">Records</h3>
          <p className="sid-sub">{ctx.scene.student.semester}</p>
        </div>
        <div role="tablist" aria-label="Records" className="sid-seg" onKeyDown={onKey}>
          {VIEWS.map((v, i) => (
            <button
              key={v}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={view === v}
              tabIndex={view === v ? 0 : -1}
              className="hit"
              onClick={() => {
                play("click");
                setView(v);
              }}
              data-cursor="hover"
            >
              {v === "grades" ? "Grades" : "Fees"}
            </button>
          ))}
        </div>
      </header>
      {view === "grades" ? <Grades ctx={ctx} /> : <Fees ctx={ctx} fees={fees} setFees={setFees} />}
    </div>
  );
}

function Grades({ ctx }: { ctx: AppCtx }) {
  const { scene, subjects } = ctx;
  const g = scene.grades;
  const [target, setTarget] = useState(g.bands[2]?.grade ?? g.bands[0].grade);
  const [open, setOpen] = useState<string | null>(null);
  const band = g.bands.find((b) => b.grade === target) ?? g.bands[0];
  const cg = mean(g.history.map((h) => h.sgpa));

  return (
    <div role="tabpanel" aria-label="Grades">
      <div className="sid-cgpa">
        <p>
          <b>{cg.toFixed(2)}</b>
          <small>CGPA after {g.history.length} semesters</small>
        </p>
        <ol className="sid-sgpa" aria-label="SGPA by semester">
          {g.history.map((h) => (
            <li key={h.sem} style={{ "--h": h.sgpa / 10 } as React.CSSProperties}>
              <i aria-hidden />
              <span>
                {h.sem} <b>{h.sgpa.toFixed(1)}</b>
              </span>
            </li>
          ))}
          <li className="is-now" style={{ "--h": 0.5 } as React.CSSProperties}>
            <i aria-hidden />
            <span>
              S{g.history.length + 1} <b>…</b>
            </span>
          </li>
        </ol>
      </div>

      <div className="sid-target" role="radiogroup" aria-label="Grade you want" onKeyDown={radioKeys}>
        <span className="sid-label">Aim for</span>
        {g.bands.map((b) => (
          <button
            key={b.grade}
            type="button"
            role="radio"
            aria-checked={target === b.grade}
            tabIndex={target === b.grade ? 0 : -1}
            className="hit"
            onClick={() => {
              play("tick");
              setTarget(b.grade);
            }}
            data-cursor="hover"
          >
            {b.grade}
          </button>
        ))}
      </div>

      <ul className="sid-list sid-grades">
        {subjects.map((s) => {
          const inn = internalOf(s);
          const need = needFor(inn.got, band.min, g.endSemMax, g.endSemPass);
          const isOpen = open === s.code;
          return (
            <li key={s.code}>
              <button
                type="button"
                className="sid-row"
                aria-expanded={isOpen}
                onClick={() => {
                  play(isOpen ? "close" : "open");
                  setOpen(isOpen ? null : s.code);
                }}
                data-cursor="hover"
              >
                <span className="sid-row-main">
                  <b>{s.short}</b> {inn.got}/{inn.of}
                </span>
                <span className={cn("sid-need", need === null && "sid-bad")}>
                  {need === null ? (
                    "out of reach"
                  ) : (
                    <>
                      needs <b>{need}</b>/{g.endSemMax}
                    </>
                  )}
                </span>
              </button>
              {isOpen && (
                <p className="sid-row-more">
                  {s.internals.map((i) => `${i.label} ${i.got}/${i.of}`).join(" · ")}.{" "}
                  {need === null
                    ? `An ${target} isn't possible this semester; the end-sem is out of ${g.endSemMax}.`
                    : `For ${/^[AEIOU]/.test(target) ? "an" : "a"} ${target} (${band.min}+) you need ${need} of ${g.endSemMax} in the end-sem${need === g.endSemPass ? ", the pass mark" : ""}.`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Pay = { step: "pick" | "busy" | "done"; method: string; ref?: string; amount: number } | null;
type Scene = AppCtx["scene"];
/** Saved methods, from the student on the card (no names live in the component). */
const METHODS: { id: string; icon: typeof Smartphone; note: (s: Scene) => string }[] = [
  { id: "UPI", icon: Smartphone, note: (s) => `${s.student.first.toLowerCase()}@ok${s.institute.short.toLowerCase()}` },
  { id: "Card", icon: CreditCard, note: (s) => `Visa ···· ${s.student.roll.slice(-4)}` },
  { id: "Netbanking", icon: Landmark, note: () => "Any Indian bank" },
];

function Fees({ ctx, fees, setFees }: { ctx: AppCtx; fees: Fee[]; setFees: (f: Fee[]) => void }) {
  const { scene, offline } = ctx;
  const unpaid = fees.filter((f) => f.status !== "paid");
  const [sel, setSel] = useState<string[]>(() => unpaid.map((f) => f.id));
  const [pay, setPay] = useState<Pay>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (pay?.step === "pick" || pay?.step === "done") head.current?.focus();
  }, [pay?.step]);

  const chosen = unpaid.filter((f) => sel.includes(f.id));
  const total = chosen.reduce((a, f) => a + f.amount, 0);
  const due = unpaid.reduce((a, f) => a + f.amount, 0);
  const changed = fees.some((f, i) => f.status !== scene.fees[i]?.status);

  const close = () => {
    play("close");
    setPay(null);
    opener.current?.focus();
  };
  const confirm = () => {
    if (!pay) return;
    play("press");
    setPay({ ...pay, step: "busy" });
    timer.current = window.setTimeout(() => {
      const ref = `SID-${scene.now.date.slice(-6).replace(/\D/g, "")}${(total % 46655).toString(36).toUpperCase().padStart(3, "0")}`;
      const today = scene.now.date.replace(/^\w+ /, "");
      setFees(fees.map((f) => (sel.includes(f.id) && f.status !== "paid" ? { ...f, status: "paid", paidOn: today, ref } : f)));
      setSel([]);
      setPay({ ...pay, step: "done", ref, amount: total });
      play("success");
    }, 1300);
  };

  return (
    <div role="tabpanel" aria-label="Fees">
      <div className="sid-due">
        <p>
          <small>Due now</small>
          <b>₹{rupees(due)}</b>
        </p>
        {changed && (
          <button
            type="button"
            className="sid-textbtn hit"
            data-cursor="hover"
            onClick={() => {
              play("toggle-off");
              setFees(scene.fees);
              setSel(scene.fees.filter((f) => f.status !== "paid").map((f) => f.id));
            }}
          >
            <Undo2 size={13} strokeWidth={2.2} aria-hidden /> Reset
          </button>
        )}
      </div>

      <ul className="sid-fees">
        {fees.map((f) => {
          const open = f.status !== "paid";
          return (
            <li key={f.id} className={cn("sid-fee", `is-${f.status}`)}>
              {open ? (
                <label className="sid-fee-pick" data-cursor="hover">
                  <input
                    type="checkbox"
                    checked={sel.includes(f.id)}
                    onChange={(e) => {
                      play("tick");
                      setSel((p) => (e.target.checked ? [...p, f.id] : p.filter((x) => x !== f.id)));
                    }}
                  />
                  <span className="sr-only">Include {f.label}</span>
                </label>
              ) : (
                <span className="sid-fee-ok" aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              <span className="sid-fee-main">
                <b>{f.label}</b>
                <small>
                  {f.detail} · {open ? `${f.status === "overdue" ? "was due" : "due"} ${f.due}` : `paid ${f.paidOn} · ${f.ref}`}
                </small>
              </span>
              <span className="sid-fee-amt">₹{rupees(f.amount)}</span>
            </li>
          );
        })}
      </ul>

      {offline && <p className="sid-banner">You&apos;re offline. Payments need a connection; receipts are still here.</p>}
      <button
        type="button"
        className="sid-btn sid-btn-wide sid-btn-pay"
        disabled={offline || !total}
        onClick={(e) => {
          play("open");
          opener.current = e.currentTarget;
          setPay({ step: "pick", method: METHODS[0].id, amount: total });
        }}
        data-cursor="hover"
      >
        {unpaid.length ? `Pay ₹${rupees(total)}` : "All paid"}
      </button>

      {pay && (
        <div
          className="sid-sheet-wrap"
          onKeyDown={(e) => {
            if (e.key === "Escape" && pay.step !== "busy") {
              e.preventDefault();
              close();
            }
          }}
        >
          <button type="button" className="sid-scrim" aria-label="Close" tabIndex={-1} onClick={() => pay.step !== "busy" && close()} />
          <div className="sid-sheet" role="dialog" aria-labelledby="sid-pay-h">
            {pay.step !== "busy" && (
              <button type="button" className="sid-sheet-x" onClick={close} aria-label="Close" data-cursor="hover">
                <X size={18} strokeWidth={2.2} />
              </button>
            )}
            {pay.step === "done" ? (
              <>
                <h4 id="sid-pay-h" ref={head} tabIndex={-1} className="sid-sheet-h sid-paid-h">
                  <Check size={18} strokeWidth={3} aria-hidden /> Paid ₹{rupees(pay.amount)}
                </h4>
                <dl className="sid-facts">
                  <div>
                    <dt>Ref</dt>
                    <dd className="sid-mono">{pay.ref}</dd>
                  </div>
                  <div>
                    <dt>Via</dt>
                    <dd>{pay.method}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>{scene.institute.name}</dd>
                  </div>
                </dl>
                <button type="button" className="sid-btn sid-btn-wide" onClick={close} data-cursor="hover">
                  Done
                </button>
              </>
            ) : (
              <>
                <h4 id="sid-pay-h" ref={head} tabIndex={-1} className="sid-sheet-h">
                  Pay ₹{rupees(pay.amount)}
                </h4>
                <div className="sid-methods" role="radiogroup" aria-label="Payment method" onKeyDown={radioKeys}>
                  {METHODS.map(({ id, icon: Icon, note }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={pay.method === id}
                      tabIndex={pay.method === id ? 0 : -1}
                      disabled={pay.step === "busy"}
                      onClick={() => {
                        play("tick");
                        setPay({ ...pay, method: id });
                      }}
                      data-cursor="hover"
                    >
                      <Icon size={16} strokeWidth={2} aria-hidden />
                      <span>
                        {id}
                        <small>{note(scene)}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" className="sid-btn sid-btn-wide sid-btn-pay" onClick={confirm} disabled={pay.step === "busy"} data-cursor="hover">
                  {pay.step === "busy" ? <span className="sid-spin" aria-label="Processing" /> : `Confirm ₹${rupees(pay.amount)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
