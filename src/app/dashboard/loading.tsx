export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <div className="h-3 w-28 animate-pulse bg-border-strong/40" />
        <div className="mt-4 h-8 w-64 animate-pulse bg-border-strong/30" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse bg-border/50" />
      </div>
      <div className="grid grid-cols-2 border border-border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-5 sm:px-6">
            <div className="h-3 w-16 animate-pulse bg-border/50" />
            <div className="mt-3 h-7 w-10 animate-pulse bg-border-strong/30" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse border border-border bg-border/10" />
    </div>
  );
}
