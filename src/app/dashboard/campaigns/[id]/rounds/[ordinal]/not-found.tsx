import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function RoundNotFound() {
  return (
    <EmptyState
      title="Not found"
      message="No round exists at this number for the campaign. Rounds are numbered from 1 and are never renumbered, so a gap means the campaign has not run that far."
    >
      <Link href="/dashboard" className={monoLinkClassName({ tone: "accent" })}>
        ← Back to campaigns
      </Link>
    </EmptyState>
  );
}
