import type { JourneyStop } from "@/data/experience";
import { cn, pad } from "@/lib/utils";

/** The future has no year yet: 2027 prints as "20??". */
export const yearLabel = (s: JourneyStop) => (s.kind === "future" ? `${String(s.year).slice(0, 2)}??` : String(s.year));

/** One stop's text: index and kind, the title, the place, the line about it, its tags. */
export function StopText({ stop, i, total, className }: { stop: JourneyStop; i: number; total: number; className?: string }) {
  const future = stop.kind === "future";
  return (
    <div className={className}>
      <p className="label text-fg-muted">
        <span className={future ? undefined : "text-fg"}>{pad(i + 1)}</span> / {pad(total)} · {stop.kind}
      </p>
      <h3
        className={cn(
          "mt-2 max-w-[22ch] text-[clamp(1.375rem,1rem+1.3vw,2.25rem)] leading-[1.05] tracking-[-0.025em]",
          future ? "serif-accent text-[clamp(1.75rem,1.2rem+1.8vw,2.9rem)]" : "font-semibold",
        )}
      >
        {stop.title}
      </h3>
      <p className="mt-2 font-mono text-label text-fg-muted">{stop.place}</p>
      <p className="mt-4 max-w-[46ch] text-lede">{stop.body}</p>
      {stop.tags && (
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-label text-fg-muted">
          {stop.tags.map((t) => (
            <li key={t} className="before:mr-1.5 before:text-signal before:content-['+']">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
