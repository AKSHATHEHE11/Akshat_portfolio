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
      id: "problem",
      label: "I have a problem",
      prompt: "what is broken?",
      subject: "A problem that needs solving",
      reply: "PROBLEM LOGGED. Problems are just ideas wearing a disguise.",
    },
    {
      id: "hi",
      label: "I just want to say hi",
      prompt: "say hi",
      subject: "Hello from the playground",
      reply: "HELLO RECEIVED. Hi back.",
    },
  ],
  ending: {
    status: "SESSION COMPLETE",
    heading: ["You made it", "this far."],
    accent: "far.",
    line: "That probably means we should build something.",
    restart: "Restart experience",
    signature: "AKSHAT / 2026 — BUILT WITH CURIOSITY",
  },
} as const;
