import { ViewTransition } from "react";
import { cn } from "@/lib/utils";

// Maps navigation kinds (lib/transitions.ts → NavKind) to animation classes in transitions.css.
// When several types are active (e.g. "nav-forward" + "chaos") React joins the classes, and the
// chaos rules — declared last in the CSS — win.
const enter = {
  "nav-forward": "vt-in-forward",
  "nav-back": "vt-in-back",
  "world-enter": "vt-in-world",
  "world-exit": "vt-in-back",
  "world-next": "vt-in-next",
  "world-prev": "vt-in-prev",
  chaos: "vt-in-chaos",
  default: "none",
};

const exit = {
  "nav-forward": "vt-out-forward",
  "nav-back": "vt-out-back",
  "world-enter": "vt-out-world",
  "world-exit": "vt-out-world-exit",
  "world-next": "vt-out-next",
  "world-prev": "vt-out-prev",
  chaos: "vt-out-chaos",
  default: "none",
};

/** Wrap every page.tsx in <Page>. Layouts persist across navigations, so this must live in the page. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ViewTransition enter={enter} exit={exit} default="none">
      <div className={cn("relative min-h-svh", className)}>{children}</div>
    </ViewTransition>
  );
}
