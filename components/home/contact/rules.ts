// One set of rules for a contact enquiry, used by the terminal (to answer instantly) and by the server
// (because the terminal can be bypassed).

export type Field = "name" | "email" | "phone" | "message";
export type Enquiry = { intent: string; name: string; email: string; phone: string; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;

/** A trimmed copy of the enquiry, or the first field that is wrong. Phone is optional. */
export function tidy(e: Enquiry): { ok: true; value: Enquiry } | { ok: false; field: Field } {
  const s = (v: unknown) => String(v ?? "").trim();
  const v = { intent: s(e?.intent), name: s(e?.name).replace(/\s+/g, " "), email: s(e?.email), phone: s(e?.phone), message: s(e?.message) };
  if (!v.name || v.name.length > 80) return { ok: false, field: "name" };
  if (v.email.length > 254 || !EMAIL.test(v.email)) return { ok: false, field: "email" };
  if (v.phone && !PHONE.test(v.phone)) return { ok: false, field: "phone" };
  if (!v.message || v.message.length > 4000) return { ok: false, field: "message" };
  return { ok: true, value: v };
}
