"use client";
import { useState } from "react";
import { contact } from "@/data/contact";
import { profile } from "@/data/profile";
import { Reveal } from "@/components/ui/Reveal";
import { useSystem } from "@/lib/system";
import { Accent } from "./contact/Accent";
import { CopyKey } from "./contact/CopyKey";
import { Cross } from "./contact/Cross";
import { IntentTabs, tabId } from "./contact/IntentTabs";
import { Terminal } from "./contact/Terminal";
import { Viewfinder } from "./contact/Viewfinder";

const PANEL = "contact-terminal";

/** CONTACT — pick an intent, leave your name, email and (optionally) phone, type, transmit to my inbox. */
export default function Contact() {
  const [index, setIndex] = useState(0);
  const booted = useSystem((s) => s.booted); // keys the heading reveal so it re-arms after RESTART
  const intent = contact.intents[index];

  return (
    <section id="contact" data-rail="Contact" aria-labelledby="contact-title" className="relative pt-[clamp(5rem,12vh,9rem)]">
      <div className="frame">
        <div className="relative border-t border-line pb-[clamp(3.5rem,9vh,6rem)] md:border-x md:px-[clamp(1.5rem,3.5vw,3.5rem)]">
          <Cross className="-left-[8px] -top-[8px] max-md:hidden" />
          <Cross className="-right-[8px] -top-[8px] max-md:hidden" />

          <div className="flex items-start justify-between gap-8 pt-[clamp(2.5rem,6vh,4rem)]">
            <h2 id="contact-title" data-chaos-type className="display text-display-m">
              {contact.heading.map((line, i) => (
                <Reveal key={`${line}-${booted}`} as="span" className="block" delay={i * 0.08}>
                  <Accent line={line} accent={contact.accent} />
                </Reveal>
              ))}
            </h2>
            <Viewfinder className="mt-2 hidden md:block" />
          </div>

          <IntentTabs
            className="mt-[clamp(2.25rem,5.5vh,3.5rem)]"
            intents={contact.intents}
            index={index}
            onChange={setIndex}
            panelId={PANEL}
          />
          <Terminal className="mt-4 lg:mt-7" id={PANEL} intent={intent} labelledBy={tabId(intent)} />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[44ch] text-[0.875rem] leading-snug text-fg-muted">{contact.form.note}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${profile.email}`}
                data-cursor="hover"
                className="hit font-mono text-label underline decoration-line underline-offset-4 transition-colors hover:decoration-fg"
              >
                {profile.email}
              </a>
              <CopyKey text={profile.email} toast="EMAIL COPIED" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
