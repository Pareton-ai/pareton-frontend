import type { ReactNode } from "react";
import { siteContent } from "@/lib/site-content";
import { visuals } from "./visuals";

export type Step = (typeof siteContent.howItWorks.steps)[number] & {
  visual: ReactNode;
};

export const steps: Step[] = siteContent.howItWorks.steps.map((step, i) => ({
  ...step,
  visual: visuals[i],
}));
