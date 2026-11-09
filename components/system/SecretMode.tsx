"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSystem } from "@/lib/system";
import { closeDevVision } from "./secret/actions";

// 99% of visitors never find it, so it isn't in anyone's bundle until they do.
const DevVision = dynamic(() => import("./secret/DevVision"), { ssr: false });

/**
 * "Dev vision" — the blueprint under the site: grid, outlines, live tokens, an element inspector.
 * On with a triple-click on the logo or Shift+D. Esc leaves it — but an open dialog gets Esc first,
 * and a world underneath never sees it.
 */
export default function SecretMode() {
  const secret = useSystem((s) => s.secret);

  useEffect(() => {
    if (!secret) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target instanceof Element && e.target.closest('[aria-modal="true"]'))) return;
      e.preventDefault();
      e.stopPropagation();
      closeDevVision();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [secret]);

  return (
    <AnimatePresence>
      {secret && (
        <motion.div key="dev-vision" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <DevVision />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
