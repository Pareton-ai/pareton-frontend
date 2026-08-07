<div align="center">

# Pareton (Frontend)

**The Intelligence Layer for AI Inference**

[![Discord](https://img.shields.io/discord/308323056592486420.svg)](https://discord.gg/bittensor)
[![Docs](https://img.shields.io/badge/docs-pareton.ai-blue)](https://pareton.ai)
[![X](https://img.shields.io/badge/X-@pareton__ai-000000?logo=x&logoColor=white)](https://x.com/pareton_ai)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[Website](https://pareton.ai) | [GitHub](https://github.com/pareton-ai) | [Discord](https://discord.gg/bittensor)

---

</div>

Website for [Pareton](https://pareton.ai) (Bittensor SN10). Next.js app that serves the public landing page at pareton.ai and a public campaigns dashboard.

Landing copy lives in one place (`src/lib/site-content.ts`). Clients that send `Accept: text/markdown` get a Markdown version of the home page instead of HTML.

## Setup

```bash
npm install
cp .env.example .env.local   # optional; defaults already point at production
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard). Docs: [http://localhost:3000/docs](http://localhost:3000/docs).

| Variable               | Scope           | Default                  | Purpose             |
| ---------------------- | --------------- | ------------------------ | ------------------- |
| `NEXT_PUBLIC_SITE_URL` | public          | `https://pareton.ai`     | Sitemap / robots    |
| `PARETON_API_URL`      | **server only** | `https://api.pareton.ai` | Dashboard API reads |

```bash
npm run build      # production build
npm run lint       # eslint
npm run format     # prettier
npm run api:types  # regenerate src/lib/api/schema.d.ts from OpenAPI
```

## Layout

| Path                       | Role                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `src/app/`                 | App Router pages, layout, SEO metadata                               |
| `src/app/dashboard/`       | Public campaigns list + campaign detail                              |
| `src/app/docs/`            | Fumadocs site (`/docs`)                                              |
| `content/docs/`            | Docs MDX source                                                      |
| `src/components/`          | Landing + dashboard UI                                               |
| `src/lib/site-content.ts`  | Landing copy (single source of truth)                                |
| `src/lib/home-markdown.ts` | Markdown view for agent content negotiation                          |
| `src/lib/api/`             | Server-only Pareton API client (see [README](src/lib/api/README.md)) |
| `src/middleware.ts`        | Serves Markdown on `/` when `Accept: text/markdown`                  |
| `public/`                  | Static assets                                                        |

## API client rules

- All dashboard data is fetched in React Server Components via `src/lib/api`.
- Every outbound call goes through `apiFetch` in `client.ts` — nothing else talks to the API host.
- Types: generated OpenAPI in `schema.d.ts` + hand-narrowed domain models in `types.ts`.
- When the backend schema changes, run `npm run api:types` and commit the diff.

## Frontend standards (typography)

Colors and spacing already use semantic tokens in `src/app/globals.css`. Prefer those over raw values.

**Type scale.** The scale is deliberately small: six UI sizes, three fluid display sizes, one mono tracking, one display line height. Everything else uses stock Tailwind. Do not add arbitrary `text-[…]` / `tracking-[…]` / `leading-[…]` values in `src/`. ESLint enforces this.

| Token | Value | Use |
| ----- | ----- | --- |
| `text-caption` | 11px | Dense table and chip labels |
| `text-body-sm` | 12px | Secondary metadata |
| `text-body` | 13px | Default UI text |
| `text-body-lg` | 14px | Emphasized body copy |
| `text-ui` | 16px | Card and row titles |
| `text-title` | 18px | Subsection headings |
| `text-display-lede` | `clamp(1.15rem, 2.2vw, 1.5rem)` | Lede paragraphs |
| `text-display-section` | `clamp(1.5rem, 2.8vw, 2rem)` | Section and page headings |
| `text-display-hero` | `clamp(2.1rem, 4.5vw, 3.1rem)` | Landing hero only |
| `tracking-caps` | 0.14em | Mono uppercase labels |
| `leading-display` | 1.12 | Hero heading only |

Custom tokens exist only where stock Tailwind cannot express the design. Stock sizes are 12/14/16px and do not fit this 11/12/13px rhythm, and stock tracking stops at 0.1em. For everything else use stock utilities: `tracking-tight` for heading tightening, and `leading-tight` / `leading-normal` / `leading-relaxed` for line height.

**Shared primitives.** Prefer these over copy-pasted class recipes:

| Primitive | File | Use |
| --------- | ---- | --- |
| `Eyebrow` | `src/components/ui/eyebrow.tsx` | Mono uppercase labels |
| `monoLinkClassName` | `src/components/ui/mono-link.tsx` | Nav and CTA mono links |
| `SectionHeader` | `src/components/ui/section-header.tsx` | Accent eyebrow plus display title |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Dashboard empty / error shell |

Before you add a token, try to reuse an existing step. Add a named token in `globals.css` only when no step fits, and never for a value that differs from a neighbour by less than 1px or 0.02em. Extract a primitive when the same class recipe appears in more than two places.

Subnet backend and worker live in [pareton](https://github.com/Pareton-ai/pareton).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
