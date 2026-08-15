import { createCn } from "cnfast";

/**
 * `cn` with our type scale registered as font sizes.
 *
 * tailwind-merge resolves conflicts by class-name prefix, and our scale
 * (`text-body`, `text-title`, …) is indistinguishable from a text colour
 * (`text-muted`) by name alone. Unconfigured, it files them under one group and
 * drops the size whenever both reach the same call — so `cn("text-body
 * text-foreground")` silently returned colour only, and the element fell back
 * to an inherited 16px. Listing the scale under `font-size` keeps the two
 * independent.
 *
 * Every token in `--text-*` (globals.css) belongs here; adding a step to the
 * scale means adding it to this list.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        "text-caption",
        "text-body",
        "text-body-lg",
        "text-title",
        "text-display-section",
      ],
    },
  },
});
