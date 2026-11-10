"use client";
import { profile } from "@/data/profile";
import { useMediaQuery } from "@/lib/hooks";
import "./journey.css";
import { Rail } from "./Rail";
import { Scanner } from "./Scanner";

/** THE LINE SO FAR — data/experience.ts with years as coordinates. Tablet+: a scanner; phones: a rail. */
export function Journey() {
  const wide = useMediaQuery("(min-width: 768px)");
  return (
    <section id="journey" data-rail="Route" aria-labelledby="ab-journey" className="frame scroll-mt-[var(--nav-h)] overflow-x-clip py-[clamp(4rem,11vh,8rem)]">
      <h2 id="ab-journey" data-chaos-type className="display mb-[clamp(2.5rem,7vh,4.5rem)] text-display-m">
        {profile.about.journey[0]} <span className="serif-accent">{profile.about.journey[1]}</span>
      </h2>
      <Scanner on={wide} className="max-md:hidden" />
      <Rail on={!wide} className="md:hidden" />
    </section>
  );
}
