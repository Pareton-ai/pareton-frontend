import { NextResponse, type NextRequest } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { homeMarkdown, homeMarkdownTokens } from "@/lib/home-markdown";

const { rewrite: rewriteLLM } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}"
);

export function proxy(request: NextRequest) {
  if (isMarkdownPreferred(request)) {
    if (request.nextUrl.pathname === "/") {
      return new NextResponse(homeMarkdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
          "x-markdown-tokens": String(homeMarkdownTokens),
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }

    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        headers: { Vary: "Accept" },
      });
    }
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

export const config = {
  matcher: ["/", "/docs", "/docs/:path*"],
};
