import type { ComponentType } from "react";
import { ExploitSummit2026 } from "@/components/blog/posts/exploit-summit-2026";

/** Post bodies by slug. Metadata for each lives in `src/lib/blog.ts`. */
export const postBodies: Record<string, ComponentType> = {
  "exploit-summit-2026": ExploitSummit2026,
};
