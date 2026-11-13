"use server";
import nodemailer from "nodemailer";
import { contact } from "@/data/contact";
import { profile } from "@/data/profile";
import { tidy, type Enquiry, type Field } from "./rules";

/** ok, a field the visitor got wrong, or plain failure (not configured / mail server down). */
export type Sent = { ok: true } | { ok: false; field?: Field };

/**
 * Delivers an enquiry from the contact terminal to Akshat's inbox with Nodemailer over SMTP.
 * Needs on the server (Vercel → Settings → Environment Variables):
 *   SMTP_USER  the mailbox that sends, e.g. work.brayill@gmail.com
 *   SMTP_PASS  for Gmail: an App Password (Google Account → Security → 2-Step Verification → App passwords)
 *   SMTP_HOST / SMTP_PORT  optional, default Gmail (smtp.gmail.com, 465)
 *   CONTACT_TO optional, defaults to profile.email
 * Without them, or if sending fails, it reports failure and the terminal opens the visitor's own mail
 * app with everything they typed, so nothing is lost.
 * ponytail: spam defence is a honeypot field only; add a rate limit if bots get through.
 */
export async function sendEnquiry(input: Enquiry & { trap?: string }): Promise<Sent> {
  if (input?.trap) return { ok: true }; // only a bot fills the hidden field: let it think it worked
  const t = tidy(input);
  if (!t.ok) return t;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO || profile.email;
  if (!user || !pass || !to) return { ok: false };

  const port = Number(process.env.SMTP_PORT || 465);
  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  const e = t.value;
  const subject = contact.intents.find((i) => i.id === e.intent)?.subject ?? "Hello";
  try {
    await mailer.sendMail({
      from: { name: "Portfolio contact", address: user }, // Gmail only sends as the signed-in mailbox
      to,
      replyTo: { name: e.name, address: e.email }, // "Reply" goes straight to the visitor
      subject: `${subject} — ${e.name}`,
      text: `Name: ${e.name}\nEmail: ${e.email}\nPhone: ${e.phone || "—"}\nAbout: ${e.intent}\n\n${e.message}`,
    });
    return { ok: true };
  } catch (err) {
    console.error("contact: send failed", err);
    return { ok: false };
  }
}
