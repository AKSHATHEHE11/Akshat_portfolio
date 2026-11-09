import { play } from "@/lib/sound";
import { emit } from "@/lib/system";

/** Copies text, plays the matching sound and raises a HUD toast. Resolves false when the clipboard is blocked. */
export async function copyText(text: string, toast: string) {
  try {
    await navigator.clipboard.writeText(text);
    play("success");
    emit("toast", { text: toast });
    return true;
  } catch {
    play("error");
    emit("toast", { text: "CLIPBOARD BLOCKED — SELECT IT BY HAND" });
    return false;
  }
}
