"use client";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CornerDownLeft } from "lucide-react";
import { contact } from "@/data/contact";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/marks";
import { Scramble } from "@/components/ui/Scramble";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { tidy, type Field } from "./rules";
import { sendEnquiry, type Sent } from "./send";
import "./contact.css";

const WHO = ["name", "email", "phone"] as const;
const KIND = { name: "text", email: "email", phone: "tel" } as const;
const AUTO = { name: "name", email: "email", phone: "tel" } as const;

type Intent = (typeof contact.intents)[number];
type Tone = "sys" | "echo" | "err" | "ok";
interface Line {
  id: number;
  text: string;
  tone: Tone;
}

const TYPE = "font-mono text-[1rem] leading-[1.6] md:text-[1.0625rem]";
const MAX_LINES = 9;

function LogLine({ line, chaos }: { line: Line; chaos: boolean }) {
  return (
    <li className={cn("term-print", line.tone === "echo" ? "whitespace-pre-wrap break-words pl-[1.6ch] text-fg-muted" : "text-fg", line.tone === "ok" && "font-semibold")}>
      {line.tone !== "echo" && (
        <span aria-hidden className="text-signal">
          {line.tone === "err" ? "! " : "> "}
        </span>
      )}
      {chaos && line.tone !== "echo" ? <Scramble text={line.text} duration={0.7} /> : line.text}
    </li>
  );
}

/**
 * The contact terminal: name, email and an optional phone, then a real textarea with a block caret,
 * Enter to transmit (Shift+Enter = new line). Transmitting sends the enquiry to Akshat's inbox from
 * the server; if that can't happen it opens the visitor's own mail app with everything filled in.
 */
