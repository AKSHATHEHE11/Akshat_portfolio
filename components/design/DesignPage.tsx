"use client";
import "./design.css";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { design } from "@/data/design";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { pad } from "@/lib/utils";

const NAME = ["Akshat", "Agrawal"];

/**
 * /design — the design side, in the black and white of Akshat's Behance cover: "I am a" / "I like",
 * and the name in two layers around his photo (solid behind him, outline in front, so the letters
 * turn to outline where he stands). Then what he does, the way to the full portfolio, and the way
 * to the contact terminal.
 */
export default function DesignPage() {
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
            priority
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
          {design.fields.map((d, i) => (
            <li key={d.title} className="dz-row">
              <span className="dz-num label">{pad(i + 1)}</span>
              <h3 className="dz-row-title">{d.title}</h3>
              <p className="dz-row-line">{d.line}</p>
            </li>
          ))}
        </ol>
      </section>

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
