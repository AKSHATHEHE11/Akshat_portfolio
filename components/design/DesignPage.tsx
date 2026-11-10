"use client";
import "./design.css";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { design } from "@/data/design";
import { worksFor } from "@/data/design-samples";
import Stage from "@/components/design/stage/Stage";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { pad } from "@/lib/utils";
import { FieldIndex, pieces, useJump } from "./work/FieldIndex";
import { Gallery } from "./work/Gallery";

const NAME = ["Akshat", "Agrawal"];

// Each field with its pieces (module scope: the data is static, so the arrays stay the same objects).
// A field without pieces stays in the list as plain text and gets no section and no index entry.
const FIELDS = design.fields.map((f, i) => ({ ...f, num: pad(i + 1), works: worksFor(f.id) }));
const LIVE = FIELDS.filter((f) => f.works.length > 0);

/**
 * /design — the design portfolio, in the black and white of Akshat's Behance cover: "I am a" / "I like",
 * and the name in two layers around his photo (solid behind him, outline in front, so the letters
 * turn to outline where he stands). Then the fields he works in, one section of work per field (with a
 * sticky index), the way to the full portfolio on Behance, and the way to the contact terminal.
 */
export default function DesignPage() {
  const jump = useJump();
  return (
    <div className="dz">
      <section className="dz-hero" aria-labelledby="dz-name">
        <div className="dz-tags">
          <Tag title="I am a" items={design.iAm} />
          <Tag title="I like" items={design.iLike} className="dz-tag-like" />
        </div>
        <div className="dz-stage">
          <h1 id="dz-name" className="dz-name">
            {NAME.map((n, i) => (
              <span key={n} className="dz-line" style={{ "--i": i } as React.CSSProperties}>
                {n}
              </span>
            ))}
          </h1>
          <Image
            className="dz-photo"
            src={design.photo.src}
            width={design.photo.width}
            height={design.photo.height}
            alt={design.photo.alt}
            sizes="(max-width: 767px) 94vw, 53vw"
            preload
          />
          <p aria-hidden className="dz-name dz-name-outline">
            {NAME.map((n, i) => (
              <span key={n} className="dz-line" style={{ "--i": i } as React.CSSProperties}>
                {n}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section className="dz-section frame" aria-labelledby="dz-do">
        <h2 id="dz-do" className="label dz-kicker">
          {design.kicker}
        </h2>
        <ol className="dz-list">
          {FIELDS.map((f) => {
            const row = (
              <>
                <span className="dz-num label">{f.num}</span>
                <h3 className="dz-row-title">
                  {f.title} <span className="dz-script">{f.script}</span>
                </h3>
                <div className="dz-aside">
                  <p className="dz-blurb">{f.line}</p>
                  {f.works.length > 0 && (
                    <span className="dz-count label">
                      {pieces(f.works.length)}
                      <ArrowDown size={15} strokeWidth={1.75} aria-hidden />
                    </span>
                  )}
                </div>
              </>
            );
            return (
              <li key={f.id}>
                {f.works.length > 0 ? (
                  <a href={`#${f.id}`} onClick={jump} className="dz-row" data-cursor="hover">
                    {row}
                  </a>
                ) : (
                  <div className="dz-row">{row}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {LIVE.length > 0 && (
        <div className="dz-work">
          {/* The index is this page's section navigation: no data-rail, the global rail's ink doesn't read on #222 */}
          <FieldIndex fields={LIVE} />
          {LIVE.map((f) => (
            <section key={f.id} id={f.id} aria-labelledby={`dz-${f.id}`} tabIndex={-1} className="dz-field">
              <div className="frame">
                {/* the field's line is in the list just above; the header doesn't repeat it */}
                <header className="dz-field-head">
                  <span className="dz-num label">{f.num}</span>
                  <h2 id={`dz-${f.id}`} className="dz-field-title">
                    {f.title} <span className="dz-script">{f.script}</span>
                  </h2>
                  <div className="dz-aside">
                    <p className="dz-count label">{pieces(f.works.length)}</p>
                  </div>
                </header>
                {f.id !== "visuals" && <Gallery field={f.id} works={f.works} />}
              </div>
              {f.id === "visuals" && <Stage works={f.works} />}
            </section>
          ))}
        </div>
      )}

      <section className="dz-section frame" aria-label={design.behance.label}>
        <TLink href={design.behance.href} className="dz-behance" data-cursor="hover">
          <span className="label">{design.behance.label}</span>
          <span className="dz-behance-title">
            {design.behance.title[0]} <span className="dz-script">{design.behance.title[1]}</span>
          </span>
          <span className="dz-behance-go label">
            {design.behance.cta}
            <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
          </span>
        </TLink>
      </section>

      <section className="dz-section dz-cta frame" aria-labelledby="dz-cta">
        <h2 id="dz-cta" className="dz-cta-title">
          {design.cta.title[0]} <span className="dz-script">{design.cta.title[1]}</span>
        </h2>
        <p className="dz-cta-line">{design.cta.line}</p>
        <Button href="/#contact" variant="signal" size="lg" icon={<ArrowUpRight size={18} strokeWidth={1.75} />}>
          {design.cta.button}
        </Button>
      </section>
    </div>
  );
}

function Tag({ title, items, className }: { title: string; items: readonly string[]; className?: string }) {
  return (
    <div className={`dz-tag ${className ?? ""}`}>
      <p className="dz-script dz-tag-title">{title}</p>
      <ul className="dz-caps">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
