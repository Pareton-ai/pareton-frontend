import { Crown, Layers, Repeat2, ScrollText } from "lucide-react";
import Link from "next/link";
import type { DashboardIcon } from "@/components/dashboard/panel";
import { TabScroller } from "@/components/dashboard/tab-scroller";
import { CAMPAIGN_TABS, type CampaignTab } from "@/lib/routes";

const TAB_META: Record<
  CampaignTab,
  { label: string; icon: DashboardIcon; hint: string }
> = {
  rounds: {
    label: "Rounds",
    icon: Repeat2,
    hint: "Every cohort the watcher has seated",
  },
  submissions: {
    label: "Submissions",
    icon: Layers,
    hint: "Miner patches and where they stopped",
  },
  metadata: {
    label: "Metadata",
    icon: ScrollText,
    hint: "Objective, model, provenance and patch scope",
  },
  leaders: {
    label: "Leaders",
    icon: Crown,
    hint: "Crown holder and score progress per round",
  },
};

/**
 * Section switcher for the campaign page.
 *
 * Real links over a query param, not client state: each section is shareable,
 * the back button steps between them, and the route fetches only the panel it
 * is about to show. Links also give keyboard and screen-reader behaviour for
 * free, so this is a `nav` with `aria-current` rather than an ARIA tablist,
 * which would promise arrow-key semantics that navigation does not have.
 */
export function CampaignTabs({
  active,
  hrefFor,
  counts,
}: {
  active: CampaignTab;
  hrefFor: (tab: CampaignTab) => string;
  /** Row totals for the list sections; omitted while a fetch is failing. */
  counts?: Partial<Record<CampaignTab, number | null>>;
}) {
  return (
    <nav aria-label="Campaign sections" className="border-b border-border">
      {/* The row scrolls rather than wraps on a narrow viewport, so the tabs
          keep sitting on one rule. */}
      <TabScroller
        activeKey={active}
        className="-mb-px flex min-w-0 gap-px overflow-x-auto"
      >
        {CAMPAIGN_TABS.map((tab) => {
          const { label, icon: Icon, hint } = TAB_META[tab];
          const isActive = tab === active;
          const count = counts?.[tab];

          return (
            <li key={tab} className="shrink-0">
              <Link
                href={hrefFor(tab)}
                aria-current={isActive ? "page" : undefined}
                title={hint}
                scroll={false}
                   of the four tabs, and its taller line box would otherwise
                   make those tabs deeper than the rest. 44px also keeps the
                   touch target honest. */
                className={`group flex h-11 items-center gap-2 border-b-2 px-4 font-mono text-caption uppercase tracking-caps transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                  isActive
                    ? "border-accent bg-accent-dim text-foreground"
                    : "border-transparent text-muted hover:border-border-strong hover:bg-border/20 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`size-3.5 shrink-0 ${isActive ? "text-accent" : "text-muted group-hover:text-secondary"}`}
                  aria-hidden
                />
                {label}
                {count != null ? (
                  <span
                    className={`font-serif text-body leading-none italic ${
                      isActive ? "text-secondary" : "text-muted"
                    }`}
                  >
                    {count.toLocaleString("en-US")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </TabScroller>
    </nav>
  );
}
