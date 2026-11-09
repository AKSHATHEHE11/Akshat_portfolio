"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { copyText } from "./copy";

/** COPY key: copies `text`, flips to COPIED for a moment and raises the HUD toast. */
export function CopyKey({ text, toast }: { text: string; toast: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      variant="key"
      size="sm"
      icon={done ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
      aria-label={`Copy ${text}`}
      data-chaos-escape
      onClick={async () => {
        if (!(await copyText(text, toast))) return;
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1600);
      }}
    >
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
    </Button>
  );
}
