import { Logo } from "@/components/logo";
import { IsoDiagram } from "@/components/iso-diagram";
import { HowItWorks } from "@/components/how-it-works";
import { siteContent } from "@/lib/site-content";

const { facts } = siteContent;
/** Topbar omits Contact; it stays in the agent Markdown link list. */
const links = siteContent.links.filter((link) => link.label !== "Contact");

/** Split `text` around `mark`, wrapping the matched part in `wrap`. */
function withEmphasis(
  text: string,
  mark: string,
  wrap: (part: string) => React.ReactNode
) {
  const at = text.indexOf(mark);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      {wrap(mark)}
      {text.slice(at + mark.length)}
    </>
  );
}

export default function Home() {
  return (
    <div className="bg-blueprint flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-12">
        <Logo />
        <nav className="flex items-center gap-4 sm:gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 sm:px-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-28">
          <div>
            <p className="mb-6 font-mono text-[13px] uppercase tracking-[0.18em] text-accent">
              {siteContent.eyebrow}
            </p>
            <h1 className="text-[clamp(2.1rem,4.5vw,3.1rem)] font-medium leading-[1.12] tracking-[-0.03em] text-foreground">
              {siteContent.title}
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-secondary">
              {withEmphasis(
                siteContent.heroDescription,
                siteContent.heroEmphasis,
                (part) => (
                  <span className="italic">{part}</span>
                )
              )}
            </p>
            <p className="mt-8 font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
              {siteContent.buildStatus}
            </p>
          </div>

          <IsoDiagram className="mx-auto w-full max-w-xl" />
        </section>

        {/* How it works */}
        <HowItWorks />

        {/* Three facts */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border sm:px-12 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {facts.map((fact) => (
              <div key={fact.index} className="px-6 py-12 lg:px-10">
                <p className="font-mono text-[13px] tracking-[0.14em] text-muted">
                  {fact.index}
                </p>
                <h2 className="mt-4 text-[16px] font-medium tracking-[-0.01em] text-foreground">
                  {fact.title}
                </h2>
                <p className="mt-3 text-[13.5px] leading-[1.7] text-secondary">
                  {fact.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Positioning statement */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-12">
            <p className="max-w-2xl text-[clamp(1.15rem,2.2vw,1.5rem)] font-normal leading-[1.5] tracking-[-0.015em] text-foreground">
              {withEmphasis(
                siteContent.positioning,
                siteContent.positioningEmphasis,
                (part) => (
                  <span className="text-secondary">{part}</span>
                )
              )}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-12">
          <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
            © {new Date().getFullYear()} {siteContent.name}
          </p>
          <p className="hidden font-mono text-[13px] uppercase tracking-[0.12em] text-muted sm:block">
            {siteContent.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
