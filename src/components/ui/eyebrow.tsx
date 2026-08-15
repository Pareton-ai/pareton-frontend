import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const eyebrowVariants = cva("font-mono uppercase tracking-caps", {
  variants: {
    size: {
      body: "text-body",
      caption: "text-caption",
    },
    tone: {
      muted: "text-muted",
      secondary: "text-secondary",
      accent: "text-accent",
      foreground: "text-foreground",
      rust: "text-rust",
    },
  },
  defaultVariants: {
    size: "body",
    tone: "muted",
  },
});

export type EyebrowProps = ComponentProps<"p"> &
  VariantProps<typeof eyebrowVariants>;

/** Mono uppercase label used for nav, section eyebrows, and status chrome. */
export function Eyebrow({ className, size, tone, ...props }: EyebrowProps) {
  return (
    <p className={cn(eyebrowVariants({ size, tone }), className)} {...props} />
  );
}

export { eyebrowVariants };
