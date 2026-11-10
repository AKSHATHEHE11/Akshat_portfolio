"use client";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { Button } from "@/components/ui/Button";

/** "Work with me": the way to the contact terminal on the home page (already home: scroll there). */
export function WorkCta({ size = "sm", className, intro, onGo }: { size?: "sm" | "md"; className?: string; intro?: boolean; onGo?: () => void }) {
  const pathname = usePathname();
  const lenis = useLenis();
  return (
    <Button
      href="/#contact"
      variant="signal"
      size={size}
      magnetic={false}
      icon={<ArrowUpRight size={size === "sm" ? 14 : 16} strokeWidth={2} />}
      className={className}
      data-intro={intro ? "" : undefined}
      onClick={(e) => {
        onGo?.();
        if (pathname !== "/") return;
        e.preventDefault();
        lenis?.scrollTo("#contact");
      }}
    >
      Work with me
    </Button>
  );
}
