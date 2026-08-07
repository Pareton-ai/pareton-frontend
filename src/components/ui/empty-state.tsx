import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/eyebrow";

type EmptyStateProps = {
  title: string;
  message: string;
  tone?: "muted" | "rust";
  children?: ReactNode;
  className?: string;
};

/** Bordered empty / error shell shared by dashboard pages. */
export function EmptyState({
  title,
  message,
  tone = "muted",
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("border border-border px-6 py-14 text-center", className)}
    >
      <Eyebrow size="sm" tone={tone}>
        {title}
      </Eyebrow>
      <p className="mx-auto mt-4 max-w-md text-body-lg leading-relaxed text-secondary">
        {message}
      </p>
      {children ? (
        <div className="mt-8 flex items-center justify-center gap-6">
          {children}
        </div>
      ) : null}
    </div>
  );
}
