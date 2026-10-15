import Link from "next/link";

export function LiquidInference() {
  return (
    <>
      <p className="dropcap">
        Pareton is now one of the verified providers on Liquid Inference, the
        router network built by Architect. Requests come in, providers quote for
        them, and the quotes move in real time. It is about as close as
        inference has come to a live market.
      </p>
      <p>
        The network is growing fast. Architect&apos;s Brett Harrison put the
        count at 28 verified companies serving more than a thousand models, with
        providers onboarding and integrating a model in about three hours on
        average and clearing full verification within a day.
      </p>

      <h2>Inference is becoming a commodity</h2>
      <p>
        Many teams now serve the same open weights, often on the same GPUs. When
        the product on the shelf is identical, buyers compare on price and
        speed, and the market starts to look like any other commodity market:
        quotes, spreads, and continuous competition for every token.
      </p>
      <blockquote className="pull">
        <p>Inference is rapidly becoming commoditized and financialized.</p>
      </blockquote>
      <p>
        That is good for buyers. It is harder for providers, because the only
        lasting way to win a live market is to serve the same token for less, at
        the same latency, and keep doing it as the market moves.
      </p>

      <h2>Why this fits what we build</h2>
      <p>
        Cost per token is exactly what Pareton pushes down. Miners on Subnet 10
        compete on the software that runs the model: kernels, KV-cache layout,
        batching, quantization, launch flags. A patch only survives if it serves
        more tokens on the same hardware under the same latency cap, and every
        win becomes the new baseline for the next round.
      </p>
      <p>
        On a network with live pricing, that work shows up directly in the
        quote. A provider that serves{" "}
        <Link href="/blog/qwen3-8-throughput">
          up to 54% more tokens per second
        </Link>{" "}
        on the same GPUs can price more aggressively and still keep its margin.
      </p>

      <h2>What comes next</h2>
      <p>
        We see Liquid Inference as one more place where the gains from our
        campaigns turn into something a buyer can feel. More inference routed
        through open, competitive networks is good for everyone building them,
        Bittensor included.
      </p>
      <p>
        If you run inference and want your cost per token to hold up in a market
        like this, <a href="mailto:xavier@pareton.ai">get in touch</a>.
      </p>
    </>
  );
}
