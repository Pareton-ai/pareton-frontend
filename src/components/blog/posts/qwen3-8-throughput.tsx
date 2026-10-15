import Link from "next/link";

const results = [
  { load: "4 concurrent requests", gain: "+54%" },
  { load: "8 concurrent requests", gain: "+50%" },
  { load: "16 concurrent requests", gain: "+40%" },
  { load: "32 concurrent requests", gain: "+23%" },
];

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
      <ul className="since">
        {results.map((row) => (
          <li key={row.load}>
            <span className="mono">{row.gain}</span>
            <p>Output throughput at {row.load}</p>
          </li>
        ))}
      </ul>
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
