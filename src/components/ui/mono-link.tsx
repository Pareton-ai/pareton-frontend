import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const monoLinkVariants = cva(
  "font-mono uppercase tracking-caps transition-colors hover:text-foreground",
  {
    variants: {
      size: {
        body: "text-body",
        sm: "text-body-sm",
      },
      tone: {
        muted: "text-muted",
        accent: "text-accent",
        foreground: "text-foreground",
      },
    },
    defaultVariants: {
      size: "body",
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
