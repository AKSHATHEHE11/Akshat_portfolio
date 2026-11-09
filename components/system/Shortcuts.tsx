"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { site } from "@/data/site";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { emit, on, system } from "@/lib/system";
import { useNavigate } from "@/lib/transitions";
import { flipChaos, flipLights, flipSound, type Point } from "./nav/actions";
import { ShortcutsSheet } from "./sheet/ShortcutsSheet";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"].join();

const ROUTES: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "Home" },
  ...Object.fromEntries(site.nav.map((n) => [n.key, { href: n.href, label: n.label }])),
};

const toast = (text: string) => emit("toast", { text });

function typing(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

/**
 * Global keys (data/site.ts → shortcuts) + the reference card + two undocumented features.
 * ←/→/Esc inside worlds belong to the world shell and are never handled here.
 */
export default function Shortcuts() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const go = useNavigate();
  const lenis = useLenis();
  const recent = useRef<string[]>([]);

  // Every way in (?, the nav keycap, the menu panel) arrives here, so they all sound the same.
  useEffect(
    () =>
      on("shortcuts:open", () => {
        play("open");
        setOpen(true);
      }),
    [],
  );

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    // an open dialog (menu panel, this card) owns the keyboard until it closes
    if (e.target instanceof Element && e.target.closest('[aria-modal="true"]')) return;

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const seq = recent.current;
    seq.push(key);
    if (seq.length > 10) seq.shift();
    if (seq.join() === KONAMI) {
      seq.length = 0;
      e.preventDefault();
      system.toggleChaos(true);
      emit("chaos:burst", { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      play("glitch");
      toast("OVERDRIVE");
      return;
    }

    if (e.key === "?") {
      e.preventDefault();
      emit("shortcuts:open");
      return;
    }
    if (e.shiftKey) {
      if (key !== "d") return;
      e.preventDefault();
      system.toggleSecret();
      toast(`DEV VISION: ${system.get().secret ? "ON" : "OFF"}`);
      return;
    }

    const at: Point | undefined = pointer.inside ? { x: pointer.x, y: pointer.y } : undefined;
    if (key === "c") toast(`CHAOS: ${flipChaos(at) ? "ON" : "OFF"}`);
    else if (key === "s") toast(`SOUND: ${flipSound() ? "ON" : "OFF"}`);
    else if (key === "l") toast(`LIGHTS: ${flipLights(at) ? "ON" : "OFF"}`);
    else if (ROUTES[key]) {
      const { href, label } = ROUTES[key];
      if (pathname === href) {
        lenis?.scrollTo(0);
        toast(`ALREADY ON ${label.toUpperCase()}`);
      } else go(href, system.get().world ? "world-exit" : href === "/" ? "nav-back" : "nav-forward");
    } else return;
    e.preventDefault();
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ShortcutsSheet
      open={open}
      onClose={() => {
        play("close");
        setOpen(false);
      }}
    />
  );
}
