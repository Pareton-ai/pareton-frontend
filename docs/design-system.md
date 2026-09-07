# Pareton Design System

Pareton is an inference optimization company running as **Bittensor Subnet 10**. The
product continuously searches the serving-configuration space — kernels, KV cache,
batching, quantization, launch flags, hardware — and keeps a change only when it beats
the customer's own production baseline under their own latency cap. The public tagline is
"Faster. Cheaper. Verified on yours."

The brand reads as a technical journal, not a crypto launch: warm off-white paper,
near-black Fraunces display type, a graphite sans, one restrained electric blue, hairline
rules, wide-tracked mono labels, and a lot of negative space.

## Sources

- **Repository** — `github.com/pareton-ai/pareton-frontend`, branch `main` (Next.js 16 + Tailwind v4).
  - `src/components/landing/landing.css` — the landing page's complete visual system; the primary source for these tokens.
  - `src/app/globals.css` — product/docs tokens, the type scale, and the blueprint grid.
  - `src/lib/landing-fonts.ts` — the three brand families.
  - `src/lib/site-content.ts` — every line of landing copy, in one file.
  - `src/components/ui/`, `src/components/dashboard/` — the component inventory recreated here.
- **Logo files** supplied by the user and copied from `public/` into `assets/`.
- Live site: https://pareton.ai

## Surfaces

The brand uses four distinct grounds. Do not merge them.

| Surface     | Ground                 | Type                          | Where                                                                                                |
| ----------- | ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Paper**   | `--paper` #f4efe4      | Bricolage / Fraunces / Azeret | Landing page, print, social                                                                          |
| **Plate**   | `--plate` #101114      | same three                    | Method section only. Inner stage is `#0c0d10`.                                                       |
| **Ink**     | `--ink` #161412        | same three                    | Close banner and footer                                                                              |
| **Product** | `--background` #0f1013 | Inter / IBM Plex Mono         | Dashboard and docs dark. Dashboard swaps to Bricolage / Fraunces / Azeret inside `.dashboard-shell`. |

