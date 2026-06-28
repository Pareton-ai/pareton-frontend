type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`font-display text-[17px] font-medium tracking-[-0.02em] text-foreground ${className}`}
    >
      Pareton
    </span>
  );
}
