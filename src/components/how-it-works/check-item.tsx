import type { ReactNode } from "react";

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-accent text-accent">
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 5.5 4 8 8.5 2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <span className="text-body text-secondary">{children}</span>
    </li>
  );
}