Docs also has a light theme (`html.light`: `#fafafa`, `--muted` #6b7078, `--accent` #1f4fd4, `--rust` #b4532a). It is not the brand voice. Do not "fix" it, and do not use Inter anywhere else.

---

## Visual foundations

**Colour.** Two grounds and one accent, plus quiet text and rust. Paper (#f4efe4) is warm and slightly recessive;
its deeper sibling `--paper-deep` (#ebe3d2) fills cards. Ink (#161412) is a warm near-black,
never #000. On dark surfaces the ink inverts to `--plate-fg` (#ece8df) — still warm, never a
cool grey. The accent exists in two values because one blue cannot serve both grounds:
`--blue` (#3b78ff) on dark, `--blue-deep` (#1f4fd4) on light. Rust (#c47a4a / #b4532a) is the
only other hue and appears only for infrastructure faults, void rounds, stalled steps, denied
paths, and error pages. `--quiet` (#6a6458) is the quiet text on paper. `--secondary` (#a8a396)
is the secondary text on product. `--accent-dim` is a 14% blue wash for hover states.
There are **no gradients anywhere** — not in backgrounds, not in bars, not behind text.
The only exception is `.bg-blueprint`, which uses four `linear-gradient` grid lines at ~2.6% and ~1.6% warm white, 24px / 96px.

**Type.** Three families, each with one job.
Fraunces is display only, always weight 400, optical sizing on, tracking −0.03em (−0.035em at
hero size), leading 0.95–1.22. It is never bold and never used for UI.
Bricolage Grotesque carries body copy at 400 and 500; **500 is the heaviest weight in the
system**. Emphasis is Fraunces italic, not bold. The one exception is the hero lede, which
wraps its second sentence in `<strong>` and therefore paints at 700.
Azeret Mono is 11px (12px in product), weight 500, uppercase, 0.16em tracking — the only
uppercase text anywhere, used for eyebrows, field keys, status chips, and footers. On the
landing page the hero kicker is 0.9rem and nav links are 0.8rem.
Measures are tight: lede 36ch, body 42ch, titles 14–16ch.

**Spacing.** A 1180px measure with `clamp(1.25rem, 4vw, 3.25rem)` side padding and a 4.5rem
sticky nav. Vertical section rhythm is always a viewport clamp, never a fixed value, so
sections breathe on large screens. Component padding uses the source's exact asymmetric
values (`1.6rem 1.6rem 1.7rem` on a card, `1.15rem 1.2rem 1.3rem` on a colophon cell) —
the extra bottom sixteenth is deliberate optical balance. Do not snap these to a 4/8px grid.

**Borders, radii, depth.** Everything is square: radius 0 on cards, buttons, panels, chips,
inputs. The only exceptions are the logo tile (4px on landing, 5px on dashboard) and the
scroll-cue pill. There is **no shadow system** on the landing page. Depth is expressed with a
1px hairline (`--rule` at 12% ink, `--rule-strong` at 22%, `--plate-rule` at 10% paper on dark)
or with a surface value change. Dashboard grids draw their internal rules with a 1px `gap`
over a rule-coloured background rather than per-cell borders. Landing grids use per-cell
borders. The score chart tooltip uses `shadow-lg`. Live activity uses `rounded-full` dots.

**Backgrounds and texture.** No imagery, no illustration, no photography anywhere in the
brand. Two textures only: a fixed fractal-noise `.fiber` layer at 0.28 opacity in multiply
blend over the paper (giving it a printed grain), and a `.bg-blueprint` alignment grid at
24px/96px in ~2% white on dark surfaces. Transparency and blur appear in exactly two places:
the sticky nav (82% paper + 16px blur) and the mobile phase chip (88% plate + 12px blur).

**Motion.** The hero and mark use `cubic-bezier(0.16, 1, 0.3, 1)`, a decelerating settle.
Hero copy rises 16px over 0.9s with 0.08s-stepped stagger; the mark's filled cells
settle from 18px + 0.92 scale over 1.1s. State transitions are 0.15–0.22s and use `ease`.
The hero mark cycles the search axes on a 5s hold. `prefers-reduced-motion` parks every
animation on its final frame — the axis rolls park on distinct axes rather than freezing on one.

**Interaction states.** Hover on the primary button swaps the fill from ink to `--blue-deep`
(on the dark close banner, paper to `--blue`). Nav links move from `--quiet` to `--ink`.
Rail items move 0.4 → 0.75 opacity. Icon buttons gain a blue border plus a 22% blue wash.
There is no press state and no transform on click. Focus is `2px solid var(--blue-deep)`
at `3px` offset on light landing controls. On the dark rail it is `2px solid var(--blue)`
at `4px`. On socials it is `2px solid var(--blue)` at `3px`. On dashboard controls it is
`2px solid var(--accent)` at `2px` offset, often negative.

**Accessibility floor.** `--muted` / `--plate-quiet` (#9a958a) is 6.38:1 on the dark canvas;
the two accent values exist specifically so blue clears 4.5:1 on whichever ground it sits on
— never use `--blue` on paper or `--blue-deep` on the plate. Interactive targets are 2.75rem
(44px) minimum on the landing page. Dashboard back-link and pager are 36px. Decorative
elements (the hero mark, the fiber) carry `aria-hidden`. Meters expose `role="img"` with a
label because the bar is the only carrier of the value's shape.

---

## Content fundamentals

**Voice: confident, technical, understated.** Short declaratives. Full stops where a lesser
brand would use an em dash. The reader is addressed as **you**, and "you" means an engineer
who owns GPU spend: _"You run vLLM, TensorRT-LLM, or SGLang in production."_ The company is
"Pareton" or "we", used sparingly.

**Sentence fragments as rhythm.** The site's most characteristic move is a run of clipped
sentences: _"Same GPUs. Same traffic. Same latency cap. If it is not cheaper, it is discarded."_
Headlines do the same: _"Faster. Cheaper. Verified on yours."_

**Claims are conditional and falsifiable.** Nothing is promised; everything is gated.
_"A change only counts if it beats today."_ _"We only keep a change if your latency cap still
holds."_ Where a competitor would write "up to 40% faster", Pareton writes the gate.

**Casing.** Sentence case in headlines and titles, always ending in a period. Uppercase is
reserved for mono labels. Section indices are written `01 · Brief`, `02 · Method` — two digits,
a middot with spaces, then a one-word name. Product state tokens stay lowercase in source
(`infra_failed`) and are uppercased by CSS. The footer tagline is
`Faster. Cheaper. Verified on yours` with no period, then forced uppercase by `.mono`.

**No emoji. Ever.** No exclamation marks. No "unlock", "supercharge", "revolutionize",
"game-changing". No leaderboard language on the landing page. The dashboard uses crown,
leader, and Trophy. Numbers are specific and unrounded (`0.71×`, `312 ms`, `p99 TTFT`) or
they are not given. The Method visuals use 100 / 93 / 88 / 84 GPU hours.

**Anti-hype about its own novelty.** The closing line is a statement of intent, not a promise:
_"Pushing the Pareto frontier of inference."_ Status is stated plainly: _"Coming Soon ·
Bittensor Subnet 10."_

---

## Iconography

Pareton uses **Lucide** (`lucide-react`) for product chrome and for generic glyphs on the
landing page. Three exceptions are hand-written inline SVGs, all on a 24×24 viewBox:

- `RepeatIcon` and `CheckIcon` in `src/components/landing/method.tsx` — the loop note and the
  "within latency cap" hold.
- The three give-card glyphs in `SetupVisual` — a titled frame (model), a rack (GPUs), and a
  clock (latency cap). Simple geometry only: `rect`, `circle`, one or two `path` strokes.
- Four brand marks in `src/components/landing/socials.tsx` (X, LinkedIn, Discord, GitHub),
  which ship as **filled** paths with `fill="currentColor"` because Lucide dropped brand
  glyphs. Email is Lucide's `Mail`, so it stays a stroke.

Specification for everything except the four brand marks:

- `fill: none`, `stroke: currentColor` or `var(--blue)`, `stroke-width: 1.6` (1.8 on the smallest).
- 14px on the landing page and in the dashboard (`size-3.5`), 18px on give-cards, 1.05rem in
  the social buttons. Dashboard also uses 12px (`size-3`) and 16px (`size-4`).
- Icons are always paired with a mono caps label or an `sr-only` name. They never carry
  meaning alone.
- Never two-tone, never in a coloured circle.

For anything new, load Lucide from CDN at stroke-width 1.6 — do not draw a new glyph by hand
and do not mix in a second icon family. **No emoji and no unicode symbols as icons.** The one
non-alphabetic character the brand uses in text is the middot (`·`) as a separator.

### Brand assets in `assets/`

| File                         | What                                          |
| ---------------------------- | --------------------------------------------- |
| `logo.png`                   | 512px mark — three blue cells on a black tile |
| `logo-transparent-bg.png`    | Same mark, no tile                            |
| `logo-text.png`              | Horizontal wordmark lockup (2784×750)         |
| `android-chrome-192x192.png` | Small-size mark                               |
| `android-chrome-512x512.png` | Large-size mark                               |

The mark **is** the hero grid: a 2×3 field where cells 1, 4 and 5 are filled. Filled cells are
validated configurations; empty cells are the space still being searched. Reuse the grid at
any scale, but keep the cells true squares and keep the same three positions. Never redraw
the mark as SVG.

---

## Index

- `styles.css` — the entry point; imports everything below.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `borders.css`, `motion.css`.
- `assets/` — logos.
- `guidelines/` — 17 foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/core/` — `Button`, `MonoLabel`, `Logo`, `MarkGrid`.
- `components/layout/` — `Wrap`, `SectionHeader`, `Colophon`, `LawCard`.
- `components/data/` — `Panel` (+`PanelRow`), `Field` (+`FieldGrid`), `StatusChip`, `MeterRow`.
- `ui_kits/website/` — full recreation of the pareton.ai landing page.
- `slides/` — five 1280×720 slide types: title, section, statement, comparison, close.
- `social/` — three fixed-canvas graphic templates (see `social/README.md`).
- `Launch Graphic.dc.html` — the Sept 2026 launch card this system was distilled from.

### Intentional additions

- **`MarkGrid`** — the landing page builds its hero mark inline in `hero.tsx` rather than as a
  component. It is extracted here because it is the brand's one reusable graphic device.
- **`Wrap`** — a component form of the `.wrap` CSS class, so JSX consumers get the measure.

### Not built

- `Popover`, `EmptyState`, `BackLink`, `TabScroller`, `CopyableMono` and the campaign/round
  tables exist in the repo but are compositions or thin fumadocs wrappers; say the word and
  they get added.
- The repo's `ui/button.tsx` is a fumadocs `cva` wrapper for the docs site, not the brand
  button. `components/core/Button` recreates the landing `.btn` instead, which is the one
  users see.
