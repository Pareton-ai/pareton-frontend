import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 rounded-[5px]"
      />
      <span className="hidden text-[16px] font-semibold tracking-[-0.02em] text-foreground sm:inline">
        Pareton
      </span>
    </span>
  );
}
