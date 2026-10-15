import type { ReactNode } from "react";
import { Close } from "@/components/landing/close";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { landingFontClassName } from "@/lib/landing-fonts";
import "@/components/landing/landing.css";
import "@/components/blog/blog.css";

/** Blog pages share the landing page's paper, type, header, and close. */
export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className={`landing blog ${landingFontClassName}`}>
      <div className="fiber" aria-hidden="true" />
      <Header brandHref="/" current="/blog" />
      <main id="top">{children}</main>
      <Close />
      <Footer />
    </div>
  );
}
