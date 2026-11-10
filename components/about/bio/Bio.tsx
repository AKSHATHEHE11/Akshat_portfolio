"use client";
import { profile } from "@/data/profile";
import { Reveal } from "@/components/ui/Reveal";
import { useSystem } from "@/lib/system";
import { Portrait } from "./Portrait";

/**
 * The short bio: one statement set large, the rest as two quiet columns, and a portrait frame that
 * prints Akshat as a halftone field. `photo` (same-origin URL) swaps the initials for a real picture.
 */
export function Bio({ photo }: { photo?: string }) {
  const [lead, ...rest] = profile.bio;
  const booted = useSystem((s) => s.booted); // re-arms the reveals after RESTART
  const { city, coords } = profile.location;

  return (
    <section id="bio" data-rail="Bio" aria-labelledby="ab-bio" className="frame grid gap-y-12 py-[clamp(5rem,13vh,9rem)] md:grid-cols-12 md:gap-x-(--gutter)">
      <h2 id="ab-bio" className="sr-only">
        Bio
      </h2>
      <figure className="mx-auto w-full max-w-[22rem] md:col-span-5 md:mx-0 lg:col-span-4">
        <Portrait
          initials={profile.initials}
          photo={photo}
          label={photo ? `Portrait of ${profile.name}` : `${profile.name}: initials ${profile.initials} printed as a halftone dot field`}
        />
        <figcaption className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <span className="serif-accent text-[1.35rem] leading-none">
            fig. 1 — {profile.short}
            {photo ? "." : ", approximately."}
          </span>
          <span className="label text-right text-fg-muted">{city}</span>
        </figcaption>
        <p className="label mt-2 text-fg-muted">{coords}</p>
      </figure>

      <div className="md:col-span-7 md:pt-2 lg:col-span-7 lg:col-start-6">
        <Reveal key={`lead-${booted}`} as="p" className="text-[clamp(1.75rem,1.05rem+2.1vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em]">
          {lead}
        </Reveal>
        <div className="mt-10 grid gap-6 text-lede text-fg-muted md:mt-14 md:grid-cols-2 md:gap-(--gutter)">
          {rest.map((para, i) => (
            <Reveal key={`${i}-${booted}`} as="p" delay={0.08 * i}>
              {para}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
