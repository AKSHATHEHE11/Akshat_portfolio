"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { Datasheet } from "./identity/Datasheet";
import "./identity/identity.css";

type Lcd = "READY" | "PRINTING" | "DONE";
const REST = { y: 22, rotate: -0.9 }; // where the label lands after it tears off

/**
 * IDENTITY — Akshat as a hardware product. A label printer feeds out his datasheet when it scrolls
 * into view (again after a restart); FEED prints a fresh one with the next serial number.
 */
export default function Identity() {
  const root = useRef<HTMLElement>(null);
  const feedBox = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const sticker = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [unit, setUnit] = useState(1);
  const [lcd, setLcd] = useState<Lcd>("READY");
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const booted = useSystem((st) => st.booted);
  const visible = useOnScreen(root, "0px");

  const { contextSafe } = useGSAP(
    () => {
      busy.current = false;
      setLcd("READY");
      if (reduced) {
        gsap.set(sheet.current, REST);
        return;
      }
      gsap.set(sheet.current, { yPercent: -101, y: 0, rotate: 0 });
      gsap.set(sticker.current, { autoAlpha: 0 });
      // FEED may already be printing (pressed before the label scrolled far enough in)
      ScrollTrigger.create({ trigger: feedBox.current, start: "top 75%", once: true, onEnter: () => !busy.current && print() });
    },
    { scope: root, dependencies: [reduced, booted], revertOnUpdate: true },
  );

  // thermal feed in jerky steps → tear-off → the QC sticker slaps on
  const print = contextSafe(() => {
    const sh = sheet.current;
    const sk = sticker.current;
    if (!sh || !sk) return;
    busy.current = true;
    setLcd("PRINTING");
    // one tick per printer step. (Reads the sheet, not the tween: fromTo renders — and calls
    // onUpdate — before its own return value exists.)
    let step: unknown;
    const tick = () => {
      const y = gsap.getProperty(sh, "yPercent");
      if (y === step) return;
      step = y;
      play("type");
    };
    gsap
      .timeline({
        onComplete: () => {
          busy.current = false;
          setLcd("DONE");
        },
      })
      .set(sk, { autoAlpha: 0 })
      .fromTo(sh, { yPercent: -101, y: 0, rotate: 0 }, { yPercent: 0, duration: 1.9, ease: "steps(26)", onUpdate: tick })
      .to(sh, { ...REST, duration: 0.8, ease: "snap" })
      .fromTo(
        sk,
        { autoAlpha: 0, scale: 1.6, rotate: 16 },
        { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.4)", onStart: () => play("press") },
        "-=0.35",
      );
  });

  const reprint = contextSafe(() => {
    if (busy.current) return;
    setUnit((u) => u + 1);
    if (reduced) {
      setLcd("DONE");
      return;
    }
    busy.current = true;
    setLcd("PRINTING");
    gsap.to(sheet.current, { yPercent: -101, y: 0, rotate: 0, duration: 0.55, ease: "power2.in", onComplete: print });
  });

  // chaos: every number on the label keeps re-scrambling
  useEffect(() => {
    const el = root.current;
    if (!chaos || reduced || !visible || !el) return;
    const scramble = contextSafe(() => {
      el.querySelectorAll<HTMLElement>("[data-num]").forEach((n) => {
        if (Math.random() < 0.4) return;
        gsap.to(n, { duration: 0.7, scrambleText: { text: n.dataset.num ?? "", chars: "0123456789", speed: 0.9 }, ease: "none", overwrite: true });
      });
    });
    scramble();
    const id = window.setInterval(scramble, 950);
    return () => window.clearInterval(id);
  }, [chaos, reduced, visible, contextSafe]);

  return (
    <section
      ref={root}
      id="identity"
      data-rail="Identity"
      aria-labelledby="identity-title"
      className="dsheet-root relative py-[clamp(6rem,14vh,10rem)]"
    >
      <div className="frame grid gap-y-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-(--gutter)">
        <p className="serif-accent text-[clamp(2.4rem,1.5rem+2.6vw,4rem)] leading-[0.92] lg:col-span-3">
          Unit 01
          <br />
          of 01.
        </p>

        {/* isolate: the printer/feed z-order stays local instead of joining the site-wide z scale */}
        <div className="isolate lg:col-span-9 lg:row-span-2">
          {/* the printer */}
          <div className="relative z-[2] flex h-[4.5rem] items-center gap-3 rounded-[1.1rem] border border-line bg-surface-2 px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_16px_30px_-20px_rgb(0_0_0/0.55)] sm:gap-4 sm:px-6">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#9a978f_55%,#4a4740)]" />
            <div aria-live="polite" className="rounded-[6px] bg-ink px-3 py-1.5 shadow-[inset_0_2px_6px_rgb(0_0_0/0.8)]">
              <span className="crt block min-w-[8ch] text-[1.35rem] leading-none tracking-[0.04em]">{lcd}</span>
            </div>
            <span className="hidden font-mono text-micro uppercase tracking-[0.14em] text-fg-muted md:inline">Spec printer · 203 dpi</span>
            <span className="ml-auto flex items-center gap-3">
              <Led tone={lcd === "PRINTING" ? "signal" : "go"} pulse={lcd === "PRINTING"} />
              <Button variant="key" size="sm" magnetic={false} onClick={reprint} icon={<RotateCw size={14} strokeWidth={2} />} aria-label="Feed: print a new label">
                Feed
              </Button>
            </span>
            <span aria-hidden className="absolute inset-x-3 bottom-[9px] h-[7px] rounded-full bg-ink shadow-[inset_0_2px_3px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.35)] sm:inset-x-5" />
          </div>

          {/* the label, fed out of the slot */}
          <div ref={feedBox} className="dsheet-feed px-4 pb-10 sm:px-7">
            <div ref={sheet} className="dsheet-sheet">
              <div className="dsheet-flapper">
                <Datasheet unit={unit} stickerRef={sticker} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 lg:self-end lg:pb-10">
          <Button href="/about" variant="ghost">
            Read the full manual
          </Button>
        </div>
      </div>
    </section>
  );
}