export function Terminal({ intent, id, labelledBy, className }: { intent: Intent; id: string; labelledBy: string; className?: string }) {
  const shell = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const typing = useRef(0);
  const seq = useRef(0);
  const [value, setValue] = useState("");
  const [who, setWho] = useState({ name: "", email: "", phone: "" });
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const trap = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const inputId = useId();
  const { contextSafe } = useGSAP({ scope: shell });

  const print = useCallback((text: string, tone: Tone = "sys") => {
    const lineId = seq.current++;
    setLog((l) => [...l.slice(-(MAX_LINES - 1)), { id: lineId, text, tone }]);
  }, []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(typing.current);
    };
  }, []);

  /* The native caret is hidden; a block caret is placed by measuring a mirror of the text up to the
     selection. Also auto-grows the textarea. Imperative on purpose: runs on every key/selection move. */
  const sync = useCallback(() => {
    const t = field.current;
    const m = mirror.current;
    const c = caret.current;
    if (!t || !m || !c) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
    const focused = document.activeElement === t;
    const text = t.value;
    const source = text || (focused ? "" : t.placeholder);
    const head = t.selectionDirection === "backward" ? t.selectionStart : t.selectionEnd;
    const at = text ? (focused ? head : text.length) : focused ? 0 : source.length;
    m.textContent = source.slice(0, at);
    const mark = document.createElement("span");
    mark.textContent = String.fromCharCode(0x200b); // zero-width: gives the marker a line box
    m.appendChild(mark);
    c.style.translate = `${mark.offsetLeft}px ${mark.offsetTop}px`;
    c.dataset.hidden = focused && t.selectionStart !== t.selectionEnd ? "1" : "0";
  }, []);

  useIsomorphicLayoutEffect(() => sync(), [value, intent.prompt, sync]);

  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    void document.fonts?.ready.then(sync);
    return () => ro.disconnect();
  }, [sync]);

  const shake = contextSafe(() => {
    gsap.fromTo(shell.current, { x: -10 }, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.28)", overwrite: true });
  });

  const markTyping = () => {
    const c = caret.current;
    if (!c) return;
    c.dataset.typing = "1";
    window.clearTimeout(typing.current);
    typing.current = window.setTimeout(() => {
      if (caret.current) caret.current.dataset.typing = "0";
    }, 550);
  };

  const refuse = (f: Field) => {
    play("error");
    print(contact.form.errors[f], "err");
    if (!reduced) shake();
    (f === "message" ? field.current : inputs.current[f])?.focus();
  };

  const transmit = async () => {
    if (busy) return;
    const t = tidy({ intent: intent.id, ...who, message: value });
    if (!t.ok) return refuse(t.field);
    const e = t.value;
    setBusy(true);
    const rows = e.message.split("\n");
    print(`FROM ${e.name} <${e.email}>`, "echo");
    rows.slice(0, 3).forEach((r) => print(r.length > 160 ? `${r.slice(0, 160)}…` : r || " ", "echo"));
    if (rows.length > 3) print(`… ${rows.length - 3} more line${rows.length > 4 ? "s" : ""}`, "echo");
    play("click");
    print(`PACKET ASSEMBLED · ${new TextEncoder().encode(e.message).length} B · INTENT ${intent.id.toUpperCase()}`);
    print(contact.form.sending);

    const sent: Sent = await sendEnquiry({ ...e, trap: trap.current?.value }).catch(() => ({ ok: false }));
    if (sent.ok) {
      setValue("");
      setWho({ name: "", email: "", phone: "" });
      print(contact.form.sent.replace("{email}", e.email.toUpperCase()), "ok");
      later(450, () => print(intent.reply, "ok"));
      play("success");
    } else if (sent.field) {
      refuse(sent.field);
    } else {
      // never lose what they typed: hand all of it to their own mail app
      print(contact.form.fallback, "err");
      const body = `${e.message}\n\n— ${e.name}\n${e.email}${e.phone ? `\n${e.phone}` : ""}`;
      later(450, () => {
        window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(intent.subject)}&body=${encodeURIComponent(body)}`;
      });
      later(1400, () => print(`NOTHING OPENED? WRITE TO ${profile.email}`));
    }
    setBusy(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void transmit();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") {
      play("type");
      markTyping();
    }
  };

  return (
    <div
      ref={shell}
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className={cn(
        "overflow-hidden rounded-[10px] border-2 border-fg bg-surface transition-[border-color,box-shadow] duration-200",
        "focus-within:border-signal focus-within:shadow-[0_0_0_4px_rgb(255_90_31/0.18)]",
        className,
      )}
    >
      <div className="flex h-10 items-center gap-2 border-b border-line bg-ink px-4">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-signal" />
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-bone" />
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-bone" />
        <span className="ml-3 truncate font-mono text-micro uppercase tracking-[0.14em] text-bone/70">~/contact/new-message</span>
        <span className="ml-auto shrink-0 font-mono text-micro uppercase tracking-[0.14em] text-signal">{intent.id}</span>
      </div>

      <form
        noValidate
        className="relative px-[clamp(1rem,2.5vw,1.75rem)] pb-4 pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void transmit();
        }}
      >
        <div className="mb-5 grid gap-x-6 gap-y-4 sm:grid-cols-3">
          {WHO.map((f) => (
            <label
              key={f}
              data-cursor="text"
              className="flex min-w-0 flex-col gap-1.5 border-b border-dashed border-line pb-2 transition-colors focus-within:border-signal"
            >
              <span className="font-mono text-micro uppercase tracking-[0.14em] text-signal">{contact.form.fields[f].label}</span>
              <input
                ref={(el) => {
                  inputs.current[f] = el;
                }}
                name={f}
                type={KIND[f]}
                autoComplete={AUTO[f]}
                required={f !== "phone"}
                maxLength={f === "email" ? 254 : f === "name" ? 80 : 20}
                value={who[f]}
                placeholder={contact.form.fields[f].placeholder}
                onChange={(e) => setWho((w) => ({ ...w, [f]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key.length === 1 || e.key === "Backspace") play("type");
                }}
                className="w-full min-w-0 bg-transparent font-mono text-[0.9375rem] text-fg caret-signal outline-none placeholder:text-fg-muted"
              />
            </label>
          ))}
        </div>
        {/* honeypot: people never see or reach it; bots fill every field they find */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <input ref={trap} name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        <ol aria-live="polite" className="space-y-1 font-mono text-[0.875rem] leading-[1.5] [&:not(:empty)]:mb-3">
          {log.map((l) => (
            <LogLine key={l.id} line={l} chaos={chaos} />
          ))}
        </ol>

        <label className="flex cursor-text items-start gap-3" data-cursor="text">
          <span aria-hidden className={cn(TYPE, "select-none text-signal")}>
            &gt;
          </span>
          <span className="sr-only">Your message</span>
          <span className="relative block min-w-0 flex-1">
            <textarea
              ref={field}
              id={inputId}
              rows={1}
              value={value}
              placeholder={intent.prompt}
              autoComplete="off"
              enterKeyHint="send"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onSelect={sync}
              onKeyUp={sync}
              onClick={sync}
              onFocus={sync}
              onBlur={sync}
              className={cn(
                TYPE,
                "block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-fg caret-transparent outline-none placeholder:text-fg-muted",
              )}
            />
            <span ref={mirror} aria-hidden className={cn(TYPE, "pointer-events-none invisible absolute inset-x-0 top-0 block whitespace-pre-wrap break-words")} />
            <span
              ref={caret}
              aria-hidden
              data-typing="0"
              data-hidden="0"
              className={cn(
                TYPE,
                "pointer-events-none absolute left-0 top-[0.2em] block h-[1.2em] w-[0.6em] animate-blink bg-signal",
                "data-[hidden=1]:opacity-0 data-[typing=1]:animate-none chaos:bg-accent chaos:[animation-duration:0.35s]",
              )}
            />
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-4">
          <p className="flex items-center gap-2 font-mono text-micro uppercase tracking-[0.12em] text-fg-muted coarse:invisible">
            <Kbd>↵</Kbd> send
            <span aria-hidden>·</span>
            <Kbd>⇧</Kbd>
            <Kbd>↵</Kbd> new line
          </p>
          <Button type="submit" variant="signal" size="sm" icon={<CornerDownLeft size={14} strokeWidth={2} />} aria-disabled={busy || undefined}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
