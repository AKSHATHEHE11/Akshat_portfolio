// Akshat's design side (/design). The roles and likes are his, from his Behance cover (PORTFOLIO);
// the line under each discipline is DUMMY in the right shape — replace with his own words. The photo is
// cut from that cover; a sharper original can replace public/design/akshat.webp at the same size ratio.
// His design pieces arrive later: a gallery goes between the disciplines and the Behance link then.

export const design = {
  iAm: ["Graphic designer", "Photo & video editor", "3D designer"],
  iLike: ["Music", "Comedy", "Games"],
  photo: {
    src: "/design/akshat.webp",
    width: 960,
    height: 642,
    alt: "Akshat Agrawal in black and white, glasses on, looking off to the side",
  },
  kicker: "What I do with pixels",
  disciplines: [
    { title: "Graphic design", line: "Posters, social posts and identities. Type first, then everything else." },
    { title: "Photo & video editing", line: "Colour, cuts and pacing: the part where footage turns into a story." },
    { title: "3D design", line: "Objects, scenes and light, made to be looked at from every side." },
  ],
  behance: {
    href: "https://www.behance.net/gallery/205615917/PORTFOLIO",
    label: "Behance · Portfolio",
    title: ["The full portfolio", "lives on Behance."],
    cta: "Open on Behance",
  },
  cta: {
    title: ["Need a designer", "who also ships?"],
    line: "I design it, edit it, model it, and build the thing it goes into. Leave your name, email and number and I’ll get back to you.",
    button: "Work with me",
  },
} as const;
