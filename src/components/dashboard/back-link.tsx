import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Square hairline back control, sitting inline to the left of a page title.
 *
 * Shared by both detail pages so the way up the hierarchy is always in the same
 * place. Render it outside the data `Suspense` boundary: the way back must never
 * be gated on a fetch.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ArrowLeft className="size-4" aria-hidden />
    </Link>
  );
}
