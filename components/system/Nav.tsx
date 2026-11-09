"use client";
// STUB — minimal working nav; replaced by the control-console navigation.
import { site } from "@/data/site";
import { TLink } from "@/components/ui/TLink";
import { Bracket } from "@/components/ui/marks";

export default function Nav() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-[60] flex h-(--nav-h) items-center justify-between px-(--margin)"
      style={{ viewTransitionName: "site-nav" }}
    >
      <TLink href="/" kind="nav-back" className="label text-fg">
        <Bracket>AKSHAT</Bracket>
      </TLink>
      <nav aria-label="Primary" className="flex gap-6">
        {site.nav.map((item) => (
          <TLink key={item.href} href={item.href} className="label">
            <span className="text-signal">{item.id}</span> {item.label}
          </TLink>
        ))}
      </nav>
    </header>
  );
}
