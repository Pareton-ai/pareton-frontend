import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/eyebrow";

type SectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  className?: string;
  titleClassName?: string;
};

/** Accent eyebrow + display title used on landing sections. */
export function SectionHeader({
  eyebrow,
  title,
  className,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <div className={className}>
      <Eyebrow tone="accent">{eyebrow}</Eyebrow>
      <h2
        className={cn(
          "display-serif mt-4 max-w-xl text-display-section leading-display text-foreground",
          titleClassName
        )}
      >
        {title}
      </h2>
    </div>
  );
}
