import Link from "next/link";
import { Logo } from "@/components/logo";
import { monoLinkClassName } from "@/components/ui/mono-link";

const nav = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Docs", href: "/docs", key: "docs" },
  { label: "Home", href: "/", key: "home" },
  { label: "GitHub", href: "https://github.com/pareton-ai", key: null },
] as const;

export function SiteHeader({
  active = "dashboard",
}: {
  active?: "dashboard" | "docs" | "home";
}) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border bg-background/85 px-6 py-5 backdrop-blur-md sm:px-12">
      <Link href="/" className="transition-opacity hover:opacity-90">
        <Logo />
      </Link>
      <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-8">
        {nav.map((link) => {
          const isActive = link.key === active;
          const external = link.href.startsWith("http");
          return (
            <Link
              key={link.label}
              href={link.href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={monoLinkClassName(
                { tone: isActive ? "foreground" : "muted" },
                // Landing nav marks the current destination with a hairline rule.
                isActive
                  ? "underline decoration-1 underline-offset-[0.45em]"
                  : undefined
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
