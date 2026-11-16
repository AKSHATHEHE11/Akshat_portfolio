# Real project websites inside their worlds

Every project world has a screen that fits its metaphor. A project with a real website gets the
plain showcase page (`components/worlds/showcase/`) in the site's own colours and fonts, and its screen
runs the site via `components/worlds/LiveScreen.tsx`, driven by the project's `live` field in
`data/projects/<slug>.ts`.

```ts
live: {
  url: "https://your-project.com",
  mode: "embed",            // "embed" | "capture" | "link"
  device: "desktop",        // "desktop" | "tablet" | "phone"
  capture: "/projects/your-project/desktop.jpg", // optional poster / capture image
  permission: "own",        // "own" | "client-approved"
},
```

## The three modes

| mode | what visitors see | when to use it |
|---|---|---|
| `embed` | The real site, live and fully usable, inside the world's screen. It loads only after the visitor presses **Power on**, runs sandboxed, and the address bar shows the real domain. | The site allows framing (check it first). |
| `capture` | A full-page screenshot of the site scrolling itself inside the screen, plus **Open live site ↗**. | The site refuses framing and you can't change that. |
| `link` | A framed poster plus **Open live site ↗**. | Quick fallback. |

## Keeping it legal

1. **Your own projects are fine.** For client projects, get the client's written OK (an email is
   enough) and set `permission: "client-approved"`. Check your contract/NDA first.
2. **Never bypass a site's framing block.** Some sites tell browsers "don't show me inside other
   sites" (`X-Frame-Options` or CSP `frame-ancestors`). Proxying, mirroring or stripping those
   headers is where it becomes wrong, and it's not done here. A blocked site uses `capture` or `link`.
3. **It stays theirs.** The real domain is always visible, there's always a link to the original,
   and the content is never altered.
4. **Public pages only.** Don't embed logged-in areas with real customer data. For dashboards, use a
   demo account or a demo mode with fake data.
5. This is general guidance, not legal advice. For big clients, follow their contract.

## Step 1 — check each link

```bash
node scripts/check-embeds.mjs https://site-one.com https://site-two.in --origin=https://your-portfolio-domain.com
```

`✓ EMBED OK` → use `mode: "embed"`. `✗ BLOCKED` → see step 2 or use `capture`.

## Step 2 — on sites YOU control, allow the portfolio to frame them

Add one response header to the project site (replace the domain; add `http://localhost:3000` while
testing locally):

**Next.js** (`next.config.js` of the project site)
```js
async headers() {
  return [{
    source: "/:path*",
    headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self' https://your-portfolio-domain.com" }],
  }];
}
```

**Vercel static site** (`vercel.json`)
```json
{ "headers": [{ "source": "/(.*)", "headers": [
  { "key": "Content-Security-Policy", "value": "frame-ancestors 'self' https://your-portfolio-domain.com" }
] }] }
```

**Netlify** (`public/_headers`)
```
/*
  Content-Security-Policy: frame-ancestors 'self' https://your-portfolio-domain.com
```

Remove any `X-Frame-Options: DENY` the site sends. When `frame-ancestors` is present, browsers
ignore it anyway, but it's cleaner without. Hosted builders (Shopify, Wix, some Webflow plans)
usually can't change this. Use `capture` for those.

## Step 3 — sites that stay blocked: capture them

```bash
node scripts/capture-site.mjs https://site-two.in site-two
# → public/projects/site-two/desktop.jpg and phone.jpg
```

Then set `mode: "capture", capture: "/projects/site-two/desktop.jpg"`.

## Live projects today

| Project | URL | Mode | Why |
|---|---|---|---|
| Fybr8 | https://www.fybr8.com/ | `embed` | No framing restrictions (checked 2026-11-16 with `npm run embeds`). |
| Safar Zaika | https://safar-zaika-main.vercel.app/ | `capture` | Sends `X-Frame-Options: DENY`. To switch to `embed`, that app must allow `frame-ancestors 'self' https://justttakshat.vercel.app`. |

**What updates by itself:** with `embed`, visitors see the site as it is right now. These were copied
once and don't follow later changes to the site: the card picture (`public/projects/<slug>/card.webp`),
the poster/capture images, the page's colours (`color`) and fonts (`components/worlds/showcase/fonts.ts`),
and the written text and `highlights` in the data file. Refresh them by hand after a redesign, and re-run
`npm run embeds -- <url>` if the site's security headers change.

## What to send for each real project

- name, the one-line pitch, who it's for
- live URL (and whether it's yours or a client's, with permission)
- your role, year, stack
- 2–3 results or numbers if you have them
- brand colours / logo / screenshots (optional; they help design the world)
- a demo login if the useful part sits behind one (a public demo mode is better)
