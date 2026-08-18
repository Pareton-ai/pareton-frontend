import type { Metadata } from "next";
import { SiteHeader } from "@/components/dashboard/site-header";
import { landingFontClassName } from "@/lib/landing-fonts";

export const metadata: Metadata = {
  title: "Dashboard · Pareton",
  description:
    "Live Pareton campaigns, SLA gates, and miner submission pipeline status.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`dashboard-shell bg-blueprint flex min-h-screen min-w-0 flex-col bg-background ${landingFontClassName}`}
    >
      <SiteHeader active="dashboard" />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-6 py-12 sm:px-12 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-12">
          <p className="font-mono text-body uppercase tracking-caps text-muted">
            © {new Date().getFullYear()} Pareton
          </p>
          <p className="hidden font-mono text-body uppercase tracking-caps text-muted sm:block">
            Pushing the pareto frontier of inference
          </p>
        </div>
      </footer>
    </div>
  );
}
