import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const monoLinkVariants = cva(
  "font-mono text-body uppercase tracking-caps transition-colors hover:text-foreground",
  {
    variants: {
      tone: {
        muted: "text-muted",
        accent: "text-accent",
        foreground: "text-foreground",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  }
);

export type MonoLinkProps = VariantProps<typeof monoLinkVariants>;

export function monoLinkClassName(
  variants?: MonoLinkProps,
  className?: string
) {
  return cn(monoLinkVariants(variants), className);
}

export { monoLinkVariants };
