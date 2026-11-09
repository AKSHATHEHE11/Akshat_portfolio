"use client";
import { useCallback, useEffect, useId, useMemo, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { isStop } from "./rail";
import type { Station } from "./scene";

const X = (k: number, total: number) => 4 + 92 * (k / total);
const Y = (x: number) => 50 + 17 * Math.sin((x / 100) * Math.PI * 2 + 0.9);

/** The lime route line with station chips and the train riding it. Drive it with `km`, or
 *  imperatively through `handleRef` (the scroll journey updates it every frame without re-rendering). */
export function RouteLine({
  route,
  km,
  handleRef,
  highlight,
  className,
}: {
  route: Station[];
  km?: number;
  handleRef?: RefObject<((km: number) => void) | null>;
  highlight?: string | null;
  className?: string;
}) {
  const cid = `rw-route-${useId().replace(/[^\w-]/g, "")}`;
  const total = route[route.length - 1].km;
  const clip = useRef<SVGRectElement>(null);
  const train = useRef<HTMLSpanElement>(null);
  const d = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => {
        const x = 4 + (92 * i) / 60;
        return `${i ? "L" : "M"}${x.toFixed(2)} ${Y(x).toFixed(2)}`;
      }).join(" "),
    [],
  );

  const set = useCallback(
    (k: number) => {
      const x = X(k, total);
      clip.current?.setAttribute("width", x.toFixed(2));
      if (train.current) {
        train.current.style.left = `${x}%`;
        train.current.style.top = `${Y(x)}%`;
      }
    },
    [total],
  );

  useEffect(() => {
    if (handleRef) handleRef.current = set;
  }, [handleRef, set]);
  useEffect(() => {
    if (km != null) set(km);
  }, [km, set]);

  return (
    <div className={cn("rw-route", className)} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <clipPath id={cid}>
            <rect ref={clip} x="0" y="0" width="0" height="100" />
          </clipPath>
        </defs>
        <path d={d} className="rw-route-base" vectorEffect="non-scaling-stroke" />
        <path d={d} className="rw-route-done" vectorEffect="non-scaling-stroke" clipPath={`url(#${cid})`} />
      </svg>
      {route.map((s) => {
        const x = X(s.km, total);
        const style = { left: `${x}%`, top: `${Y(x)}%` };
        return isStop(s) ? (
          <span key={s.code} className="rw-route-stop" style={style} data-on={highlight === s.code ? "1" : undefined}>
            <span className="rw-route-dot" />
            <span className="rw-route-chip">
              <b>{s.code}</b>
              <small>{s.en}</small>
            </span>
          </span>
        ) : (
          <span key={s.code} className="rw-route-tick" style={style} />
        );
      })}
      <span ref={train} className="rw-route-train" style={{ left: `${X(0, total)}%`, top: `${Y(X(0, total))}%` }}>
        <svg viewBox="0 0 64 18" style={{ fill: "var(--rw-mustard)" }}>
          <rect x="0" y="2" width="20" height="13" rx="3" />
          <rect x="22" y="2" width="20" height="13" rx="2" />
          <rect x="44" y="2" width="20" height="13" rx="2" />
          <path d="M2 5h6v4H2zM12 5h5v4h-5zM25 5h4v4h-4zM33 5h4v4h-4zM47 5h4v4h-4zM55 5h4v4h-4z" fill="#14243f" />
          <rect x="0" y="12" width="64" height="2" fill="#14243f" opacity=".4" />
        </svg>
      </span>
    </div>
  );
}
