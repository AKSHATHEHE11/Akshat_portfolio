"use client";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useLenis } from "lenis/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit, system } from "@/lib/system";
import { clock, resetSession } from "./session";
import "./ending.css";

const DURATION = 1.4;
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The tape is back at the start, so is the keyboard: park focus on <main> (outline-less, temporary). */
function focusTop() {
  const main = document.getElementById("main");
  if (!main) return;
  main.tabIndex = -1;
  main.style.outline = "none";
  main.focus({ preventScroll: true });
  main.addEventListener(
    "blur",
    () => {
      main.removeAttribute("tabindex");
      main.style.outline = "";
    },
    { once: true },
  );
}

/**
 * VHS rewind: scanlines + ◀◀ REW + a tape counter running the session time back to zero while the
 * page scrolls to the top. Then "restart" fires and the boot sequence plays again. Mount it to run it.
 */
export function Rewind({ from, onDone }: { from: number; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const chaos = useChaos();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        play("click");
        resetSession();
        focusTop();
        emit("restart");
        system.replayBoot();
        gsap.to(el, { autoAlpha: 0, duration: 0.3, delay: 0.15, onComplete: onDone });
      };
      const show = (t: number) => {
        if (counter.current) counter.current.textContent = clock(t);
      };

      play("whoosh");
      if (reduced) {
        if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
        else window.scrollTo(0, 0);
        show(0);
        gsap.delayedCall(0.5, finish);
        return;
      }
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" });
      const tape = { t: from };
      gsap.to(tape, { t: 0, duration: DURATION, ease: "power3.inOut", onUpdate: () => show(tape.t) });
      if (lenis) lenis.scrollTo(0, { duration: DURATION, easing: inOutCubic, force: true, lock: true, onComplete: finish });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      gsap.delayedCall(DURATION + 0.3, finish); // safety net: already at the top, or no Lenis
    },
    { scope: root },
  );

  return createPortal(
    <div ref={root} className="tape-vhs" role="status">
      <span className="sr-only">Rewinding to the start</span>
      <div className="tape-tint" />
      <div className="tape-band" />
      <div className="tape-band" style={{ animationDelay: "-0.21s" }} />
      <div className="tape-scan" />
      <p aria-hidden className="tape-osd">
        <svg viewBox="0 0 24 12" fill="currentColor">
          <path d="M12 0v12L0 6zM24 0v12L12 6z" />
        </svg>
        REW
      </p>
      <p aria-hidden className="tape-counter">
        <small>SP</small>
        <span ref={counter}>{clock(from)}</span>
      </p>
      {chaos && !reduced && <div className="tape-invert" />}
    </div>,
    document.body,
  );
}
