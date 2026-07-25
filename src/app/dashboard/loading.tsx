export default function DashboardLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <div className="h-3 w-28 animate-pulse bg-border-strong/40" />
        <div className="mt-4 h-8 w-40 animate-pulse bg-border-strong/30" />
      </div>
      <div className="h-64 animate-pulse border border-border bg-border/10" />
    </div>
  );
}
