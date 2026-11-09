import { ViewTransition } from "react";

/**
 * Shared-element morph across a navigation. Put the SAME name on one element in the old page and
 * one in the new page (see lib/transitions.ts → morph.stage / morph.title) and the browser flies
 * one into the other. Wrap exactly ONE DOM element. A name may appear only once per page.
 *
 *  variant "stage": boxes/backgrounds — snapshots are stretched to cover (no letterboxing)
 *  variant "text":  titles — keeps aspect ratio while it flies
 */
export function Morph({
  name,
  variant = "stage",
  children,
}: {
  name: string;
  variant?: "stage" | "text";
  children: React.ReactNode;
}) {
  return (
    <ViewTransition name={name} share={variant === "stage" ? "vt-morph" : "vt-morph-text"} default="none">
      {children}
    </ViewTransition>
  );
}
