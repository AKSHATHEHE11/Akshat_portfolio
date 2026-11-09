// Small visual marks that recur across the system. Server-safe (no hooks).
import { cn } from "@/lib/utils";

/** [ TEXT ] — bracket frame from the logo. tone colours the brackets only. */
export function Bracket({
  children,
  className,
  tone = "signal",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "signal" | "accent" | "fg";
}) {
  const color = tone === "signal" ? "border-signal" : tone === "accent" ? "border-accent" : "border-fg";
  return (
    <span className={cn("relative inline-flex items-center px-[0.65em] py-[0.3em]", className)}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[0.4em] border-y-2 border-l-2", color)} />
      {children}
      <span aria-hidden className={cn("absolute inset-y-0 right-0 w-[0.4em] border-y-2 border-r-2", color)} />
    </span>
  );
}

/** Status LED. `pulse` breathes. */
export function Led({
  className,
  tone = "go",
  pulse = true,
}: {
  className?: string;
  tone?: "go" | "signal" | "accent" | "fg";
  pulse?: boolean;
}) {
  const bg = { go: "bg-go text-go", signal: "bg-signal text-signal", accent: "bg-accent text-accent", fg: "bg-fg text-fg" }[tone];
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", bg, pulse && "animate-pulse-dot", className)} />;
}

/** Viewfinder corners — four L marks inside the nearest positioned ancestor. */
export function Corners({
  className,
  size = 14,
  inset = 10,
  weight = 1.5,
}: {
  className?: string;
  size?: number;
  inset?: number;
  weight?: number;
}) {
  const s = { width: size, height: size, borderWidth: 0 } as const;
  const b = `${weight}px solid currentColor`;
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute" style={{ ...s, left: inset, top: inset, borderLeft: b, borderTop: b }} />
      <span className="absolute" style={{ ...s, right: inset, top: inset, borderRight: b, borderTop: b }} />
      <span className="absolute" style={{ ...s, left: inset, bottom: inset, borderLeft: b, borderBottom: b }} />
      <span className="absolute" style={{ ...s, right: inset, bottom: inset, borderRight: b, borderBottom: b }} />
    </span>
  );
}

/** Keyboard key glyph for shortcut hints. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-line bg-surface px-1.5 font-mono text-[0.6875rem] text-fg shadow-key",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
