import { NextResponse, type NextRequest } from "next/server";
import { homeMarkdown, homeMarkdownTokens } from "@/lib/home-markdown";

/**
 * Markdown for Agents (app-level content negotiation).
 *
 * When a client sends `Accept: text/markdown`, return a Markdown version of the
 * page instead of HTML. HTML stays the default for browsers and any request
 * that doesn't explicitly ask for Markdown.
 */

/** True when `Accept` prefers `text/markdown` (respecting a q=0 rejection). */
function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => {
      if (!part.startsWith("text/markdown")) return false;
      const q = /;\s*q=([\d.]+)/.exec(part);
      return !q || Number(q[1]) > 0;
    });
}

export function middleware(request: NextRequest) {
  if (wantsMarkdown(request.headers.get("accept"))) {
    return new NextResponse(homeMarkdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept",
        "x-markdown-tokens": String(homeMarkdownTokens),
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  // HTML default: still advertise that the response varies on Accept so caches
  // keep the Markdown and HTML variants separate.
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

/** Only run on the home page — the one HTML content route. */
export const config = {
  matcher: ["/"],
};
