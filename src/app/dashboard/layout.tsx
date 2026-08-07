import type { Metadata } from "next";
import { SiteHeader } from "@/components/dashboard/site-header";

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
    <div className="bg-blueprint flex min-h-screen flex-col bg-background">
      <SiteHeader active="dashboard" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-12 sm:py-14">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-12">
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
