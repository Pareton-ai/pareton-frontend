import { Logo } from "@/components/logo";

const links = [
  { label: "X", href: "https://x.com/pareton_ai" },
  { label: "GitHub", href: "https://github.com/pareton-ai" },
  { label: "Email", href: "mailto:xavier@pareton.ai" },
];

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 sm:px-10">
        <div className="max-w-xl">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            Inference optimization
          </p>
          <h1 className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.025em] text-foreground">
            The optimization layer for AI inference.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-secondary">
            Training builds the car. Inference wins the race. We continuously
            discover, validate, and deploy the most efficient way to serve AI
            workloads: across models, hardware, and deployment environments.
          </p>
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          © {new Date().getFullYear()} Pareton
        </p>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:block">
          Pushing the Pareto frontier of inference
        </p>
      </footer>
    </div>
  );
}
