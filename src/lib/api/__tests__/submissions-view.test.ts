import { describe, expect, it } from "vitest";
import {
  ALL_OUTCOMES,
  buildSubmissionsView,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SUBMISSION_SORT,
  parsePageSize,
  parseSearch,
  parseSubmissionSort,
} from "@/lib/api/submissions-view";
import type { SubmissionRow } from "@/lib/api/types";

function row(
  over: Partial<SubmissionRow> & { patch_hash: string }
): SubmissionRow {
  return {
    id: over.patch_hash,
    campaign_id: "c1",
    hotkey: "5Fake",
    committed_at: "2026-09-08T00:00:00+00:00",
    latest_state: "scored",
    round: null,
    ...over,
  };
}

const ROWS: SubmissionRow[] = [
  row({ patch_hash: "b", committed_at: "2026-09-08T12:00:00+00:00" }),
  row({ patch_hash: "a", committed_at: "2026-09-09T12:00:00+00:00" }),
  row({ patch_hash: "c", committed_at: "2026-09-07T12:00:00+00:00" }),
];

const BASE = {
  page: 1,
  size: DEFAULT_PAGE_SIZE,
  sort: DEFAULT_SUBMISSION_SORT,
  outcome: ALL_OUTCOMES,
} as const;

describe("parseSubmissionSort", () => {
  it("falls back to newest for anything unknown", () => {
    expect(parseSubmissionSort("oldest")).toBe("oldest");
    expect(parseSubmissionSort("newest")).toBe("newest");
    expect(parseSubmissionSort("score")).toBe("newest");
    expect(parseSubmissionSort(undefined)).toBe("newest");
  });
});

