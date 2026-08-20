import { siteContent } from "@/lib/site-content";

/**
 * Markdown representation of the home page (`/`), served to agents that send
 * `Accept: text/markdown`. Generated from `siteContent` so it never drifts from
 * the rendered page. Update the copy in `site-content.ts`, not here.
 */
function buildHomeMarkdown(): string {
  const c = siteContent;

  const colophon = c.colophon
    .map((row) => `- **${row.k}:** ${row.v}`)
    .join("\n");

  const steps = c.howItWorks.steps
    .map((s) => {
      const title = /[.?!]$/.test(s.title) ? s.title : `${s.title}.`;
      return `${Number(s.index)}. **${title}** ${s.body}`;
    })
    .join("\n");

  const laws = c.laws.items
    .map((item) => `- **${item.title}.** ${item.body}`)
    .join("\n");

  const buyers = c.buyers.items
    .map((item) => `- **${item.title}** (${item.role}). ${item.body}`)
    .join("\n");

  const links = c.links
    .map((l) => `- ${l.label}: ${l.href.replace(/^mailto:/, "")}`)
    .join("\n");

  return `# ${c.name}

_${c.eyebrow}._

**${c.title}**

${c.heroDescription.replace(c.heroDescriptionBold, `**${c.heroDescriptionBold}**`)}

${c.buildStatus}.

## Scored on

${colophon}

## ${c.brief.index}

${c.brief.text} ${c.brief.emphasis}

## ${c.howItWorks.title}

${c.howItWorks.lead}

${steps}

## ${c.laws.title}

${laws}

## ${c.buyers.title}

${buyers}

## Contact

${c.close.body}

${c.close.primary.label}: ${c.close.primary.href.replace(/^mailto:/, "")}

## Links

${links}

---

© ${c.name}. ${c.tagline}.
`;
}

export const homeMarkdown = buildHomeMarkdown();

/**
 * Rough token estimate for the `x-markdown-tokens` header. No tokenizer is
 * available in the edge runtime, so this uses the common ~4-chars-per-token
 * heuristic, the same order of magnitude reported by Cloudflare's Markdown for
 * Agents.
 */
export const homeMarkdownTokens = Math.ceil(homeMarkdown.length / 4);
