export default function CampaignLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading campaign">
      <div className="flex items-start gap-4">
        <div className="mt-1 size-8 shrink-0 animate-pulse bg-border/50" />
        <div className="mt-1 h-8 w-72 animate-pulse bg-border/50" />
      </div>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="h-72 animate-pulse border border-border bg-border/10" />
        <div className="h-72 animate-pulse border border-border bg-border/10" />
      </div>
    </div>
  );
}
