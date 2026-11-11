"use client";
// ENTER — the first scene after the boot. Headline left, the console right, the patch bay below.
// The entrance plays whenever `booted` turns true (first visit, and again after RESTART).
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useLenis } from "lenis/react";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
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
  "<style>section[data-intro] [data-line-inner]{transform:none!important}section[data-intro] [data-fade],section[data-intro] [data-module],section[data-intro] [data-console-fallback],section[data-intro] [data-console-drop],section[data-intro] svg{opacity:1!important}</style>";

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

  // The entrance itself is CSS (hero.css): it plays from the first paint, without waiting for this script.
  // What is left here: the 3D console's screen is on whenever the stand-in is (the poster is lit), and the
  // landing thud, if the fall is still under way by the time the page is live.
  useEffect(() => {
    if (!ready) return;
    rig.power = reduced || booted ? 1 : 0;
    rig.invalidate();
    if (!booted || reduced) return;
    const fall = root.current?.querySelector("[data-console-drop]")?.getAnimations()[0];
    const t = typeof fall?.currentTime === "number" ? fall.currentTime : null;
    if (t === null) return;
    const wait = 400 + 1300 * 0.42 - t; // the console touches down 42% into its fall (0.4s delay, 1.3s)
    if (wait <= 0) return;
    const id = window.setTimeout(() => play("drop"), wait);
    return () => window.clearTimeout(id);
  }, [ready, booted, reduced, rig]);

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
          <p data-fade style={{ "--i": 0 } as CSSProperties} className="mt-[clamp(2.5rem,5.5vh,3.75rem)] max-w-[31ch] text-lede text-fg">
            <Intro text={profile.intro} />
          </p>
          <div data-fade style={{ "--i": 1 } as CSSProperties} className="mt-[clamp(1.5rem,3.5vh,2.25rem)] flex flex-wrap items-center gap-3">
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
