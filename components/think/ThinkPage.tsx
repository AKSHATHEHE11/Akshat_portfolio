"use client";
import { useLenis } from "lenis/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSystemReady } from "@/lib/hooks";
import { FieldNotes } from "./FieldNotes";
import { Loop } from "./Loop";
import { Opening } from "./Opening";
import { Switchboard } from "./Switchboard";
import "./think.css";

/**
 * /think — how Akshat works: THINK in loops (the opening), the seven-step loop on the pipe board,
 * the house rules as a switchboard of levers, and field notes as a lab log. The page ends where the
 * loop does: back at Observe.
 */
export default function ThinkPage() {
  const ready = useSystemReady();
  const lenis = useLenis();

  const loopBack = () => {
    const el = document.getElementById("loop");
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="tk-root" data-intro={ready || undefined}>
      <Opening />
      <Loop />
      <Switchboard />
      <FieldNotes />

      <section aria-label="Back to the start of the loop" className="frame pb-[clamp(5rem,13vh,9rem)]">
        <div className="flex flex-col gap-8 border-t border-line pt-10 md:flex-row md:items-end md:justify-between">
          <p className="tk-h2 text-[clamp(2.2rem,1.2rem+3.4vw,4.75rem)]">
            Ship it.
            <br />
            <em>Then watch again.</em>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={loopBack} icon={<RotateCcw size={16} strokeWidth={2} />}>
              Back to Observe
            </Button>
            <Button href="/work">See it on real work</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
