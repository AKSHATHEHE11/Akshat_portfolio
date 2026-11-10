"use client";
import { ArrowUpRight } from "lucide-react";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { Reveal } from "@/components/ui/Reveal";
import { useSystem } from "@/lib/system";

const { open, label } = profile.availability;
// "Taking on select projects — early 2027": the clause after the dash gets the serif
const [lead, tail] = label.split(/\s+—\s+/);

/** The close: whether I'm taking work, and the way to the contact terminal on the home page. */
export function Close() {
  const booted = useSystem((s) => s.booted); // re-arms the reveal after RESTART
  return (
    <section id="status" data-rail="Status" aria-labelledby="ab-status" className="frame pt-[clamp(3rem,8vh,5rem)] pb-[clamp(5rem,14vh,9rem)]">
      <div className="grid gap-y-10 border-t border-line-strong pt-6 lg:grid-cols-12 lg:gap-x-(--gutter)">
        <p className="label flex items-center gap-2.5 lg:col-span-12">
          <Led tone={open ? "go" : "signal"} />
          <span>{open ? "Open for work" : "Booked"}</span>
          <span className="text-fg-muted">· {profile.location.city}</span>
        </p>
        <h2 id="ab-status" data-chaos-type className="display text-display-m lg:col-span-9">
          <Reveal key={`a${booted}`} as="span" className="block">
            {lead}
          </Reveal>
          {tail && (
            <Reveal key={`b${booted}`} as="span" className="serif-accent block" delay={0.1}>
              {tail}.
            </Reveal>
          )}
        </h2>
        <div className="flex items-end lg:col-span-3 lg:justify-end">
          <Button href="/#contact" variant="signal" size="lg" icon={<ArrowUpRight size={18} strokeWidth={1.75} />}>
            Write to me
          </Button>
        </div>
      </div>
    </section>
  );
}