describe("parsePageSize", () => {
  it("accepts only the offered sizes", () => {
    expect(parsePageSize("25")).toBe(25);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("10")).toBe(10);
  });

  it("falls back for anything else, including a plausible one", () => {
    // 100 is not offered; honouring it would page differently from the control.
    expect(parsePageSize("100")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("0")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("-10")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("ten")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("buildSubmissionsView sorting", () => {
  it("puts the newest commit first by default", () => {
    const view = buildSubmissionsView(ROWS, BASE);
    expect(view.rows.map((r) => r.patch_hash)).toEqual(["a", "b", "c"]);
  });

  it("reverses for oldest", () => {
    const view = buildSubmissionsView(ROWS, { ...BASE, sort: "oldest" });
    expect(view.rows.map((r) => r.patch_hash)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [...ROWS];
    buildSubmissionsView(input, { ...BASE, sort: "oldest" });
    expect(input.map((r) => r.patch_hash)).toEqual(["b", "a", "c"]);
  });

  it("breaks ties on patch hash so paging is stable", () => {
    const same = [
      row({ patch_hash: "z", committed_at: "2026-09-08T00:00:00+00:00" }),
      row({ patch_hash: "y", committed_at: "2026-09-08T00:00:00+00:00" }),
    ];
    expect(
      buildSubmissionsView(same, BASE).rows.map((r) => r.patch_hash)
    ).toEqual(["y", "z"]);
  });

  it("sorts an unparseable timestamp last rather than to the top", () => {
    const withBad = [...ROWS, row({ patch_hash: "bad", committed_at: "soon" })];
    const view = buildSubmissionsView(withBad, BASE);
    expect(view.rows.at(-1)?.patch_hash).toBe("bad");
  });
});

describe("buildSubmissionsView paging", () => {
  const many = Array.from({ length: 24 }, (_unused, i) =>
    row({
      patch_hash: `p${String(i).padStart(2, "0")}`,
      committed_at: `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00+00:00`,
    })
  );

  it("slices the requested page at the requested size", () => {
    const view = buildSubmissionsView(many, { ...BASE, page: 2, size: 10 });
    expect(view.rows).toHaveLength(10);
    expect(view.offset).toBe(10);
    expect(view.totalPages).toBe(3);
  });

  it("clamps a page past the end instead of showing nothing", () => {
    const view = buildSubmissionsView(many, { ...BASE, page: 99, size: 25 });
    expect(view.page).toBe(1);
    expect(view.rows).toHaveLength(24);
  });

  it("keeps one page for an empty set so the pager has something to say", () => {
    const view = buildSubmissionsView([], BASE);
    expect(view.total).toBe(0);
    expect(view.totalPages).toBe(1);
    expect(view.rows).toEqual([]);
  });
});

describe("buildSubmissionsView outcomes", () => {
  const mixed = [
    row({ patch_hash: "s1", latest_state: "scored" }),
    row({ patch_hash: "s2", latest_state: "scored" }),
    row({ patch_hash: "d1", latest_state: "disqualified" }),
  ];

  it("counts every outcome in the unfiltered set, commonest first", () => {
    const view = buildSubmissionsView(mixed, BASE);
    expect(view.outcomes).toEqual([
      { value: "scored", count: 2 },
      { value: "disqualified", count: 1 },
    ]);
  });

  it("filters to one outcome and counts only those", () => {
    const view = buildSubmissionsView(mixed, {
      ...BASE,
      outcome: "disqualified",
    });
    expect(view.rows.map((r) => r.patch_hash)).toEqual(["d1"]);
    expect(view.total).toBe(1);
  });

  it("still reports every outcome while one is filtered, so the bar holds", () => {
    const view = buildSubmissionsView(mixed, {
      ...BASE,
      outcome: "disqualified",
    });
    expect(view.outcomes.map((o) => o.value)).toEqual([
      "scored",
      "disqualified",
    ]);
  });

  it("shows an empty table for an outcome nothing matches", () => {
    const view = buildSubmissionsView(mixed, { ...BASE, outcome: "nope" });
    expect(view.rows).toEqual([]);
    expect(view.total).toBe(0);
  });

  it("clamps the page when a filter shrinks the list under you", () => {
    // Page 3 of everything is page 1 of one outcome; stranding the reader on
    // an empty page would read as "no results".
    const view = buildSubmissionsView(mixed, {
      ...BASE,
      outcome: "scored",
      page: 3,
      size: 10,
    });
    expect(view.page).toBe(1);
    expect(view.rows).toHaveLength(2);
  });
});

describe("parseSearch", () => {
  it("trims and keeps what was typed", () => {
    expect(parseSearch("  5Fake ")).toBe("5Fake");
    expect(parseSearch(undefined)).toBe("");
    expect(parseSearch("   ")).toBe("");
  });

  it("bounds a pasted wall of text", () => {
    expect(parseSearch("x".repeat(500))).toHaveLength(128);
  });
});

describe("buildSubmissionsView search", () => {
  const people = [
    row({ patch_hash: "sha256:aaa", hotkey: "5MinerAlice" }),
    row({ patch_hash: "sha256:bbb", hotkey: "5MinerBob" }),
    row({ patch_hash: "sha256:ccc", hotkey: "5Carol" }),
  ];

  it("matches a miner hotkey anywhere, case-insensitively", () => {
    const view = buildSubmissionsView(people, { ...BASE, search: "bob" });
    expect(view.rows.map((r) => r.hotkey)).toEqual(["5MinerBob"]);
  });

  it("narrows to several miners on a shared prefix", () => {
    const view = buildSubmissionsView(people, { ...BASE, search: "5Miner" });
    expect(view.total).toBe(2);
  });

  it("matches a patch hash, which is how one submission gets quoted", () => {
    const view = buildSubmissionsView(people, { ...BASE, search: "ccc" });
    expect(view.rows.map((r) => r.hotkey)).toEqual(["5Carol"]);
  });

  it("finds a hash pasted with its sha256 prefix", () => {
    const view = buildSubmissionsView(people, {
      ...BASE,
      search: "sha256:bbb",
    });
    expect(view.rows.map((r) => r.hotkey)).toEqual(["5MinerBob"]);
  });

  it("combines with an outcome filter rather than replacing it", () => {
    const mixed = [
      row({ patch_hash: "p1", hotkey: "5Ann", latest_state: "scored" }),
      row({ patch_hash: "p2", hotkey: "5Ann", latest_state: "rejected" }),
      row({ patch_hash: "p3", hotkey: "5Bob", latest_state: "scored" }),
    ];
    const view = buildSubmissionsView(mixed, {
      ...BASE,
      search: "5Ann",
      outcome: "scored",
    });
    expect(view.rows.map((r) => r.patch_hash)).toEqual(["p1"]);
  });

  it("reports nothing found rather than falling back to everything", () => {
    const view = buildSubmissionsView(people, { ...BASE, search: "nobody" });
    expect(view.rows).toEqual([]);
    expect(view.total).toBe(0);
  });

  it("keeps every outcome in the picker while a search narrows the rows", () => {
    // The picker is built from the unfiltered set, so searching must not make
    // outcomes disappear from it and strand the reader.
    const mixed = [
      row({ patch_hash: "p1", hotkey: "5Ann", latest_state: "scored" }),
      row({ patch_hash: "p2", hotkey: "5Bob", latest_state: "rejected" }),
    ];
    const view = buildSubmissionsView(mixed, { ...BASE, search: "5Ann" });
    expect(view.outcomes.map((o) => o.value).sort()).toEqual([
      "rejected",
      "scored",
    ]);
  });

  it("marks the view filtered so the page can offer a way out", () => {
    expect(buildSubmissionsView(people, BASE).filtered).toBe(false);
    expect(
      buildSubmissionsView(people, { ...BASE, search: "a" }).filtered
    ).toBe(true);
    expect(
      buildSubmissionsView(people, { ...BASE, outcome: "scored" }).filtered
    ).toBe(true);
  });
});
