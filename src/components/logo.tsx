import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-v5.png"
        alt=""
        width={28}
        height={28}
        priority
        className="h-7 w-7 rounded-[6px]"
      />
      <span className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
        Pareton
      </span>
    </span>
  );
}
