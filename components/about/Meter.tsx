import { cn } from "@/lib/utils";

/** Five-segment level meter (level 1–5), lit in signal orange like the hardware status bars. */
export function Meter({ level, className }: { level: number; className?: string }) {
  return (
    <span aria-hidden className={cn("flex gap-[3px]", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={cn("h-2.5 w-[5px] rounded-[1px] transition-colors duration-300", n <= level ? "bg-signal" : "bg-fg/14")} />
      ))}
    </span>
  );
}
