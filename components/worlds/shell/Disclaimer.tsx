import { site } from "@/data/site";

/** The ownership notice, only on the projects that need it (data/site.ts → disclaimer). "title" sits
 *  under the project's name; "end" is the full-width line before the next world. */
export function Disclaimer({ slug, at }: { slug: string; at: "title" | "end" }) {
  if (!site.disclaimer.on.includes(slug)) return null;
  return (
    <p role="note" className="ws-disclaimer" data-at={at}>
      {site.disclaimer.text}
    </p>
  );
}
