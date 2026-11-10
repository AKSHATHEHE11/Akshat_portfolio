"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChaos } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { pad, seeded } from "@/lib/utils";
import { FRAGMENT_LABELS } from "../copy";
import type { Chrome } from "./TypeTester";
import { Win } from "./Win";

type Variant = "ink" | "ghost" | "accent" | "signal" | "key";
interface Look {
  variant: Variant;
  radius: number;
  label: string;
  icon: boolean;
  wdth: number;
  size: "sm" | "md";
}
const AXES: { [K in keyof Look]: Look[K][] } = {
  variant: ["ink", "ghost", "accent", "signal", "key"],
  radius: [0, 4, 8, 12, 999],
  label: FRAGMENT_LABELS,
  icon: [true, false],
  wdth: [75, 100, 125], // three font instances, never in-between
  size: ["sm", "md"],
};
const KEYS = Object.keys(AXES) as (keyof Look)[];
const START: Look = { variant: "ink", radius: 999, label: FRAGMENT_LABELS[0], icon: true, wdth: 100, size: "md" };
const show = (v: Look[keyof Look]) => (typeof v === "string" ? `"${v}"` : String(v));

/**
 * A component that won't sit still: every couple of seconds one prop drifts (the real site Button,
 * so it mutates through the actual design system) and the diff is logged. Freeze stops it; pressing
 * the button approves the current revision, which buys a few seconds of peace.
 */
export function Fragment({ chrome, active }: { chrome: Chrome; active: boolean }) {
  const chaos = useChaos();
  const [{ look, rev, log }, setState] = useState({ look: START, rev: 1, log: ["· rev 0001 — as designed"] });
  const [frozen, setFrozen] = useState(false);
  const [approved, setApproved] = useState(false);
  const n = useRef(0);

  useEffect(() => {
    if (!active || frozen || approved) return;
    const id = window.setInterval(
      () => {
        const s = ++n.current;
        setState((p) => {
          const key = KEYS[Math.floor(seeded(s * 7) * KEYS.length)];
          const options = AXES[key].filter((v) => v !== p.look[key]);
          const next = options[Math.floor(seeded(s * 13 + 1) * options.length)];
          return {
            look: { ...p.look, [key]: next },
            rev: p.rev + 1,
            log: [`~ ${key} ${show(p.look[key])} → ${show(next)}`, ...p.log].slice(0, 3),
          };
        });
      },
      chaos ? 900 : 2600,
    );
    return () => window.clearInterval(id);
  }, [active, frozen, approved, chaos]);

  useEffect(() => {
    if (!approved) return;
    const id = window.setTimeout(() => setApproved(false), 4200);
    return () => window.clearTimeout(id);
  }, [approved]);

  return (
    <Win id="fragment" title="fragment.tsx" meta={`rev ${pad(rev, 4)}`} {...chrome}>
      <div className="pg-frag">
        <div className="pg-frag-stage">
          <Button
            variant={look.variant}
            size={look.size}
            magnetic={false}
            icon={look.icon ? <ArrowUpRight size={look.size === "sm" ? 14 : 18} strokeWidth={1.75} /> : null}
            style={{ borderRadius: look.radius, fontVariationSettings: `"wdth" ${look.wdth}` }}
            className="pg-frag-btn"
            onClick={() => {
              setApproved(true);
              play("success");
              emit("toast", { text: `REV ${pad(rev, 4)} APPROVED. IT WILL CHANGE ANYWAY.` });
            }}
          >
            {look.label}
          </Button>
        </div>
        <pre className="pg-frag-code">
          {`<Button variant="${look.variant}" size="${look.size}"\n  radius={${look.radius}} wdth={${look.wdth}}${look.icon ? " icon" : ""}>`}
        </pre>
        <ol className="pg-frag-log">
          {approved ? <li data-ok>✓ rev {pad(rev, 4)} approved — holding still</li> : null}
          {log.map((l, i) => (
            <li key={`${rev}-${i}`}>{l}</li>
          ))}
        </ol>
        <button
          type="button"
          role="switch"
          aria-checked={frozen}
          className="pg-switch pg-frag-freeze"
          onClick={() => {
            setFrozen(!frozen);
            play(frozen ? "toggle-off" : "toggle-on");
          }}
        >
          <span aria-hidden className="pg-switch-track">
            <i />
          </span>
          <span className="label">Freeze</span>
        </button>
      </div>
    </Win>
  );
}
