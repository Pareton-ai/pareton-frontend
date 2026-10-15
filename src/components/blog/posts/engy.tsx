import Link from "next/link";
import { BarChart, Stats } from "@/components/blog/chart";
import { campaignHref } from "@/lib/routes";

/** Engy's Kimi K3 campaign on the public dashboard. */
const K3_CAMPAIGN = "9c32cdc5-4235-4166-8d47-fcd026970cce";

/**
 * Leader score per completed round, from the public API as of Oct 15.
 * A score of 0.25 means the leader ran Engy's sampled traffic 25% faster
 * end-to-end than the baseline in that round.
 */
const rounds = [
  { round: 1, speedup: 19.9 },
  { round: 2, speedup: 24.8 },
  // Ran with an operator waiver on the baseline-drift ceiling.
  { round: 3, speedup: 28.8, provisional: true },
];

export function Engy() {
  return (
    <>
      <p className="dropcap">
        Engy is getting faster. Pareton now tunes how Engy runs its models, so
        replies come back sooner and each one costs less to serve. Nothing
        changes for the people building on Engy. Same API, same integration.
      </p>
      <p>
        Engy is one of the fastest-growing inference networks on Bittensor and
        beyond. It is a large customer with serious traffic, and that is the
        workload Pareton was built for.
      </p>

      <h2>Kimi K3: the numbers so far</h2>
      <p>
        On October 14 we opened a campaign for Kimi K3 on Engy&apos;s workload.
        Three rounds in, the leading patch serves Engy&apos;s traffic about 25%
        faster end-to-end than the engine it started from, on the same eight
        B300 GPUs, inside the same latency limits.
      </p>
      <Stats
        items={[
          { value: "25%", label: "Faster end-to-end" },
          { value: "8× B300", label: "Same hardware" },
          { value: "≥ 0.99", label: "Token match vs. baseline" },
        ]}
      />
      <BarChart
        title="Kimi K3 leader: end-to-end speedup vs. baseline"
        caption="Median per-prompt speedup on Engy's sampled traffic, 8× B300. Each round draws a new trace."
        columns={["Round", "Speedup vs. baseline"]}
        max={35}
        rows={rounds.map((r) => ({
          label: `Round ${r.round}`,
          value: r.speedup,
          display: `+${Math.round(r.speedup)}%`,
          tone: r.provisional ? "provisional" : "accent",
          note: r.provisional ? "Provisional" : undefined,
        }))}
      />
      <p>
        A score only counts if the patch passes the campaign&apos;s gates first:
        p99 time to first token under 2 seconds, p99 time between tokens under
        50 ms, and output that matches the baseline token for token at least 99%
        of the time. The campaign&apos;s target is a 10% cut in GPU-hours at
        that SLA. Round 3 ran with a waiver on the baseline-drift check, so we
        treat its number as provisional and quote round 2.
      </p>
      <p>
        Every round, score and patch is public on the{" "}
        <Link href={campaignHref(K3_CAMPAIGN)}>campaign page</Link>.
      </p>

      <h2>Why a real workload matters</h2>
      <p>
        Most inference benchmarks run on synthetic prompts at a fixed load.
        Production traffic does not look like that. Prompt lengths vary,
        requests arrive in bursts, and the latency a user tolerates depends on
        what they are doing. A configuration that wins on a leaderboard can lose
        on Monday morning traffic.
      </p>
      <p>
        So every Pareton campaign starts from the customer&apos;s own profile:
        the model, the hardware, the serving stack, and a sample of real
        requests. That snapshot becomes the ruler every change is measured
        against.
      </p>

      <h2>How it works for Engy</h2>
      <ol className="steps">
        <li>
          <span className="mono">01</span>
          <p>
            We freeze what Engy runs today as the baseline, along with its
            latency targets.
          </p>
        </li>
        <li>
          <span className="mono">02</span>
          <p>
            Miners on Subnet 10 submit patches to the serving engine. Each one
            is benchmarked on the same GPUs and the same traffic.
          </p>
        </li>
        <li>
          <span className="mono">03</span>
          <p>
            A patch is kept only if it is faster or cheaper and the latency caps
            still hold. It then becomes the new baseline, and the search starts
            again.
          </p>
        </li>
      </ol>
      <p>
        The gains arrive as reviewable code and configuration diffs, not a black
        box. Engy can see what changed and why it won before anything ships.
      </p>

      <p>
        If you serve models at scale and want the same treatment,{" "}
        <a href="mailto:xavier@pareton.ai">send us your profile</a>.
      </p>
    </>
  );
}
