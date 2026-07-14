type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`text-[16px] font-semibold tracking-[-0.02em] text-foreground ${className}`}
    >
      Pareton
    </span>
  );
}
