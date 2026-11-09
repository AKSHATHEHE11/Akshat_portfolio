"use client";
import "./nav/nav.css";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { Button } from "@/components/ui/Button";
import { Scramble } from "@/components/ui/Scramble";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { Links } from "./nav/Links";
import { Logo } from "./nav/Logo";
import { MenuPanel, type Origin } from "./nav/MenuPanel";
import { ChaosToggle, LightsToggle, ShortcutsKey, SoundToggle } from "./nav/Toggles";
import { useBackdropTone } from "./nav/useBackdropTone";
import { useWorldInfo, type WorldInfo } from "./nav/useWorldInfo";

const GLITCH = "!<>-_\\/[]{}=+*^?#01";

/**
 * The control console. Transparent at the top of a page; past 80px it condenses into a floating bar
 * that opens back up when you reach for it. Inside a world the links fold into MENU + a readout and the
 * console takes the world's colours. Phones/touch get logo + MENU → the full-screen control panel.
 */
export default function Nav() {
  const header = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const world = useSystem((s) => s.world);
  const info = useWorldInfo(world);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, r: 0 });

  // A route change (link, back button, shortcut) always closes the panel. Adjusting state during
  // render is React's sanctioned pattern for "reset when a prop changes".
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }

  useScrolled(header);
  useBackdropTone(header);
  useIntro(header);
  useChaosGlitch(header);

  const openPanel = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    setOrigin({ x, y, r: reach + 48 });
    play("open");
    setOpen(true);
  };
  const closePanel = useCallback((silent?: boolean) => {
    if (!silent) play("close");
    setOpen(false);
  }, []);

  return (
    <>
      <header
        ref={header}
        className="sys-nav"
        data-mode={world ? "world" : "site"}
        style={{ viewTransitionName: "site-nav" }}
      >
        <div className="sys-nav__row">
          <Logo />
          {world ? <Readout info={info} /> : <Links pathname={pathname} />}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 lg:fine:flex">
              <ChaosToggle />
              <SoundToggle />
              <LightsToggle />
              <ShortcutsKey />
            </div>
            <Button
              variant="key"
              size="sm"
              icon={null}
              magnetic={false}
              aria-expanded={open}
              aria-controls="sys-panel"
              aria-haspopup="dialog"
              data-intro=""
              className={cn(!world && "lg:fine:hidden")}
              onClick={(e) => openPanel(e.currentTarget)}
            >
              <span aria-hidden className="grid grid-cols-2 gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="size-[3px] bg-current" />
                ))}
              </span>
              Menu
            </Button>
          </div>
        </div>
      </header>
      <MenuPanel open={open} origin={origin} onClose={closePanel} pathname={pathname} world={info} />
    </>
  );
}

/** "WORLD 02/06 · SAFAR ZAIKA" — what the links collapse into while a world is open. */
function Readout({ info }: { info: WorldInfo | null }) {
  if (!info) return null;
  return (
    <p
      data-intro=""
      className="ml-1 flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.12em] sm:ml-4 sm:text-[0.75rem]"
    >
      <span className="hidden text-(--n-dim) md:inline">World</span>
      <span className="shrink-0 tabular-nums">
        <span className="text-(--n-index)">{info.index}</span>
        <span className="text-(--n-dim)">/{info.total}</span>
      </span>
      <span aria-hidden className="text-(--n-dim)">
        ·
      </span>
      <Scramble text={info.title} trigger="change" duration={0.7} className="truncate" />
    </p>
  );
}

const markScrolled = (el: HTMLElement | null, y: number) => {
  const v = y > 80 ? "true" : "false";
  if (el && el.dataset.scrolled !== v) el.dataset.scrolled = v;
};

/** Writes data-scrolled straight to the DOM from Lenis — no React render per scroll frame. */
function useScrolled(ref: RefObject<HTMLElement | null>) {
  useLenis((l) => markScrolled(ref.current, l.scroll));
  useEffect(() => markScrolled(ref.current, window.scrollY), [ref]);
}

/**
 * Power-on: hidden while the boot screen runs, then the console wakes item by item and the labels
 * decode. Only after a real boot (first visit / restart) — returning visitors get it already on.
 */
function useIntro(scope: RefObject<HTMLElement | null>) {
  const ready = useSystemReady();
  const booted = useSystem((s) => s.booted);
  const reduced = useReducedMotion();
  const pending = useRef(false);

  useGSAP(
    () => {
      if (!ready) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-intro]", scope.current);
      if (!booted) {
        gsap.set(items, { autoAlpha: 0 });
        pending.current = true;
        return;
      }
      if (!pending.current) return;
      pending.current = false;
      if (reduced) {
        gsap.set(items, { clearProps: "opacity,visibility" });
        return;
      }
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: -12 },
        { autoAlpha: 1, y: 0, duration: 0.9, delay: 0.05, stagger: 0.045, ease: "expo.out", clearProps: "opacity,visibility,transform" },
      );
      gsap.utils.toArray<HTMLElement>("[data-glitch]", scope.current).forEach((el, i) => {
        gsap.to(el, {
          duration: 0.8,
          delay: 0.1 + i * 0.035,
          scrambleText: { text: el.dataset.glitch ?? "", chars: GLITCH, speed: 0.6 },
          ease: "none",
        });
      });
    },
    { scope, dependencies: [ready, booted, reduced] },
  );
}

/** Chaos variant: every so often one label loses its grip and re-decodes. Never blocks a click. */
function useChaosGlitch(scope: RefObject<HTMLElement | null>) {
  const chaos = useChaos();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!chaos || reduced) return;
    const id = window.setInterval(() => {
      const els = gsap.utils.toArray<HTMLElement>("[data-glitch]", scope.current);
      const el = els[Math.floor(Math.random() * els.length)];
      if (!el?.dataset.glitch) return;
      gsap.to(el, {
        duration: 0.7,
        scrambleText: { text: el.dataset.glitch, chars: GLITCH, speed: 0.5 },
        ease: "none",
        overwrite: true,
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [chaos, reduced, scope]);
}
