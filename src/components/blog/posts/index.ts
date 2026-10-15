import type { ComponentType } from "react";
import { Engy } from "@/components/blog/posts/engy";
import { ExploitSummit2026 } from "@/components/blog/posts/exploit-summit-2026";
import { GpuMemoryTensorParallelism } from "@/components/blog/posts/gpu-memory-tensor-parallelism";
import { LiquidInference } from "@/components/blog/posts/liquid-inference";
import { Qwen38Throughput } from "@/components/blog/posts/qwen3-8-throughput";

/** Post bodies by slug. Metadata for each lives in `src/lib/blog.ts`. */
export const postBodies: Record<string, ComponentType> = {
  "exploit-summit-2026": ExploitSummit2026,
  "liquid-inference": LiquidInference,
  engy: Engy,
  "qwen3-8-throughput": Qwen38Throughput,
  "gpu-memory-tensor-parallelism": GpuMemoryTensorParallelism,
};
