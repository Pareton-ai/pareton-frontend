export default function SubmissionLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading submission">
      <div className="h-3 w-24 animate-pulse bg-border/50" />
      <div className="h-64 animate-pulse border border-border bg-border/10" />
      <div className="h-48 animate-pulse border border-border bg-border/10" />
      <div className="h-96 animate-pulse border border-border bg-border/10" />
    </div>
  );
}
