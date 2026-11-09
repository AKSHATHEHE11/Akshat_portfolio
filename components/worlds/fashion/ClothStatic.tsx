"use client";
// The cloth without WebGL: the same procedural denim, hung from the same rod, folds painted in CSS.
// Shown for reduced motion and without WebGL. ClothRolled stands in while the 3D cloth loads.
import { cn } from "@/lib/utils";
import { useFabric } from "./fabric";

/**
 * The 3D cloth's first frame — rolled up under its rod — drawn in CSS so the cover never shows a hole
 * while three.js downloads. Sizes repeat Cloth.tsx's framing in container units: the camera fits
 * 2.75 units across (narrow boxes) or 3.38 units tall (wide ones), hence every min()/max() pair.
 * Colour comes from --fy-house on the cloth box.
 */
export function ClothRolled() {
  const u = (w: number, h: number) => `min(${w}cqw, ${h}cqh)`; // a length in cloth units, both framings
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 [container-type:size]">
      <span
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: "max(5.62cqh, 50cqh - 54.55cqw)",
          width: u(80, 65.09),
          height: u(7.64, 6.21),
          // selvedge edges (2% each side, as in the shader) over the rolled ripples
          background:
            "linear-gradient(90deg, #e6dfcf 0 2%, transparent 2% 98%, #e6dfcf 98%), repeating-linear-gradient(180deg, rgb(255 255 255 / .1) 0 6.8%, rgb(0 0 0 / .3) 6.8% 13.7%), var(--fy-house)",
        }}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1b1d24]"
        style={{ top: "max(5.03cqh, 50cqh - 55.27cqw)", width: u(92.36, 75.15), height: u(2.04, 1.66) }}
      />
      {[-1, 1].map((side) => (
        <span
          key={side}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1b1d24]"
          style={{ top: "max(5.03cqh, 50cqh - 55.27cqw)", left: `calc(50% + ${side} * ${u(46.91, 38.17)})`, width: u(3.64, 2.96), height: u(3.64, 2.96) }}
        />
      ))}
    </div>
  );
}

export function ClothStatic({
  warp,
  weft,
  accent,
  ink,
  patch,
  className,
}: {
  warp: string;
  weft: string;
  accent: string;
  ink: string;
  patch: string;
  className?: string;
}) {
  const url = useFabric({ warp, weft, weave: "twill-3x1", size: 192, fade: 0.14 });
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      <div className="relative aspect-[2.2/3] h-[86%] max-w-full">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backgroundColor: warp,
            backgroundImage: url ? `url(${url})` : undefined,
            backgroundSize: "72px",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgb(0 0 0 / .26) 0%, rgb(255 255 255 / .07) 6%, rgb(0 0 0 / 0) 10%, rgb(0 0 0 / .2) 15%, rgb(0 0 0 / .3) 17%), linear-gradient(180deg, rgb(255 255 255 / .1), transparent 35%, rgb(0 0 0 / .28))",
            }}
          />
          {/* selvedge edges with the ID thread */}
          <span className="absolute inset-y-0 left-0 w-[2%] bg-[#e6dfcf]">
            <span className="absolute inset-y-0 left-[45%] w-[2px]" style={{ background: accent }} />
          </span>
          <span className="absolute inset-y-0 right-0 w-[2%] bg-[#e6dfcf]">
            <span className="absolute inset-y-0 right-[45%] w-[2px]" style={{ background: accent }} />
          </span>
          {/* hem + chain stitch */}
          <span className="absolute inset-x-0 bottom-0 h-[3.2%] bg-black/25">
            <span className="absolute inset-x-[2%] top-1/2 h-[2px] -translate-y-1/2" style={{ background: "repeating-linear-gradient(90deg, #c4823b 0 6px, transparent 6px 10px)" }} />
          </span>
          {/* patch */}
          <span
            className="absolute right-[10%] top-[12.5%] grid aspect-[3/1] w-[34%] place-items-center font-serif text-[clamp(1rem,2.2vw,2.2rem)] italic leading-none"
            style={{ background: accent, color: ink, outline: `1.5px dashed ${ink}`, outlineOffset: "-6px" }}
          >
            {patch}
          </span>
        </div>
        <span className="absolute -inset-x-[8%] top-0 h-[7px] -translate-y-1/2 rounded-full bg-[#1b1d24]" />
      </div>
    </div>
  );
}
