"use client";

import { CheckItem } from "../check-item";

export function ValidateVisual() {
  return (
    <div className="max-w-lg">
      <ul className="space-y-3">
        <CheckItem>Builds and runs</CheckItem>
        <CheckItem>Output quality preserved</CheckItem>
        <CheckItem>API compatibility preserved</CheckItem>
        <CheckItem>Customer constraints satisfied</CheckItem>
        <CheckItem>Works across required GPU environments</CheckItem>
      </ul>
      <p className="mt-6 font-mono text-body uppercase tracking-caps text-muted">
        Invalid patches are rejected before benchmarking
      </p>
    </div>
  );
}
