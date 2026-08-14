export default function SubmissionLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading submission">
      <div className="flex items-start gap-4">
        <div className="size-9 shrink-0 border border-border" />
        <div className="mt-0.5 h-8 w-56 animate-pulse bg-border/50" />
      </div>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="h-64 animate-pulse border border-border bg-border/10" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="h-72 animate-pulse border border-border bg-border/10" />
        <div className="h-72 animate-pulse border border-border bg-border/10" />
      </div>
    </div>
  );
}
