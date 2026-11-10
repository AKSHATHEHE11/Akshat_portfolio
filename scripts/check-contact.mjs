// Self-check for the contact form's rules (the terminal and the server both use them):
//   node scripts/check-contact.mjs
import assert from "node:assert/strict";
import { tidy } from "../components/home/contact/rules.ts";

const good = { intent: "work", name: "  Ada   Lovelace ", email: " ada@example.com ", phone: "", message: " hi \n" };
assert.deepEqual(tidy(good), { ok: true, value: { intent: "work", name: "Ada Lovelace", email: "ada@example.com", phone: "", message: "hi" } });
assert.equal(tidy({ ...good, phone: "+91 98765 43210" }).ok, true);
assert.equal(tidy({ ...good, phone: "(022) 555-0134" }).ok, true);
assert.deepEqual(tidy({ ...good, name: "   " }), { ok: false, field: "name" });
assert.deepEqual(tidy({ ...good, name: "x".repeat(81) }), { ok: false, field: "name" });
assert.deepEqual(tidy({ ...good, email: "ada@" }), { ok: false, field: "email" });
assert.deepEqual(tidy({ ...good, email: "ada example.com" }), { ok: false, field: "email" });
assert.deepEqual(tidy({ ...good, phone: "call me" }), { ok: false, field: "phone" });
assert.deepEqual(tidy({ ...good, message: "  " }), { ok: false, field: "message" });
assert.deepEqual(tidy({ ...good, message: "x".repeat(4001) }), { ok: false, field: "message" });
// junk straight from the network, not from the terminal
assert.deepEqual(tidy({ intent: 1, name: null, email: undefined }), { ok: false, field: "name" });
assert.deepEqual(tidy(undefined), { ok: false, field: "name" });
console.log("contact rules: ok");
