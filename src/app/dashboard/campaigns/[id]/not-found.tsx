import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function CampaignNotFound() {
  return (
    <EmptyState title="Not found" message="No campaign exists for this id.">
      <Link
        href="/dashboard"
        className={monoLinkClassName({
          tone: "accent",
        })}
      >
        ← Back to campaigns
      </Link>
    </EmptyState>
  );
}
