"use client";
// ENTER — the first scene after the boot. Headline left, the console right, the patch bay below.
// The entrance plays whenever `booted` turns true (first visit, and again after RESTART).
import { useMemo, useRef } from "react";
import { useLenis } from "lenis/react";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { CustomEase, gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { Console } from "./console/Console";
import { createRig } from "./console/rig";
import { Headline } from "./Headline";
import { Modules } from "./Modules";
import { Status } from "./Status";
import "./hero.css";

const NOSCRIPT =
  "<style>section[data-intro] [data-line-inner]{transform:none!important}section[data-intro] [data-fade],section[data-intro] [data-module],section[data-intro] [data-console-fallback],section[data-intro] svg{opacity:1!important}</style>";

/** Falls, overshoots the floor a touch, settles: the console landing. */
function landing() {
  if (!CustomEase.get("hero-land")) CustomEase.create("hero-land", "M0,0 C0.2,0 0.3,0.7 0.42,1 0.48,1.09 0.57,1.07 0.65,1 0.74,0.965 0.85,1.004 1,1");
  return "hero-land";
}

function Intro({ text }: { text: string }) {
  return (
    <>
      {text.split(/\b(playful)\b/).map((part, i) =>
        part === "playful" ? (
          <em key={i} className="serif-accent text-[1.16em] leading-none">
            {part}
          </em>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const rig = useMemo(() => createRig(), []);
  const ready = useSystem((st) => st.ready);
  const booted = useSystem((st) => st.booted);
  const reduced = useReducedMotion();
  const lenis = useLenis();

  useGSAP(
    () => {
      const el = root.current;
      if (!el || !ready) return;
      if (reduced) {
        el.dataset.intro = "done";
        rig.drop = 0;
        rig.power = 1;
        rig.invalidate();
        return;
      }
      if (!booted) {
        el.dataset.intro = "pending";
        rig.drop = 1;
        rig.power = 0;
        rig.invalidate();
        return;
      }
      el.dataset.intro = "run";
      const land = landing();
      gsap
        .timeline({ delay: 0.1, onComplete: () => void (el.dataset.intro = "done") })
        .fromTo("[data-line-inner]", { yPercent: 112 }, { yPercent: 0, duration: 1.15, stagger: 0.09, ease: "expo.out" }, 0)
        .fromTo("[data-fade]", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "expo.out" }, 0.35)
        .fromTo("[data-squiggle]", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.85, ease: "power3.inOut" }, 0.72)
        .fromTo(rig, { drop: 1 }, { drop: 0, duration: 1.3, ease: land }, 0.3)
        .fromTo("[data-console-drop]", { yPercent: -45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.3, ease: land }, 0.3)
        .add(() => play("drop"), 0.3 + 1.3 * 0.42)
        .fromTo(rig, { power: 0 }, { power: 1, duration: 0.95, ease: "none", onUpdate: () => rig.invalidate() }, 1.5)
        .fromTo("[data-module]", { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: "expo.out" }, 0.75);
    },
    // revertOnUpdate: a restart (booted → false) or a reduced-motion flip kills a running intro and
    // hands the elements back to the CSS pre-state, instead of leaving two timelines to fight.
    { scope: root, dependencies: [ready, booted, reduced], revertOnUpdate: true },
  );

  const talk = () => {
    const target = document.getElementById("contact");
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { immediate: reduced });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    // keyboard users continue from the contact section (outline-less and temporary, like the rewind)
    if (target.hasAttribute("tabindex")) return target.focus({ preventScroll: true });
    target.tabIndex = -1;
    target.style.outline = "none";
    target.focus({ preventScroll: true });
    target.addEventListener(
      "blur",
      () => {
        target.removeAttribute("tabindex");
        target.style.outline = "";
      },
      { once: true },
    );
  };

  return (
    <section
      ref={root}
      id="enter"
      data-rail="Enter"
      data-intro="pending"
      aria-label="Intro"
      className={cn("hero-scene", "relative isolate flex min-h-svh flex-col overflow-x-clip")}
    >
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT }} />
      <div className="frame grid flex-1 grid-cols-12 gap-x-(--gutter)">
        <div className="@container relative z-[1] col-span-12 pt-[clamp(0.25rem,2.5vh,2rem)] lg:col-span-7 lg:pb-8">
          <Headline lines={profile.headline} />
          <p data-fade className="mt-[clamp(2.5rem,5.5vh,3.75rem)] max-w-[31ch] text-lede text-fg">
            <Intro text={profile.intro} />
          </p>
          <div data-fade className="mt-[clamp(1.5rem,3.5vh,2.25rem)] flex flex-wrap items-center gap-3">
            <Button href="/work">See my work</Button>
            <Button variant="ghost" icon={<Led tone="signal" pulse={false} />} onClick={talk}>
              Let&apos;s talk
            </Button>
          </div>
        </div>
        <div className="relative col-span-12 mt-12 lg:col-span-5 lg:mt-0">
          <Status className="lg:ml-10" />
          <Console rig={rig} />
        </div>
      </div>
      <div className="frame relative z-[1] pb-[clamp(2.5rem,5.5vh,3.5rem)] pt-[clamp(1.5rem,3.5vh,2.75rem)]">
        <Modules />
      </div>
    </section>
  );
}
