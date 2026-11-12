"use client";
// Runs a project's REAL website inside its world — legally and on demand.
//
//  • Only for sites you own or have the client's written OK to show (project.live.permission).
//  • Only through the site's own consent to be framed (X-Frame-Options / CSP frame-ancestors).
//    Check a URL first: `node scripts/check-embeds.mjs <url>`. We never proxy, mirror or strip
//    those headers — if a site refuses framing, use mode "capture" or "link".
//  • The iframe is mounted only after the visitor presses POWER, so it costs nothing until used,
//    and it is sandboxed (no access to this page). The address bar always shows the real domain.
//
// Worlds place <LiveScreen live={project.live} title={project.title} /> inside their own metaphor
// (the train window, the command-centre display, the boutique mirror…). See docs/LIVE-SITES.md.
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Lock, Power, RotateCw } from "lucide-react";
import type { LiveSite } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const VIEWPORT = {
  desktop: { w: 1440, h: 900 },
  tablet: { w: 834, h: 1112 },
  phone: { w: 390, h: 844 },
} as const;

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type State = "standby" | "connecting" | "live" | "slow";

export function LiveScreen({ live, title, className }: { live: LiveSite; title: string; className?: string }) {
  const device = live.device ?? "desktop";
  const vp = VIEWPORT[device];
  const host = hostOf(live.url);
  const reduced = useReducedMotion();

  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [state, setState] = useState<State>("standby");
  const [nonce, setNonce] = useState(0);
  const [travel, setTravel] = useState(0);

  // Render the site at its real viewport size and scale it into the screen.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / vp.w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [vp.w]);

  // A frame that never reports "load" (slow site) gets an honest way out.
  useEffect(() => {
    if (state !== "connecting") return;
    const id = window.setTimeout(() => setState((s) => (s === "connecting" ? "slow" : s)), 15000);
    return () => window.clearTimeout(id);
  }, [state, nonce]);

  const embed = live.mode === "embed";
  const capture = live.mode === "capture" && !!live.capture;

  // a capture has nothing to load: Power on just switches the screen on
  const powerOn = () => {
    play("toggle-on");
    setState(embed ? "connecting" : "live");
  };
  const reload = () => {
    play("click");
    setState("connecting");
    setNonce((n) => n + 1);
  };

  const showCapture = capture && state !== "standby";
  const frameOn = embed && state !== "standby";
  const phone = device === "phone";

  const screen = (
    <div
      ref={screenRef}
      className={cn("relative w-full overflow-hidden bg-ink", phone ? "rounded-[1.6rem]" : "rounded-b-[6px]")}
      style={{ aspectRatio: `${vp.w} / ${vp.h}` }}
      data-cursor={frameOn ? "hide" : undefined}
    >
      {/* the real site */}
      {frameOn && scale > 0 && (
        <iframe
          key={nonce}
          src={live.url}
          title={`${title} — live website (${host})`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; clipboard-write"
          onLoad={() => {
            setState("live");
            play("ready");
          }}
          className="absolute left-0 top-0 border-0 bg-white"
          style={{ width: vp.w, height: vp.h, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        />
      )}

      {/* full-page capture that scrolls itself (mode "capture") */}
      {showCapture && (
        <div className="group/cap absolute inset-0" tabIndex={0} aria-label={`${title}: full-page capture of ${host}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- capture size is unknown until it loads */}
          <img
            src={live.capture}
            alt={`${title} — full-page capture of ${host}`}
            className="w-full select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              const box = screenRef.current;
              if (!box) return;
              const h = (img.naturalHeight / img.naturalWidth) * box.clientWidth;
              setTravel(Math.max(0, h - box.clientHeight));
            }}
            style={
              !reduced && travel > 0
                ? {
                    animation: `live-capture-scroll ${Math.max(14, travel / 60)}s ease-in-out 1.2s infinite alternate`,
                    ["--travel" as string]: `${-travel}px`,
                  }
                : undefined
            }
          />
          <span className="absolute bottom-4 right-4">
            <Button href={live.url} variant="signal" size="sm">
              Open live site
            </Button>
          </span>
        </div>
      )}

      {/* standby / connecting / slow overlays */}
      {(state !== "live" || !embed) && !showCapture && (
        <div className="absolute inset-0 grid place-items-center overflow-hidden text-bone">
          {live.capture && (
            // eslint-disable-next-line @next/next/no-img-element -- decorative poster behind the standby screen
            <img src={live.capture} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top opacity-35 blur-[2px]" />
          )}
          <div aria-hidden className="live-scanlines pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col items-center gap-4 px-6 text-center">
            {state === "standby" || !embed ? (
              <>
                <p className="crt text-[clamp(1rem,2.4vw,1.6rem)] leading-none">LIVE · {host.toUpperCase()}</p>
                {embed || capture ? (
                  <Button
                    variant="signal"
                    size="sm"
                    icon={<Power size={14} strokeWidth={2} />}
                    onClick={powerOn}
                    aria-label={embed ? `Load the live ${host} website inside this page` : `Show the ${host} website inside this page`}
                  >
                    Power on
                  </Button>
                ) : (
                  <Button href={live.url} variant="signal" size="sm">
                    Open live site
                  </Button>
                )}
              </>
            ) : state === "connecting" ? (
              <p className="crt text-[clamp(0.9rem,2vw,1.3rem)]">
                CONNECTING TO {host.toUpperCase()}
                <span className="animate-blink">_</span>
              </p>
            ) : (
              <>
                <p className="crt text-[clamp(0.9rem,2vw,1.3rem)]">STILL CONNECTING…</p>
                <Button href={live.url} variant="ghost" size="sm" className="border-bone text-bone">
                  Open it directly
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <figure className={cn("relative", className)} aria-label={`${title} live website`}>
      <style>{`@keyframes live-capture-scroll{to{transform:translateY(var(--travel))}}.live-scanlines{background:repeating-linear-gradient(0deg,rgb(0 0 0/.28) 0 1px,transparent 1px 3px)}`}</style>
      {phone ? (
        <div className="mx-auto w-full max-w-[22rem] rounded-[2.4rem] border-[10px] border-ink bg-ink shadow-float">
          <div aria-hidden className="mx-auto mb-1 h-1.5 w-16 rounded-full bg-char" />
          {screen}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-ink/80 bg-ink shadow-float ring-1 ring-white/10">
          <div className="flex h-9 items-center gap-3 px-3 text-bone">
            <span aria-hidden className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-orange" />
              <span className="size-2.5 rounded-full bg-bone/40" />
              <span className="size-2.5 rounded-full bg-bone/40" />
            </span>
            <span className="label flex min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-full bg-white/8 px-3 py-1 normal-case tracking-[0.04em]">
              <Lock size={11} aria-hidden className="shrink-0 opacity-70" />
              <span className="truncate">{host}</span>
            </span>
            {frameOn && (
              <button type="button" onClick={reload} aria-label="Reload the live site" className="grid size-6 place-items-center rounded-sm hover:bg-white/10" data-cursor="hover">
                <RotateCw size={13} />
              </button>
            )}
            <a href={live.url} target="_blank" rel="noreferrer" aria-label={`Open ${host} in a new tab`} className="grid size-6 place-items-center rounded-sm hover:bg-white/10" data-cursor="hover">
              <ArrowUpRight size={14} />
            </a>
          </div>
          {screen}
        </div>
      )}
      {phone && (
        <figcaption className="label mt-3 flex items-center justify-center gap-2">
          <Lock size={11} aria-hidden /> {host}
          <a href={live.url} target="_blank" rel="noreferrer" className="underline underline-offset-4" data-cursor="hover">
            open ↗
          </a>
        </figcaption>
      )}
    </figure>
  );
}
