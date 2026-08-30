export default function CampaignLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading campaign">
      <div className="flex items-start gap-4">
        <div className="mt-1 size-8 shrink-0 animate-pulse bg-border/50" />
        <div className="mt-1 h-8 w-72 animate-pulse bg-border/50" />
      </div>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="space-y-6">
        <div className="flex gap-6 border-b border-border pb-3">
          <div className="h-4 w-24 animate-pulse bg-border/50" />
          <div className="h-4 w-28 animate-pulse bg-border/50" />
          <div className="h-4 w-24 animate-pulse bg-border/50" />
          <div className="h-4 w-20 animate-pulse bg-border/50" />
        </div>
        <div className="h-96 animate-pulse border border-border bg-border/10" />
      </div>
    </div>
  );
}
