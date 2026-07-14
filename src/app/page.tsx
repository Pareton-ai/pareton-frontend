import { Logo } from "@/components/logo";
import { IsoDiagram } from "@/components/iso-diagram";

const links = [
  { label: "X", href: "https://x.com/pareton_ai" },
  { label: "GitHub", href: "https://github.com/pareton-ai" },
  { label: "Contact", href: "mailto:xavier@pareton.ai" },
];

const facts = [
  {
    index: "01",
    title: "Continuous search",
    body: "The inference search space — kernels, batching, KV cache, quantization, scheduling — evolves faster than any isolated R&D team can track. Pareton benchmarks it continuously.",
  },
  {
    index: "02",
    title: "Deterministic validation",
    body: "Every candidate configuration is stress-tested across GPU types, context lengths, and request patterns. Only improvements that hold universally reach the baseline.",
  },
  {
    index: "03",
    title: "Compounding baseline",
    body: "Each validated improvement becomes the new floor for the next. Optimization stops being a per-company cost and becomes shared, accumulating infrastructure.",
  },
];

export default function Home() {
  return (
    <div className="bg-blueprint flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-12">
        <Logo />
        <nav className="flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
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
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Inference optimization infrastructure
            </p>
            <h1 className="text-[clamp(2.1rem,4.5vw,3.1rem)] font-medium leading-[1.12] tracking-[-0.03em] text-foreground">
              The Intelligence Layer for AI Inference
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-secondary">
              AI models are converging in quality; cost and latency are the real
              competitive edge. Pareton continuously discovers, validates, and
              deploys the optimal serving configuration for{" "}
              <span className="italic">your</span> workload.
            </p>
          </div>

          <IsoDiagram className="mx-auto w-full max-w-xl" />
        </section>

        {/* Three facts */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border sm:px-12 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {facts.map((fact) => (
              <div key={fact.index} className="px-6 py-12 lg:px-10">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted">
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
              Inference demand is compounding faster than efficiency improves.
              The gap shows up in margin, serving latency, and duplicated
              optimization work.{" "}
              <span className="text-secondary">
                Pareton exists to close it, one validated configuration at a
                time.
              </span>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            © {new Date().getFullYear()} Pareton
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:block">
            Pushing the Pareto frontier of inference
          </p>
        </div>
      </footer>
    </div>
  );
}
