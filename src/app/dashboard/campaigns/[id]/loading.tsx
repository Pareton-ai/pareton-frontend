export default function CampaignLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading campaign">
      <div className="h-3 w-24 animate-pulse bg-border/50" />
      <div className="h-56 animate-pulse border border-border bg-border/10" />
      <div className="h-72 animate-pulse border border-border bg-border/10" />
    </div>
  );
}
