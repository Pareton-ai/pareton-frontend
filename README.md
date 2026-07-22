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

Website for [Pareton](https://pareton.ai) (Bittensor SN10). Next.js app that serves the public landing page at pareton.ai.

Landing copy lives in one place (`src/lib/site-content.ts`). Clients that send `Accept: text/markdown` get a Markdown version of the home page instead of HTML.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: set `NEXT_PUBLIC_SITE_URL` for sitemap and robots (default `https://pareton.ai`).

```bash
npm run build    # production build
npm run lint     # eslint
npm run format   # prettier
```

## Layout

| Path                        | Role                                      |
| --------------------------- | ----------------------------------------- |
| `src/app/`                  | App Router pages, layout, SEO metadata    |
| `src/components/`           | Landing UI (logo, diagram, how-it-works)  |
| `src/lib/site-content.ts`   | Landing copy (single source of truth)     |
| `src/lib/home-markdown.ts`  | Markdown view for agent content negotiation |
| `src/middleware.ts`         | Serves Markdown when `Accept: text/markdown` |
| `public/`                   | Static assets                             |

Subnet backend and worker live in [pareton](https://github.com/Pareton-ai/pareton).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
