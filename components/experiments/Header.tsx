"use client";
import type { CSSProperties, MouseEvent } from "react";
import type { Experiment } from "@/data/experiments";
import { useSystemReady } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** The page's h1 and the rack: an index of the bench that also says which specimen is switched on. */
export function Header({
  items,
  active,
  onPick,
}: {
  items: Experiment[];
  active: Experiment["slug"] | null;
  onPick: (slug: Experiment["slug"], e: MouseEvent) => void;
}) {
  const ready = useSystemReady();
  return (
    <header className="frame xp-head" data-intro={ready || undefined}>
      <h1 className="xp-h1" aria-label="Experiments, mostly stable.">
        <span className="xp-mask">
          <span className="display block" data-in data-chaos-type>
            Experiments,
          </span>
        </span>
        <span className="xp-mask">
          <span className="serif-accent block" data-in style={d(120)}>
            mostly stable.
          </span>
        </span>
      </h1>
      <p className="xp-lede text-lede" data-in="fade" style={d(380)}>
        Small machines on one bench. Only the one in front of you is switched on; the rest hold their last frame.
      </p>

      <nav aria-label="Specimens" className="xp-rack" data-in="fade" style={d(520)}>
        <p className="label mb-3 flex justify-between text-fg-muted">
          <span>Rack · {pad(items.length)} specimens</span>
          <span aria-live="polite">{active ? `${items.find((x) => x.slug === active)?.id} running` : "All still"}</span>
        </p>
        <ol>
          {items.map((x, i) => (
            <li key={x.slug}>
              <a
                href={`#${x.slug}`}
                className="xp-row"
                data-active={active === x.slug || undefined}
                aria-current={active === x.slug ? "true" : undefined}
                onPointerEnter={() => play("tick")}
                onClick={(e) => onPick(x.slug, e)}
              >
                <span className="label xp-row-id xp-glitch" style={{ "--gd": `${((i * 0.43) % 2.4).toFixed(2)}s` } as CSSProperties}>
                  {x.id}
                </span>
                <span className="xp-row-name">
                  <span className="truncate">{x.title}</span>
                </span>
                <span className="label flex items-center gap-2 tabular-nums">
                  <span aria-hidden className="xp-led animate-pulse-dot" data-tone={x.status} />
                  <span className="max-sm:hidden">{x.status}</span>
                  <span className="text-fg-muted">{x.year}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
