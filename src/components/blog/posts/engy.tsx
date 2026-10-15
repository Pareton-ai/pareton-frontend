import Link from "next/link";

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

      <h2>Next: Kimi K3</h2>
      <p>
        On October 14 we opened a new optimization campaign for Kimi K3 on
        Engy&apos;s workload. You can follow the rounds as they run on the{" "}
        <Link href="/dashboard">dashboard</Link>.
      </p>
      <p>
        If you serve models at scale and want the same treatment,{" "}
        <a href="mailto:xavier@pareton.ai">send us your profile</a>.
      </p>
    </>
  );
}
