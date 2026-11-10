"use client";
import "./design.css";
import Image from "next/image";
import { design } from "@/data/design";

const NAME = ["Akshat", "Agrawal"];

/**
 * /design — the design side, in the black and white of Akshat's Behance cover: "I am a" / "I like",
 * and the name in two layers around his photo (solid behind him, outline in front, so the letters
 * turn to outline where he stands).
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
