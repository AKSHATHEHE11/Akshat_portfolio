import { cn } from "@/lib/utils";

/**
 * A registration cross where two 1px frame rules meet. Absolute offsets are measured from the padding
 * box, so sit it at -left/-top/-right/-bottom-[8px] to centre it on the border.
 */
export function Cross({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute size-[15px]",
        "before:absolute before:inset-y-0 before:left-[7px] before:w-px before:bg-fg",
        "after:absolute after:inset-x-0 after:top-[7px] after:h-px after:bg-fg",
        className,
      )}
    />
  );
}
