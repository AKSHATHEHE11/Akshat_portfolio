// The rubber stamp: a double rule and uneven ink. The tone picks the ink (darker when it lands on paper).
import { cn } from "@/lib/utils";
import type { Band } from "./scene";

export const BAND_WORD: Record<Band, string> = { approved: "Approved", review: "Review", declined: "Declined" };

export function Stamp({
  tone,
  label,
  sub,
  className,
}: {
  tone: Band | "signal";
  /** defaults to the band's word */
  label?: string;
  /** the date band under the word */
  sub?: string;
  className?: string;
}) {
  return (
    <span data-tone={tone} className={cn("lg-stamp", className)}>
      <span>{label ?? (tone === "signal" ? "" : BAND_WORD[tone])}</span>
      {sub && <span className="lg-stamp-sub">{sub}</span>}
    </span>
  );
}
