import type { ReactNode } from "react";
import Link from "next/link";

export function NavLink({
  href,
  className,
  current,
  children,
}: {
  href: string;
  className?: string;
  current?: boolean;
  children: ReactNode;
}) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external || href.startsWith("#")) {
    return (
      <a
        href={href}
        className={className}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
