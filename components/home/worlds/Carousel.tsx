"use client";
import "swiper/css";
import { useRef, useState } from "react";
import { Swiper, SwiperSlide, type SwiperClass } from "swiper/react";
import { gsap } from "@/lib/gsap";
import { useOnScreen } from "@/lib/hooks";
import type { ProjectSummary } from "@/lib/types";
import { clamp, pad } from "@/lib/utils";
import { Portal } from "./Portal";
import { Train } from "./Rail";

/** Touch / narrow screens: snapping full-width portals, the train shows how far along you are. */
export function Carousel({ projects }: { projects: ProjectSummary[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const swiper = useRef<SwiperClass | null>(null);
  const train = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  // same curve as --margin in globals.css (only ever rendered on the client, after system init)
  const [margin] = useState(() => (typeof window === "undefined" ? 16 : clamp(5.6 + 0.03 * window.innerWidth, 16, 56)));
  const running = useOnScreen(ref, "0px");

  return (
    <div ref={ref} className="mt-10">
      <Swiper
        slidesPerView="auto"
        spaceBetween={12}
        slidesOffsetBefore={margin}
        slidesOffsetAfter={margin}
        speed={650}
        resistanceRatio={0.6}
        onSwiper={(sw) => {
          swiper.current = sw;
        }}
        onSlideChange={(sw) => setActive(sw.activeIndex)}
        onProgress={(_, p) => {
          // fires once during Swiper init, before the train below has mounted
          if (train.current) gsap.to(train.current, { xPercent: clamp(p, 0, 1) * 100, duration: 0.5, ease: "power3.out", overwrite: true });
        }}
      >
        {projects.map((p, i) => (
          <SwiperSlide key={p.slug} style={{ width: "min(calc(100vw - 2 * var(--margin) - 1.25rem), 34rem)" }}>
            <Portal
              p={p}
              index={i}
              total={projects.length}
              running={running && Math.abs(i - active) <= 1}
              variant="swipe"
              onKeyboardFocus={() => swiper.current?.slideTo(i)}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="frame mt-8 flex items-center gap-4" aria-hidden>
        <span className="label tabular-nums">
          {projects[active]?.id} / {pad(projects.length)}
        </span>
        <span className="relative h-px flex-1 bg-fg/40">
          {/* full-width carrier: xPercent of its own width = distance along the line */}
          <span ref={train} className="absolute inset-x-0 bottom-0 block">
            <span className="absolute bottom-0 left-0 -translate-x-1/2">
              <Train className="h-[15px] w-[34px]" />
            </span>
          </span>
        </span>
        <span className="label text-fg-muted">Swipe</span>
      </div>
    </div>
  );
}
