"use server";
import { contact } from "@/data/contact";
import { profile } from "@/data/profile";
import { tidy, type Enquiry, type Field } from "./rules";

/** ok, a field the visitor got wrong, or plain failure (not configured / provider down). */
export type Sent = { ok: true } | { ok: false; field?: Field };

/**
 * Delivers an enquiry from the contact terminal to Akshat's inbox through Resend's HTTP API.
 * Needs RESEND_API_KEY on the server. Delivers to CONTACT_TO if set, else to profile.email. With Resend's
 * shared onboarding sender, that address must be the one the Resend account was opened with.
 * Without them, or if Resend fails, it reports failure and the terminal opens the visitor's own mail
 * app with everything they typed, so nothing is lost.
 * ponytail: spam defence is a honeypot field only; add a rate limit if bots get through.
 */
export async function sendEnquiry(input: Enquiry & { trap?: string }): Promise<Sent> {
  if (input?.trap) return { ok: true }; // only a bot fills the hidden field: let it think it worked
  const t = tidy(input);
  if (!t.ok) return t;
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || profile.email;
  if (!key || !to) return { ok: false };

  const e = t.value;
  const subject = contact.intents.find((i) => i.id === e.intent)?.subject ?? "Hello";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to: [to],
        reply_to: e.email,
        subject: `${subject} — ${e.name}`,
        text: `Name: ${e.name}\nEmail: ${e.email}\nPhone: ${e.phone || "—"}\nAbout: ${e.intent}\n\n${e.message}`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    console.error("contact: Resend answered", res.status, await res.text());
  } catch (err) {
    console.error("contact: send failed", err);
  }
  return { ok: false };
}
