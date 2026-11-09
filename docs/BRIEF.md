# AKSHAT/OS — build brief

Read this fully before writing code. It is the shared contract for everyone building this site.

## 1. What this is

A portfolio for **Akshat Agrawal** that behaves like a **digital playground / personal operating system**.
Visitors don't browse it; they explore it. Each project opens into its **own world**. A global
**Chaos Mode** turns the whole site into a stranger, more experimental version of itself.

Design philosophy: **controlled chaos** — about 70% strict system, 20% play, 10% surprise.
"WOW without becoming unusable." Calm sections make the wild moments land: *if everything is crazy,
nothing is crazy.*

Visual direction: a **retro lab / hardware console** — cream device bodies, orange CRT phosphor,
keycaps, knobs, toggle switches, status LEDs, pipes and terminals — on a warm-bone editorial page with
heavy grotesk type, an italic serif accent and tiny technical mono labels.

Stack: Next.js 16.4 (App Router, Turbopack, `cacheComponents` OFF), React 19.3, TypeScript, Tailwind v4,
GSAP 3.15 (all plugins free), Motion 14 (`motion/react`), Lenis, Swiper 14, three + @react-three/fiber 9 +
drei 10 + @react-three/postprocessing, matter-js, lucide-react. **Next 16.4 differs from older Next** —
when unsure about an API, read `node_modules/next/dist/docs/`.

## 2. Hard rules — the "doesn't look AI-made" list

1. **No eyebrow → heading → subline → buttons formula.** A section may be: only a heading; only an
   interaction; an object with a 3-word annotation; a heading + one line when that line is necessary.
   Never a small uppercase label sitting directly above every heading.
2. **No generic section numbering** ("01 / ABOUT", "02 / PROJECTS" over each section). Indexes belong to
   navigation, rails and lists — not section headers.
3. **Cards are not the default.** Prefer full-bleed compositions, lists, rails, panels attached to
   hardware, canvases, split screens. If you use a card, it must earn it (and must not be a 3-up grid
   of icon+title+text).
4. **Radius is a mix**: sharp (0), 4px, 8px, 12px, pills, and big device radii (`rounded-device`) only on
   hardware bodies. Never `rounded-2xl` on everything.
5. **No AI copy.** Banned words: innovative, seamless, cutting-edge, elevate, unleash, empower,
   delightful, leverage, robust, revolutionize, journey (as a buzzword), "crafting experiences".
   Voice: first person, short, specific, a little dry. Numbers and nouns over adjectives. No emoji.
