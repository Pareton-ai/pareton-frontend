import Link from "next/link";
import { Logo } from "@/components/logo";

const nav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Home", href: "/" },
  { label: "GitHub", href: "https://github.com/pareton-ai" },
] as const;

export function SiteHeader({
  active = "dashboard",
}: {
  active?: "dashboard" | "home";
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-12">
      <Link href="/" className="transition-opacity hover:opacity-90">
        <Logo />
      </Link>
      <nav className="flex items-center gap-4 sm:gap-8">
        {nav.map((link) => {
          const isActive =
            (active === "dashboard" && link.href === "/dashboard") ||
            (active === "home" && link.href === "/");
          const external = link.href.startsWith("http");
          return (
            <Link
              key={link.label}
              href={link.href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={`font-mono text-[13px] uppercase tracking-[0.12em] transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
