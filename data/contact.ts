// Contact + ending copy. DUMMY in the right shape.

export const contact = {
  heading: ["What should", "we build?"],
  /** accent word inside the heading */
  accent: "build?",
  intents: [
    {
      id: "work",
      label: "I want to work with you",
      prompt: "what are we making? scope, timeline, budget",
      subject: "Let's work together",
      reply: "BRIEF RECEIVED. Let's make it real.",
    },
    {
      id: "idea",
      label: "I have an idea",
      prompt: "describe your idea",
      subject: "An idea worth building",
      reply: "IDEA RECEIVED. Ideas are my favourite input.",
    },
    {
      id: "hi",
      label: "I just want to say hi",
      prompt: "say hi",
      subject: "Hello from the playground",
      reply: "HELLO RECEIVED. Hi back.",
    },
  ],
  /** The terminal's fields and what it prints. */
  form: {
    fields: {
      name: { label: "name", placeholder: "your name" },
      email: { label: "email", placeholder: "you@company.com" },
      phone: { label: "phone · optional", placeholder: "+91 …" },
    },
    note: "Goes straight to my inbox. Your name, email and number are only used to reply to you.",
    sending: "TRANSMITTING…",
    sent: "DELIVERED. I'LL WRITE BACK TO {email}.",
    fallback: "DIRECT LINE IS DOWN — OPENING YOUR MAIL APP INSTEAD…",
    errors: {
      name: "WHO'S ASKING? ADD YOUR NAME FIRST.",
      email: "THAT EMAIL LOOKS OFF — I NEED IT TO REPLY.",
      phone: "THAT NUMBER LOOKS OFF. FIX IT OR LEAVE IT EMPTY.",
      message: "NOTHING TO SEND — TYPE A MESSAGE FIRST.",
    },
  },
  ending: {
    status: "SESSION COMPLETE",
    heading: ["You made it", "this far."],
    accent: "far.",
    line: "That probably means we should build something.",
    restart: "Restart experience",
    signature: "AKSHAT / 2026 — BUILT WITH CURIOSITY",
  },
} as const;
