export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <div className="h-8 w-44 animate-pulse bg-border-strong/30" />
        <div className="mt-3 h-3 w-72 animate-pulse bg-border-strong/40" />
      </div>
      <div className="h-64 animate-pulse border border-border bg-border/10" />
    </div>
  );
}
