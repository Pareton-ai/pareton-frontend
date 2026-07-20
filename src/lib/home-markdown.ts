import { siteContent } from "@/lib/site-content";

/**
 * Markdown representation of the home page (`/`), served to agents that send
 * `Accept: text/markdown`. Generated from `siteContent` so it never drifts from
 * the rendered page — update the copy in `site-content.ts`, not here.
 */
function buildHomeMarkdown(): string {
  const c = siteContent;

  const steps = c.howItWorks.steps
    .map((s) => {
      const title = /[.?!]$/.test(s.title) ? s.title : `${s.title}.`;
      return `${Number(s.index)}. **${title}** ${s.body}`;
    })
    .join("\n");

  const facts = c.facts
    .map((f) => `- **${f.title}.** ${f.body}`)
    .join("\n");

  const links = c.links
    .map((l) => `- ${l.label}: ${l.href.replace(/^mailto:/, "")}`)
    .join("\n");

  return `# ${c.name} — ${c.title}

_${c.eyebrow}._

${c.heroDescription}

${c.buildStatus}.

## ${c.howItWorks.eyebrow}

${c.howItWorks.title}

${steps}

## Why ${c.name}

${facts}

## Positioning

${c.positioning}

## Links

${links}

---

© ${c.name} — ${c.tagline}.
`;
}

export const homeMarkdown = buildHomeMarkdown();

/**
 * Rough token estimate for the `x-markdown-tokens` header. No tokenizer is
 * available in the edge runtime, so this uses the common ~4-chars-per-token
 * heuristic — same order of magnitude reported by Cloudflare's Markdown for
 * Agents.
 */
export const homeMarkdownTokens = Math.ceil(homeMarkdown.length / 4);
