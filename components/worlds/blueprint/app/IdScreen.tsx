"use client";
// The digital ID. Front: photo, details and a Code 39 barcode (it scans). Back: a QR that scans too.
// Tap to flip; on a mouse it tilts and the foil catches the light. Airplane mode proves it works
// offline: the QR is signed, not looked up.
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Plane, SunMedium, WifiOff } from "lucide-react";
import { Barcode } from "@/components/home/identity/Barcode";
import { useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { qr } from "../qr";
import type { AppCtx } from "./SidApp";

export function IdScreen({ ctx, setOffline }: { ctx: AppCtx; setOffline: (v: boolean) => void }) {
  const { scene, offline } = ctx;
  const { student: st, institute } = scene;
  const [flipped, setFlipped] = useState(false);
  const [bright, setBright] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);
  const box = useRef<DOMRect | null>(null);
  const coarse = useCoarse();
  const reduced = useReducedMotion();
  const payload = `${institute.short}/SID/${st.roll}/${st.validTill}`;
  const qrPath = useMemo(() => {
    const m = qr(payload);
    let d = "";
    m.forEach((row, r) => row.forEach((on, c) => on && (d += `M${c} ${r}h1v1h-1z`)));
    return { d, n: m.length };
  }, [payload]);

  // tilt writes two variables on the card itself, only on mouse moves over it
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (coarse || reduced || e.pointerType !== "mouse" || !tilt.current) return;
    const r = (box.current ??= e.currentTarget.getBoundingClientRect()); // measured once per visit
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.setProperty("--rx", `${(-y * 14).toFixed(1)}deg`);
    tilt.current.style.setProperty("--ry", `${(x * 16).toFixed(1)}deg`);
    tilt.current.style.setProperty("--gx", String(Math.round((x + 0.5) * 100)));
  };
  const onLeave = () => {
    box.current = null;
    const s = tilt.current?.style;
    s?.setProperty("--rx", "0deg");
    s?.setProperty("--ry", "0deg");
    s?.setProperty("--gx", "50");
  };

  return (
    <div className={cn("sid-screen sid-id", bright && "is-bright")}>
      <header className="sid-head">
        <div>
          <h3 className="sid-h">Student ID</h3>
          <p className="sid-sub">{offline ? "Offline · the reader checks the signature" : "Gate, library, exam hall"}</p>
        </div>
      </header>

      <div className="sid-id-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div ref={tilt} className="sid-tilt">
          <button
            type="button"
            className="sid-card3d"
            data-flipped={flipped || undefined}
            onClick={() => {
              play(flipped ? "toggle-off" : "toggle-on");
              setFlipped(!flipped);
            }}
            aria-label={`Student ID, ${flipped ? "back with QR code" : "front"}. Flip it.`}
            data-cursor="hover"
            data-cursor-label="FLIP"
          >
            <span className="sid-face sid-front">
              <span className="sid-front-band">
                <span className="sid-crest" aria-hidden>
                  {institute.short}
                </span>
                <span className="sid-front-inst">
                  {institute.name}
                  <small>{institute.city}</small>
                </span>
              </span>
              <span className={cn("sid-offline", offline && "is-on")}>
                <WifiOff size={11} strokeWidth={2.4} aria-hidden /> Works offline
              </span>
              <span className="sid-front-mid">
                <Portrait />
                <span className="sid-front-who">
                  <b>{st.name}</b>
                  <small>{st.programme}</small>
                </span>
              </span>
              <span className="sid-front-facts">
                <span>
                  <i>Roll</i>
                  {st.roll}
                </span>
                <span>
                  <i>Batch</i>
                  {st.batch}
                </span>
                <span>
                  <i>Blood</i>
                  {st.blood}
                </span>
                <span>
                  <i>Valid</i>
                  {st.validTill}
                </span>
              </span>
              <span className="sid-front-code">
                <Barcode value={st.roll} className="sid-barcode" />
              </span>
              <span className="sid-foil" aria-hidden />
            </span>
            <span className="sid-face sid-back">
              <svg viewBox={`-2 -2 ${qrPath.n + 4} ${qrPath.n + 4}`} className="sid-qr" shapeRendering="crispEdges" role="img" aria-label={`QR code: ${payload}`}>
                <rect x="-2" y="-2" width={qrPath.n + 4} height={qrPath.n + 4} fill="#fff" />
                <path d={qrPath.d} fill="#0e1733" />
              </svg>
              <span className="sid-back-pay">{payload}</span>
              <span className="sid-back-note">
                Signed {scene.now.synced} · valid 24 h
                <small>Verified on the reader. No signal needed.</small>
              </span>
              <span className="sid-back-found">If found, hand in at the {institute.short} admin office</span>
            </span>
          </button>
        </div>
      </div>

      <div className="sid-toggles">
        <Toggle on={bright} onChange={setBright} icon={<SunMedium size={16} strokeWidth={2} aria-hidden />} label="Brightness up for scanners" />
        <Toggle on={offline} onChange={setOffline} icon={<Plane size={16} strokeWidth={2} aria-hidden />} label="Airplane mode" />
      </div>
    </div>
  );
}

function Toggle({ on, onChange, icon, label }: { on: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="sid-switch"
      onClick={() => {
        play(on ? "toggle-off" : "toggle-on");
        onChange(!on);
      }}
      data-cursor="hover"
    >
      {icon}
      <span>{label}</span>
      <i aria-hidden />
    </button>
  );
}

/** Drawn photo: head, hair, collar. Reads as a portrait at ID-card size. */
function Portrait() {
  return (
    <svg viewBox="0 0 60 72" className="sid-photo" aria-hidden style={{ "--skin": "#c68a62" } as CSSProperties}>
      <rect width="60" height="72" fill="#dfe6fb" />
      <path d="M8 72c2-14 10-19 22-19s20 5 22 19z" fill="#1c3fa8" />
      <path d="M24 50h12v7c-2 3-10 3-12 0z" fill="var(--skin)" />
      <path d="M25 56l5 6 5-6" fill="none" stroke="#eaf0ff" strokeWidth="1.6" />
      <ellipse cx="30" cy="34" rx="11.5" ry="14" fill="var(--skin)" />
      <path d="M17.5 36c-2-15 5-23 13-23 9 0 15 7 12.5 23-1-7-4-12-9-14-3 4-10 6-15.5 6 0 3 .2 6-1 8z" fill="#22160f" />
      <path d="M18 38c-1 6 0 14 3 17M42 38c1 6 0 14-3 17" stroke="#22160f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18.5" cy="40" r="1.2" fill="#ffd23f" />
      <circle cx="41.5" cy="40" r="1.2" fill="#ffd23f" />
    </svg>
  );
}
