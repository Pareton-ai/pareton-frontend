"use client";

const icons = {
  cube: "M8 1.75 14 5.25v5.5L8 14.25 2 10.75v-5.5L8 1.75ZM2 5.25 8 8.75l6-3.5M8 8.75v5.5",
  layers:
    "M8 1.75 14 4.75 8 7.75 2 4.75 8 1.75ZM2 7.75 8 10.75l6-3M2 10.5 8 13.5l6-3",
  activity: "M1.5 8h2.5l1.5-4.5 3 9 2-6 1 1.5h3",
  chip: "M5 5h6v6H5V5ZM7.25 7.25h1.5v1.5h-1.5v-1.5ZM6 1.5V5M10 1.5V5M6 11v3.5M10 11v3.5M1.5 6H5M1.5 10H5M11 6h3.5M11 10h3.5",
  shield:
    "M8 1.5 13.5 3.5v4c0 3.6-2.4 5.9-5.5 7-3.1-1.1-5.5-3.4-5.5-7v-4L8 1.5ZM5.75 7.75 7.25 9.25l3-3.5",
  target:
    "M13.5 8a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7.2v1.6M7.2 8h1.6",
  server: "M2.5 2.5h11v4h-11v-4ZM2.5 9.5h11v4h-11v-4ZM4.75 4.1v.8M4.75 11.1v.8",
  merge:
    "M6 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM4 14V6a6 6 0 0 0 6 6",
  x: "M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5",
  trophy:
    "M5 2h6v4.5a3 3 0 0 1-6 0V2ZM5 3.25H3.25a1.75 1.75 0 0 0 1.75 2.5M11 3.25h1.75a1.75 1.75 0 0 1-1.75 2.5M8 9.5V12M6.5 12v2M9.5 12v2M5.5 14h5",
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className={className}
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}

export function ArrowDown({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="26"
      viewBox="0 0 12 26"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 1v19M1.5 15.5 6 20l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function RepeatIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96M13.8 1.4v3.1h-3.1"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}
