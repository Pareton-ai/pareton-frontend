import type { ReactNode } from "react";
import { ProfileVisual } from "./profile";
import { PatchesVisual } from "./patches";
import { ValidateVisual } from "./validate";
import { BenchmarkVisual } from "./benchmark";
import { DecisionVisual } from "./decision";
import { RepeatVisual } from "./repeat";

/** Visuals matched to `siteContent.howItWorks.steps` by order. */
export const visuals: ReactNode[] = [
  <ProfileVisual key="profile" />,
  <PatchesVisual key="patches" />,
  <ValidateVisual key="validate" />,
  <BenchmarkVisual key="benchmark" />,
  <DecisionVisual key="decision" />,
  <RepeatVisual key="repeat" />,
];
