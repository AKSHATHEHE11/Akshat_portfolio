// Checks the contact form's rules (components/home/contact/rules.ts): what may reach the inbox.
//   npm run check:contact
// Node runs the .ts file directly (type stripping, Node 23.6+).
import assert from "node:assert/strict";
import { tidy } from "../components/home/contact/rules.ts";

const good = { intent: "work", name: "  Ada   Lovelace ", email: "ada@example.com", phone: "", message: " Hello " };

const ok = tidy(good);
assert.equal(ok.ok, true);
assert.equal(ok.value.name, "Ada Lovelace", "name: trimmed, inner spaces collapsed");
assert.equal(ok.value.message, "Hello", "message: trimmed");

const wrong = (patch) => tidy({ ...good, ...patch }).field;
assert.equal(wrong({ name: "   " }), "name", "blank name");
assert.equal(wrong({ name: "x".repeat(81) }), "name", "name over 80");
assert.equal(wrong({ email: "ada@example" }), "email", "email without a domain ending");
assert.equal(wrong({ email: "a da@example.com" }), "email", "email with a space");
assert.equal(wrong({ phone: "call me" }), "phone", "phone with letters");
assert.equal(wrong({ phone: "+91 98765 43210" }), undefined, "Indian phone format passes");
assert.equal(wrong({ message: "" }), "message", "empty message");
assert.equal(wrong({ message: "x".repeat(4001) }), "message", "message over 4000");
assert.equal(tidy(null).field, "name", "no input at all");

console.log("✓ contact rules: all checks passed");