6. **All content comes from `/data`** (or a project's `scene`). No hard-coded project names, bios, links
   or metrics inside components. UI chrome labels ("EXIT", "DRAG") are fine inline.
7. **No dead ends.** Every button does something real. No `href="#"`. If it looks interactive, it is.
8. **No placeholders that look unfinished** — no lorem ipsum, no grey boxes. Dummy content must look
   like real content.

## 3. Design tokens (app/globals.css) — use them, don't invent new values

### Colour (semantic Tailwind classes)
| token | use |
|---|---|
| `bg-bg` / `text-fg` | page background / text (flip with theme) |
| `text-fg-muted` | secondary text (AA on bg) |
| `border-line` / `border-line-strong` | hairlines / strong rules |
| `bg-surface`, `bg-surface-2` | panels, device faces |
| `bg-accent` + `text-accent-ink` | **lime #D8FF00** — fills, highlights, active states. **Never small lime text on light bg.** |
| `bg-signal` / `text-signal` + `text-signal-ink` | **orange #FF5A1F** — system signal, CRT phosphor, the accent word, LEDs. Ink text on orange (white fails AA). |
| raw: `bone`, `paper`, `ink`, `ink-soft`, `char`, `smoke`, `muted`, `lime`, `orange`, `go` | when a component is always the same regardless of theme (e.g. a cream device body) |

Mostly neutral. Accents appear strategically. Never a rainbow (project worlds may use their own palette).

### Type
- `font-display` (Archivo, variable **wght 100–900 and wdth 62–125**) — headlines + UI + body. Utility
  `display` = heavy uppercase tight display. Sizes: `text-display-s|m|l|xl` (fluid).
  The width axis is animatable: `font-variation-settings: "wdth" 70..125` for kinetic moments.
- `font-serif` (Instrument Serif, roman+italic) — **selective accent**: a name, one word, a pull quote.
  Utility `serif-accent`. Never body copy.
- `font-mono` (IBM Plex Mono) — system messages, coordinates, metadata, indexes. Utility `label`
  (micro, uppercase, tracked). Use sparingly — technical labels everywhere is its own cliché.
- `font-crt` (VT323) + utility `crt` — **only** inside device screens and the boot sequence.
- Text scale: `text-micro`, `text-label`, `text-body`, `text-lede`, `text-title`, `text-display-*`.

### Layout
- Container: `frame` utility (max 1680px, side margin `var(--margin)`). Full-bleed is allowed and encouraged.
- Asymmetric grids. 12-col mental model with `gap-(--gutter)`.
- Nav is fixed and ~`var(--nav-h)` tall at top: leave room.

### Depth / shadows
`shadow-key` (physical key), `shadow-key-down` (pressed), `shadow-hard` (ink offset), `shadow-float`, `shadow-glow`.

### Motion
Durations (lib/motion.ts `DUR`): micro .12 · hover .24 · reveal .64 · scene .9 · page 1.1 (s).
Eases: GSAP `"expo.out"` (arrivals), `"machine"` (mechanical state changes), `"snap"` (keys/toggles
overshoot), `"power3.inOut"`. CSS: `ease-out-expo`, `ease-out-quart`, `ease-machine`, `ease-snap`.
Motion springs: `SPRING.key`, `SPRING.soft`, `SPRING.magnet` from lib/motion.ts.

### z-index (lib/motion.ts `Z`) — never invent others
content 1 · sticky 20 · worldUi 40 · chaos 45 · hud 50 · nav 60 · sheet 70 · boot 90 · grain 95 · cursor 100.
Tailwind: `z-[60]` etc.

## 4. Interaction language

- **Buttons are keys.** Use `components/ui/Button.tsx` (`variant`: ink | ghost | accent | signal | key).
  Hover = magnetic pull + fill sweeping up + icon nudge. Press = 2px travel. Don't build other button styles.
- **Links**: `components/ui/TLink.tsx` for every internal link (adds the page transition; `kind` prop).
- **Magnetic**: `components/ui/Magnetic.tsx` wraps any element.
- **Text**: `components/ui/Reveal.tsx` (masked line/word/char reveal on scroll), `components/ui/Scramble.tsx`
  (decoding system text). Marks: `components/ui/marks.tsx` → `Bracket`, `Led`, `Corners`, `Kbd`.
- **Cursor states** — set on any element; the global cursor reads them:
  `data-cursor="hover|open|view|drag|text|hide"` and optional `data-cursor-label="OPEN"` for custom text.
  Project portals → `open`; images/previews → `view`; draggables → `drag`.
- **Sound** — `import { play } from "@/lib/sound"`: `play("tick")` on hover, `"click"`, `"press"`,
  `"toggle-on|off"`, `"open|close"`, `"type"`, `"glitch"`, `"drop"`, `"success"`… It is a no-op unless the
  visitor enabled sound. Use it on meaningful interactions; keep it subtle.
- **Focus**: every interactive element is keyboard reachable with a visible focus ring (global
  `:focus-visible` style exists; don't remove outlines).

## 5. Motion system

- Import GSAP only from `@/lib/gsap` (`gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase,
  Observer, useGSAP`). Heavier plugins (Flip, Draggable, InertiaPlugin, DrawSVGPlugin, MorphSVGPlugin,
  MotionPathPlugin, Physics2DPlugin) — import from `gsap/<Name>` and `gsap.registerPlugin()` in your feature.
- Always `useGSAP(() => {...}, { scope: ref, dependencies: [...] })` — it reverts on unmount.
  Event handlers that animate: wrap with `contextSafe`.
- Smooth scroll is **Lenis** (root instance, driven by the GSAP ticker; ScrollTrigger is synced).
  Access it with `useLenis()` from `lenis/react` (e.g. `lenis.stop()` during a modal, `lenis.scrollTo()`).
  Nested scroll areas: add `data-lenis-prevent`.
- Motion (`motion/react`) for presence (`AnimatePresence`), layout animations and small interactive
  state. GSAP for timelines, ScrollTrigger scenes, pinning, text.
- **Reduced motion**: `useReducedMotion()` from `@/lib/hooks` → show end states; no scrub, parallax,
  shake or auto-rotation. CSS animations are already collapsed globally.
- **Performance**: animate `transform`/`opacity` (and `clip-path`, `filter` sparingly). No layout
  properties in loops. Pause canvas/WebGL loops when off-screen (`useOnScreen` from `@/lib/hooks`,
  R3F `frameloop="demand"` or `<Canvas frameloop={visible ? "always" : "never"}>`). Cap DPR
  (`dpr={[1, 1.75]}`), lower on `coarse` devices. Lazy-load heavy client components with
  `next/dynamic(() => import(...), { ssr: false })` inside a client component.
- Shared pointer: `import { pointer } from "@/lib/pointer"` — read `x, y, nx, ny, vx, vy, speed` inside your
  own rAF/ticker/useFrame. Never add another global mousemove listener for position tracking.

## 6. System state, Chaos Mode, theme

`lib/system.ts` holds: `chaos, sound, theme, booted, secret, reducedMotion, coarse, world`.
Read in React with `useSystem(s => s.chaos)` (or helpers `useChaos()`, `useCoarse()`… in lib/hooks).
Change with `system.toggleChaos()`, `system.toggleSound()`, `system.toggleTheme()`, `system.setWorld(slug)`.
Mirrored to `<html data-chaos="on|off" data-theme="light|dark" data-sound data-secret data-booted data-world>`.

Tailwind variants: `chaos:` · `calm:` · `dark:` · `secret:` · `fine:` (mouse) · `coarse:` (touch).
Helpers: class `chaos-only` / `calm-only`.

**Chaos Mode contract** — every feature should have a considered chaos variant (not just a filter):
type that misbehaves, things that drift or escape, faster/glitchier motion, colour inversion moments.
Chaos must never break navigation, readability or the ability to turn it off. Opt-in hooks the global
chaos layer understands:
- `data-chaos-type` on a heading → letters get displaced near the cursor
- `data-chaos-drift` on any element → slow wobble/drift while chaos is on
- `data-chaos-escape` on a small element → it dodges the cursor once in a while

Event bus (`emit`/`on` from lib/system): `"boot:replay"`, `"chaos:burst"` {x,y}, `"restart"`,
`"toast"` {text}, `"console:key"` {key}. Add new events to this list if you introduce one.

Theme: light (bone) by default; dark is supported through the semantic tokens.

## 7. Page transitions & world morphs

React `<ViewTransition>` + the View Transitions API. Every `page.tsx` is wrapped in `<Page>`
(components/transitions/Page.tsx). Navigation kinds (`NavKind`): `nav-forward` (iris from click point),
`nav-back`, `world-enter` (portal morph), `world-exit` (CRT switch-off), `world-next` / `world-prev`
(rail wipe), plus `chaos` automatically while chaos is on.

**Portal → world morph**: wrap the portal's visual box in `<Morph name={morph.stage(slug)}>` and its title
in `<Morph name={morph.title(slug)} variant="text">`. The world renders the same two names on its stage
background and its title. Rules: one element per name per page; the morph target in the world must be
rendered immediately (not behind `dynamic()`/Suspense) or the pair won't form.

Fixed chrome that must not animate during page transitions gets `style={{ viewTransitionName: "site-nav" }}`
(names available: `site-nav`, `site-hud`, `site-rail`, `site-cursor`, `world-shell`).

## 8. 3D

- Models are generated **in code** and stored as GLB in `public/models/`. Write a Node script at
  `scripts/models/<name>.mjs` using `scripts/models/lib/export.mjs` (`exportGLB(scene, name)`, `mat()`,
  `THREE`) and run it with `node scripts/models/<name>.mjs`. Name every mesh/group the site needs to find or
  animate; put pivots at group origins. No image textures in GLBs — draw screens/labels at runtime with
  `CanvasTexture` on named meshes. Keep each GLB < 600 KB (merge geometry, modest segment counts).
- Load with drei `useGLTF("/models/<name>.glb")` (+ `useGLTF.preload`). Clone if used more than once.
- Lighting: **no remote HDRIs** (drei `Environment preset` downloads from a CDN — don't). Build env light
  with `<Environment resolution={256}><Lightformer …/></Environment>` or plain lights.
- R3F canvases go in client components loaded with `dynamic(..., { ssr: false })` and must have a
  non-WebGL fallback for reduced motion / failures. One Canvas per section at most; pause off-screen.
- Postprocessing (bloom, noise, chromatic aberration) only where it carries meaning (CRT glow, holograms,
  chaos).

## 9. Content & data

`data/site.ts` (nav, shortcuts, boot lines, signals) · `data/profile.ts` (identity, status, spec sheet,
bio) · `data/projects/*.ts` (+ `index.ts`: `projects`, `summaries`, `featured`, `getProject`,
`neighbours`) · `data/skills.ts` · `data/experience.ts` · `data/experiments.ts` · `data/think.ts` ·
`data/contact.ts`. Types in `lib/types.ts`. A world's extra content lives in its project's `scene`
(type declared in `components/worlds/<type>/scene.ts`).

Server pages pass data down as props where it is large (e.g. `summaries`). Small data modules may be
imported directly by client components.

## 10. Accessibility checklist

Semantic landmarks and a logical heading order (one `h1` per page) · real `<button>`/`<a>` · keyboard
operable (incl. drag alternatives) · visible focus · `aria-label`s on icon-only controls · alt text /
`aria-hidden` for decorative canvases · contrast AA for text · reduced-motion path · no information
conveyed by motion or colour alone · hover-only content also reachable by focus/tap.

## 11. Working in parallel (agents)

- **Only edit the files/folders you were assigned.** Everything else is read-only. Shared files
  (`app/layout.tsx`, `app/globals.css`, `components/ui/*`, `lib/*`, `data/*` except your own project
  file, `components/transitions/*`) are owned by the orchestrator. If you need a change there, describe
  it in your final report instead.
- **Never run** `npm install`, `next dev`, `next build`, or `next start`. All dependencies are installed.
  If you truly need a package, say so in your report and work around it.
- Check your work with `node scripts/check.mjs <your paths…>` (type-check + lint, serialized with a lock —
  it may wait for others; errors in other people's files are not yours). Finish with zero errors in your
  paths. Lint warnings from compiler-era `react-hooks/*` rules are acceptable when the pattern is correct.
- Mount points already exist as stub files with the right export names. Replace the stub's contents; keep
  the default export name and props signature.
- Use component-scoped CSS (CSS Modules `*.module.css` or a CSS file imported by your component) for
  styles Tailwind can't express. Don't add global selectors outside your feature's namespace.
