import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function SubmissionNotFound() {
  return (
    <EmptyState
      title="Not found"
      message="No submission exists for this patch hash. It may not have been committed on chain yet."
    >
      <Link
        href="/dashboard"
        className={monoLinkClassName({ size: "sm", tone: "accent" })}
      >
        ← Back to campaigns
      </Link>
    </EmptyState>
  );
}
