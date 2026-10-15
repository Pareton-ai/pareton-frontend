export function GpuMemoryTensorParallelism() {
  return (
    <>
      <p className="dropcap">
        More GPUs don&apos;t always mean more usable GPU memory. We ran into a
        clean example of this recently: an inference workload hit an
        out-of-memory error. The interesting part was not how much memory was in
        use. It was what was using it, and whether that memory could be spread
        across GPUs at all.
      </p>

      <h2>Each GPU is a shelf</h2>
      <p>
        Think of each GPU as a shelf with, say, about 32 GB of space. A large
        language model needs that space for three things:
      </p>
      <ul className="since">
        <li>
          <span className="mono">Weights</span>
          <p>The model itself.</p>
        </li>
        <li>
          <span className="mono">KV cache</span>
          <p>Memory that grows as the context gets longer.</p>
        </li>
        <li>
          <span className="mono">Working</span>
          <p>
            Temporary memory for the calculations made while the model runs.
          </p>
        </li>
      </ul>

      <h2>What tensor parallelism changes</h2>
      <p>
        Tensor parallelism (TP) splits the model across GPUs. With TP4 the model
        is distributed over four GPUs, with TP8 over eight. Each GPU holds a
        smaller piece of the weights, and memory that can be distributed, like
        the KV cache, scales across more GPUs too.
      </p>
      <p>But not every calculation is distributed this way.</p>

      <h2>The flag that decides the split</h2>
      <p>
        This is where a flag like <code>--mem-fraction-static</code> matters. It
        tells SGLang how much of each GPU&apos;s shelf to reserve for the model
        and the KV cache. At 0.85, roughly 85% of each GPU is reserved. At 0.4,
        roughly 40%.
      </p>
      <p>
        The key detail is that this is per GPU. It is not 40% of the combined
        memory of all four or eight GPUs. Whatever is left over on each card is
        what temporary memory has to fit into.
      </p>

      <h2>What actually ran out</h2>
      <p>
        In our case, the evaluation needed a temporary logits tensor of about
        1.9 GB. On that code path the tensor is not split across GPUs, so every
        GPU needs roughly 1.9 GB of free space on its own.
      </p>
      <dl className="spec">
        <div>
          <dt className="mono">At 0.85</dt>
          <dd>About 1.7 GB free per GPU, 1.9 GB needed. Out of memory.</dd>
        </div>
        <div>
          <dt className="mono">At 0.4</dt>
          <dd>About 19 GB free per GPU, 1.9 GB needed. It fits.</dd>
        </div>
      </dl>
      <p>
        Moving from TP4 to TP8 would not have helped. More GPUs add total
        capacity, but they do not add temporary memory per GPU, and that was the
        thing running out.
      </p>

      <h2>Where more GPUs do help</h2>
      <p>
        The picture changes with long-context inference. The KV cache grows with
        context length, and it can be distributed, so TP8 can meaningfully
        increase how much context you can serve.
      </p>
      <blockquote className="pull">
        <p>
          Inference optimization isn&apos;t just &ldquo;use more GPUs.&rdquo;
        </p>
      </blockquote>
      <p>
        You need to know what is consuming memory, where it lives, and how it
        scales. That is where the real optimization happens, and it is the kind
        of detail our campaigns are built to find on your workload instead of a
        generic one.
      </p>
    </>
  );
}
