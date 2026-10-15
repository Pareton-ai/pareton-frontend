import Link from "next/link";
import { BarChart, Stats } from "@/components/blog/chart";

/** Output throughput gain over the pinned baseline, by concurrency. */
const results = [
  { load: 4, gain: 54 },
  { load: 8, gain: 50 },
  { load: 16, gain: 40 },
  { load: 32, gain: 23 },
];

/** GPU cost per token falls by 1 - 1 / (1 + gain). */
const costCut = (gain: number) => Math.round((1 - 1 / (1 + gain / 100)) * 100);

const setup = [
  { k: "Model", v: "Qwen3.8-27B" },
  { k: "Serving stack", v: "SGLang" },
  { k: "Hardware", v: "4× RTX 5090" },
  { k: "Benchmark", v: "NVIDIA AIPerf" },
  { k: "Requests", v: "8K-token input, 2K-token output" },
  { k: "Method", v: "Paired test against the pinned baseline" },
];

export function Qwen38Throughput() {
  return (
    <>
      <p className="dropcap">
        We took the top miner submission for Qwen3.8-27B and tested it against
        the pinned baseline using NVIDIA&apos;s AIPerf, an open-source benchmark
        for LLM inference. All 600 requests completed, and output throughput was
        23 to 54% higher at every load we tested.
      </p>

      <Stats
        items={[
          { value: "+54%", label: "Peak output throughput" },
          { value: "600 / 600", label: "Requests completed" },
          { value: "19–35%", label: "Lower GPU cost per token" },
        ]}
      />

      <h2>The setup</h2>
      <dl className="spec">
        {setup.map((row) => (
          <div key={row.k}>
            <dt className="mono">{row.k}</dt>
            <dd>{row.v}</dd>
          </div>
        ))}
      </dl>
      <p>
        Paired means the patched engine and the baseline ran the same requests
        on the same machine, so the only thing that changed between the two runs
        was the miner&apos;s patch.
      </p>

      <h2>The results</h2>
      <BarChart
        title="Output throughput vs. baseline"
        caption="Qwen3.8-27B on SGLang, 4× RTX 5090. Same requests, paired runs."
        columns={["Concurrent requests", "Throughput gain"]}
        max={60}
        rows={results.map((r) => ({
          label: `${r.load} concurrent`,
          value: r.gain,
          display: `+${r.gain}%`,
        }))}
      />
      <p>
        The gain is largest at low concurrency and narrows as the GPUs get
        busier. A likely reason: with only a few requests in flight the GPUs
        have more idle capacity, and that is where better kernels and scheduling
        recover the most. Even at 32 concurrent requests the patched engine
        still served almost a quarter more tokens on the same hardware.
      </p>

      <h2>Why it matters</h2>
      <p>
        Every token costs money. If the same four GPUs serve 23 to 54% more
        output, the GPU cost behind each token falls by roughly 19 to 35%, with
        no new hardware and no change to the model.
      </p>
      <BarChart
        title="GPU cost per token, reduction vs. baseline"
        caption="Derived from the throughput gains above: 1 − 1 / (1 + gain)."
        columns={["Concurrent requests", "Cost reduction"]}
        max={60}
        rows={results.map((r) => ({
          label: `${r.load} concurrent`,
          value: costCut(r.gain),
          display: `−${costCut(r.gain)}%`,
        }))}
      />
      <p>
        That is the point of running this on Subnet 10. Miners compete to make
        the software that serves a model faster, and only changes that hold up
        against a pinned baseline get kept. The result here was not produced by
        one team over a quarter. It came out of an open competition, and the
        next round starts from it.
      </p>
      <p>
        Every round and submission is public on the{" "}
        <Link href="/dashboard">dashboard</Link>. The scoring rules are in the{" "}
        <Link href="/docs">docs</Link>.
      </p>
    </>
  );
}
