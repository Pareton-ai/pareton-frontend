import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Pareton"
        width={512}
        height={512}
        priority
        className="h-8 w-8 rounded-[5px] sm:hidden"
      />
      <Image
        src="/logo-text.png"
        alt="Pareton"
        width={2784}
        height={750}
        priority
        className="hidden h-8 w-auto sm:block"
      />
    </span>
  );
}
